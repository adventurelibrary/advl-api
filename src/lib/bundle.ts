import * as db from '../api/common/postgres';
import { Bundle } from '../interfaces/IBundle';

export async function getBundleInfo(bundle_id:string): Promise<Bundle>{
  return <Bundle> await db.getObj(process.env.DB_BUNDLE_INFO, bundle_id);
}