import * as db from '../api/common/postgres';
import { Bundle } from '../interfaces/IBundle';
import {bulkIndex, clearIndex} from "../api/common/elastic";

export async function getBundleInfo(bundle_id:string): Promise<Bundle>{
  const results = <Bundle[]>await db.query(`
    SELECT b.*, c.name as creator_name, u.username
    FROM bundleinfo b
    LEFT JOIN creators c
    ON c.id = b.creator_id
    LEFT JOIN users u
    ON u.id = b.user_id
    WHERE b.id = ?
  `, [bundle_id])
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
