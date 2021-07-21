import { Bundle } from '../interfaces/IBundle';
import {bulkIndex, clearIndex, search} from "../api/common/elastic";
import {User} from "../interfaces/IEntity";
import * as db from "../api/common/postgres";
import * as b2 from "../api/common/backblaze"
import {query} from "../api/common/postgres";
import { isMemberOfCreatorPage } from './creator';

/**
 * POSTGRES get by id
 * @param bundle_id
 */
export async function getBundleByID(bundle_id:string) : Promise<Bundle> {
  return <Bundle>(await queryBundles(bundle_id))[0]
}

export async function deleteBundle(id: string) {
  //delete from Postgres
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id = $1`, [id])
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_INFO} WHERE id = $1`, [id])
  //delete from Elastic
  await search.delete({
    index: process.env.INDEX_BUNDLEINFO,
    id: id
  })
}

export function userCanViewBundle(user: User | undefined, bundle: Bundle) : boolean {
  if (bundle.public) {
    return true
  }
  if (!user) {
    return false
  }
  if(user.id === bundle.creator_id){
    return true;
  }

  //check if the bundle creator is a page the user is a part of
  if(isMemberOfCreatorPage(bundle.creator_id, user.id)){
    return true;
  }
}

export async function indexBundle (id: string) {
  const bundle = await getBundleByID(id)
  const body = getBundlePublicBody(bundle)
  return await search.index({
    index: process.env.INDEX_BUNDLEINFO,
    id: id,
    body: body
  })
}

/**
 * Returns a transformed version of the bundle body for public purposes
 * @param bundle
 * @returns
 */
function getBundlePublicBody(data:any) : Bundle{
  const bundle = <Bundle>data
  // If the query found an asset and its creator, then we can build a thumbnail for this bundle
  if (bundle.cover_asset_id && bundle.cover_creator_id) {
    bundle.cover_thumbnail = b2.GetURL('thumbnail', {
      original_file_ext: bundle.cover_original_file_ext,
      id: bundle.cover_asset_id,
      creator_id: bundle.cover_creator_id
    });
  } else {
    bundle.cover_thumbnail = ''
  }
  return bundle
}

export async function reindexBundles(bundles: Bundle[]) {
  await clearIndex(process.env.INDEX_BUNDLEINFO)
  return indexBundles(bundles)
}

// This bulk update is based on the example here:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
export async function indexBundles (bundles: Bundle[]) {
  return bulkIndex(process.env.INDEX_BUNDLEINFO, bundles, getBundlePublicBody)
}

export async function resetBundles () {
  const bundles = await queryBundles()
  await reindexBundles(bundles)
}

export async function queryBundles(id?: string) : Promise<Bundle[]> {
  let sql = `
    SELECT b.*, c.name as creator_name, u.username, cover.id as cover_asset_id, cover.creator_id as cover_creator_id, original_file_ext as cover_original_file_ext
    FROM bundleinfo b
    /* This fetches one and only one asset that is linked to this bundle */
    LEFT JOIN LATERAL (
      SELECT a.id, a.creator_id, a.original_file_ext
      FROM assets a
      JOIN bundleassets ba
      ON ba.asset_id = a.id
      WHERE ba.id = b.id 
      LIMIT 1
    ) cover
    ON 1=1
    LEFT JOIN creators c
    ON c.id = b.creator_id
    LEFT JOIN users u
    ON u.id = b.user_id`

  const params = []

  if (id) {
    sql += `
    WHERE b.id = $1
    `
    params.push(id)
  }

  let objects = await query(sql, params, false)
  objects = objects.map(getBundlePublicBody)
  return objects
}
