import * as db from '../api/common/postgres';
import {User, UserToken} from '../interfaces/IEntity';

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

export async function getUserByID(id: string): Promise<User> {
  try{
    const _sql = `
    SELECT u.*, EXISTS(SELECT creator_id FROM ${process.env.DB_CREATORMEMBERS} WHERE user_id = u.id LIMIT 1) as is_creator
    FROM ${process.env.DB_USERS} u
    WHERE u.id = $1
    `
    const user = <User>(await db.query(_sql, [id], false))[0];
    console.log("USER: ", user)
    return user;
  } catch (e){
    return undefined;
  }
}

export async function getUserByToken(jwt: string): Promise<User | undefined>{
  const userToken = validateUserToken(jwt);
  if (!userToken) {
    return undefined
  }
  const res = await getUserByID(userToken.sub);
  return res
}

// Note : You can get jwk from https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
//const jwks = JSON.parse(fs.readFileSync("src/api/users/us-east-1_029QsJhTM.json").toString())
//key 0 is for IdTokens and key 1 is for Access Tokens
const jwks = require(`./${process.env.STAGE}.json`).keys[0]
export function validateUserToken(userToken:string){
  if (!userToken) {
    throw new Error(`Provided user token was blank`)
  }
  //const decoded = jwt.decode(userToken)
  //console.log('WARNING! Not verifying the JWT, just decoding it. Verifying was not working')
  //return <UserToken>decoded
  try{
    let token = <UserToken>jwt.verify(userToken, jwkToPem(jwks));
    return token;
  } catch (e){
    console.log('error trying to verify')
    throw e;
  }
}

/**
 * Checks provided user object to make sure they're an admin
 * @param user : User
 * @returns boolean
 */
export function isAdmin(user: User) : boolean {
  return user.is_admin
}
