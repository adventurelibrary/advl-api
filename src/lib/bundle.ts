import { Bundle } from '../interfaces/IBundle';
import { search } from "../api/common/elastic";
import {User} from "../interfaces/IUser";
import * as db from "../api/common/postgres";

/**
 * POSTGRES get by id
 * @param bundle_id 
 */
export async function getBundleByID(bundle_id:string) : Promise<Bundle> {
  let _sql = `
    SELECT b.*, c.name as creator_name, u.username
    FROM ${process.env.DB_BUNDLE_INFO} b
    LEFT JOIN ${process.env.DB_CREATORS} c
    ON c.id = b.creator_id
    LEFT JOIN ${process.env.DB_USERS} u
    ON u.id = b.user_id
    WHERE id = $1
  `
  return <Bundle>(await db.query(_sql, [bundle_id],false))[0]
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

export async function indexBundle (id: string) {
  const bundle = await getBundleByID(id)
  await search.index({
    index: process.env.INDEX_BUNDLEINFO,
    id: id,
    body: getBundlePublicBody(bundle)
  })
}

/**
 * Returns a transformed version of the bundle body for public purposes
 * @param bundle 
 * @returns 
 */
function getBundlePublicBody(bundle:Bundle){
  return bundle
}