import * as db from '../api/common/postgres';
import { User, UserToken } from '../interfaces/IUser';

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { Admin } from '../interfaces/IAdmin';

export async function getUserByID(_sub: string): Promise<User> {
  try{
    const user = <User> await db.getObj(process.env.DB_USERS, _sub);
    return user;
  } catch (e){
    return undefined;
  }
}

export async function getUsers () : Promise<User[]> {
  const users = <User[]> await db.getObjects('users',{
    limit: 500,
    skip: 0,
    orderBy: 'username ASC'
  })
  return users
}

export async function getUserByToken(jwt: string): Promise<User | undefined>{
  const userToken = validateUserToken(jwt);
  if (!userToken) {
    return undefined
  }
  return await getUserByID(userToken.sub);
}

export async function updateUser(user:User, updates:any){
  await db.updateObj(process.env.DB_USERS, user.id, updates);
}

// Note : You can get jwk from https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
//const jwks = JSON.parse(fs.readFileSync("src/api/users/us-east-1_029QsJhTM.json").toString())
//key 0 is for IdTokens and key 1 is for Access Tokens
const jwks = require('./us-east-1_029QsJhTM.json').keys[0]
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
 * Checks Admin DB to see if this user ID is an admin
 * @param userID
 * @returns
 */
export async function isAdmin(userID: string){
  const admin = <Admin> await db.getObj(process.env.DB_ADMIN, userID);
  if(!admin){return false;}
  return true;
}
