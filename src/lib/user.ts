import * as db from '../api/common/postgres';
import { User, UserToken } from '../interfaces/IUser';

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { Creator } from '../interfaces/ICreator';

export async function getUserByID(_sub: string): Promise<User> {
  try{ 
    const user = <User> await db.getObj(process.env.DB_CREATORS, _sub);
    return user;
  } catch (e){
    return undefined; 
  }
}

export async function getUserByToken(jwt: string): Promise<User>{ 
  const userToken = validateUserToken(jwt);
  return await getUserByID(userToken.sub);
}

export async function updateUser(user:User, updates:any){
  await db.updateObj(process.env.DB_USERS, user.id, updates);
}

export async function updateCreator(creator:Creator, updates:any){
  await db.updateObj(process.env.DB_CREATORS, creator.id, updates)
}

// Note : You can get jwk from https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json 
//const jwks = JSON.parse(fs.readFileSync("src/api/users/us-east-1_029QsJhTM.json").toString())
const jwks = require('./us-east-1_029QsJhTM.json').keys[0]
export function validateUserToken(userToken:string){
  try{
    return <UserToken>jwt.verify(userToken, jwkToPem(jwks))
  } catch (e){
    throw e;
  }
}

export async function getCreatorByID(creatorID: string){
  try {
    const creator = <Creator> await db.getObj(process.env.DB_CREATORS, creatorID);
    return creator;
  } catch(e){
    return undefined;
  }
}

/**
 * Checks Admin DB to see if this user ID is an admin
 * @param userID 
 * @returns 
 */
export async function isAdmin(userID: string){
  //TODO replace with Aurora lookup
  if(userID){return true;}
}