import { dyn } from '../api/common/database';
import { search } from "../api/common/elastic";
import { User, UserToken } from '../interfaces/IUser';

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import { Creator } from '../interfaces/ICreator';

export async function getUserByID(_sub: string): Promise<User> {
  try{ 
    const user = await search.get({
      index: process.env.INDEX_USERDB,
      id: _sub
    });
    return <User>user.body._source;
  } catch (e){
    return undefined; 
  }
}

export async function getUserByToken(jwt: string): Promise<User>{ 
  const userToken = validateUserToken(jwt);
  return await getUserByID(userToken.sub);
}

export async function updateUser(user:User, updates:any){
  user.email = updates.email ? updates.email : user.email;
  user.type = updates.type ? updates.type : user.type;
  user.notification_preferences = updates.notification_preferences ? updates.notification_preferences : user.notification_preferences;
  user.last_seen = updates.last_seen ? updates.last_seen : user.last_seen;

  console.log("Updated User: ", user);
  await dyn.update({
    TableName: process.env.NAME_USERSDB,
    Key: {
      id: user.id
    },
    UpdateExpression: "set email = :user_email, type = :user_type, notification_preferences = :np, last_seen = :ls",
    ExpressionAttributeValues: {
      ":user_email": user.email,
      ":user_type": user.type,
      ":np": user.notification_preferences,
      ":ls": user.last_seen
    }
  }).promise();

  await search.update({
    index:process.env.INDEX_USERSDB,
    id: user.id,
    body: {
      doc: user
    }
  });
}

export async function updateCreator(creator:Creator, updates:any){
  creator.description = updates.description ? updates.description : creator.description;

  await search.update({
    index: process.env.INDEX_CREATORSDB,
    id: creator.id,
    body: {
      doc: creator
    }
  })

  return creator;
}

// Note : You can get jwk from https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json 
//const jwks = JSON.parse(fs.readFileSync("src/api/users/us-east-1_029QsJhTM.json").toString())
const jwks = require('./us-east-1_029QsJhTM.json').keys[1]
export function validateUserToken(userToken:string){
  try{
    return <UserToken>jwt.verify(userToken, jwkToPem(jwks))
  } catch (e){
    throw e;
  }
}

export async function getCreatorByID(creatorID: string){
  try {
    const creator = await search.get({
      index: process.env.INDEX_CREATORSDB,
      id: creatorID
    });
    return <Creator>creator.body._source;
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