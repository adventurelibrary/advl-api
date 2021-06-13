import { Bundle } from '../interfaces/IBundle';
import {bulkIndex, clearIndex, search} from "../api/common/elastic";
import {getObjects, GetObjectsOpts} from "../api/common/postgres";
import {User} from "../interfaces/IUser";
import * as db from "../api/common/postgres";
import * as b2 from "../api/common/backblaze";

export type QueryBundleOpts = GetObjectsOpts & {
  bundle_id?: string
  name?: string
}

export function mapBundleRow (data: any) : Bundle {
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

export async function queryBundles(opts: QueryBundleOpts = {}) : Promise<Bundle[]> {
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

  const where : string [] = []
  const params : Record<string, any> = {}
  if (opts.bundle_id) {
    where.push('b.id = :bundle_id')
    params.bundle_id = opts.bundle_id
  }

  if (opts.name) {
    where.push('b.name = :name')
    params.name = opts.name
  }

  if (where.length) {
    sql += ` WHERE ` + where.join(' AND ')
  }

  opts.params = params
  let objects = await getObjects<Bundle>(sql, opts)
  objects = objects.map(mapBundleRow)
  return objects
}

export async function getBundleInfo(bundle_id:string): Promise<Bundle>{
  const results = await queryBundles({
    bundle_id: bundle_id,
    limit: 1,
  })
  return results[0]
}

export async function getBundleByName(name:string): Promise<Bundle>{
  const results = await queryBundles({
    name: name,
    limit: 1,
  })
  return results[0]
}

export async function indexBundle (id: string) {
  const bundle = await getBundleInfo(id)
  await search.index({
    index: process.env.INDEX_BUNDLEINFO,
    id: id,
    body: getBundleSearchBody(bundle)
  })
}

export async function reindexBundles(bundles: Bundle[]) {
  await clearIndex(process.env.INDEX_BUNDLEINFO)
  return indexBundles(bundles)
}

// This bulk update is based on the example here:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
export async function indexBundles (bundles: Bundle[]) {
  return bulkIndex(process.env.INDEX_BUNDLEINFO, bundles, getBundleSearchBody)
}

// Converts data we have on a bundle from our db into an object we want to
// send to ElasticSearch. This allows us to hide certain fields, or modify fields
function getBundleSearchBody (bundle: Bundle) : any {
  const copy = {
    ...bundle
  }
  // I'm commenting this out since I'm not sure if we want to build this value and then save it
  // or build it after receiving the data from EC
  // delete copy.cover_thumbnail
  return copy
}

export async function resetBundles () {
  const bundles = await queryBundles()
  await reindexBundles(bundles)
}

export async function deleteBundle(id: string) {
  //delete from Postgres
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id = ?`, [id])
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_INFO} WHERE id = ?`, [id])
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

  return user.id === bundle.user_id
}
