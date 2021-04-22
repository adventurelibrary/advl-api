import { APIGatewayProxyHandler } from 'aws-lambda';
import { newResponse } from '../common/response';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import {User} from '../../interfaces/IUser';
import { dyn } from '../common/database';
//import fs from 'fs';

export const user: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();

  try{
    let username = validateUserToken(_evt.headers['Auth']);
    let user = await getUser(username);
    if(user == undefined){
      //Create New User

      //Create in Dyn && Elastic Search
    } 
    response.statusCode = 200;
    response.body = JSON.stringify(user)
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

// Note : You can get jwk from https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json 
//const jwks = JSON.parse(fs.readFileSync("src/api/users/us-east-1_029QsJhTM.json").toString())
const jwks = require('./us-east-1_029QsJhTM.json').keys[1]
export function validateUserToken(userToken:string){
  try{
    const result = jwt.verify(userToken, jwkToPem(jwks))
    return result['username'];
  } catch (e){
    throw e;
  }
}

export async function getUser(username:string):Promise<User>{
  try{

    //replace with ES get instead of DYN get?
    let user = await dyn.get({
      TableName: process.env.NAME_USERDB,
      Key: {
        name: username
      }
    }).promise()

    if(user.Item == null || user.Item == undefined){
      return undefined
    } else {
      return <User>user.Item
    }
  } catch (e){
    throw e;
  }
}