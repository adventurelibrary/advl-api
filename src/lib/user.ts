import { search } from "../api/common/elastic";
import { User, UserToken, UserNotFoundError } from '../interfaces/IUser';

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

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

/*
export async function getUserByName(_name: string): Promise<User> {

}
*/

export async function getUserByToken(jwt: string): Promise<User | UserNotFoundError>{ 
  const userToken = validateUserToken(jwt);
  const user = await getUserByID(userToken.sub);
  if(user){
    return user;
  } else {
    return {
      error: "User not found",
      token: userToken
    }
  }
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
