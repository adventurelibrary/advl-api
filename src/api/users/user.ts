import { APIGatewayProxyHandler } from 'aws-lambda';
import { errorResponse, newResponse } from '../common/response';
import {getUserByToken, updateUser, validateUserToken} from '../../lib/user';
import { User } from '../../interfaces/IUser';
import * as db from '../common/postgres';

/**
 * Creates a new user if it doesn't exist, returns the user if it does.
 * GET - returns user if auth token is correct
 * PUT - updates user
 */
export const user: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();

  try{
    const user: User = await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
    if(_evt.httpMethod == "GET"){
      if(user == undefined){
        let userToken = validateUserToken(_evt.headers.Authorization.split(" ")[1]);
        //create new user
        const newUser:User = {
          id: userToken.sub,
          username: userToken.username,
          email: userToken.email,
          notification_preferences: {},
          last_seen: new Date().toISOString(),
          join_date: new Date().toISOString()
        }

        await db.insertObj(process.env.DB_USERS, newUser);

        response.statusCode = 201;
        response.body = JSON.stringify(newUser);
        return response;
      } else {
        response.statusCode = 200;
        await updateUser(<User>user, {last_seen: new Date().toISOString()})
        response.body = JSON.stringify(user)
        return response;
      }  
    } else if (_evt.httpMethod == "PUT") {
      await updateUser(<User>user, JSON.parse(_evt.body))
    }
  } catch (E){
    return errorResponse(_evt, E);
  }
}