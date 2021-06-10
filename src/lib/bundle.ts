import { Bundle } from '../interfaces/IBundle';
import {bulkIndex, clearIndex, search} from "../api/common/elastic";
import {getObjects, GetObjectsOpts} from "../api/common/postgres";
import {User} from "../interfaces/IUser";
import * as db from "../api/common/postgres";

export type QueryBundleOpts = GetObjectsOpts & {
  bundle_id?: string
  name?: string
}
export async function queryBundles(opts: QueryBundleOpts = {}) : Promise<Bundle[]> {
  let sql = `
    SELECT b.*, c.name as creator_name, u.username
    FROM bundleinfo b
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
  return getObjects<Bundle>(sql, opts)
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

export async function reindexBundles(bundles: Bundle[]) {
  await clearIndex(process.env.INDEX_BUNDLEINFO)
  return indexBundles(bundles)
}

// This bulk update is based on the example here:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
export async function indexBundles (bundles: Bundle[]) {
  return bulkIndex(process.env.INDEX_BUNDLEINFO, bundles)
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
