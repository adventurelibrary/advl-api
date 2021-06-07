import * as db from '../api/common/postgres';
import { Bundle } from '../interfaces/IBundle';

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
