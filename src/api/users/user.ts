import { APIGatewayProxyHandler } from 'aws-lambda';
import { errorResponse, newResponse } from '../common/response';
import {getUserByToken} from '../../lib/user';
import { User, UserNotFoundError } from '../../interfaces/IUser';
import { dyn } from '../common/database';
import { search } from '../common/elastic';

export const user: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();

  try{
    const user: User|UserNotFoundError = await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
    if(user['error']){
      //create new user
      const newUser:User = {
        id: user['token'].sub,
        username: user['token'].username,
        isCreator: false,
        joinDate: Date.now().toString()
      }

      await dyn.put({
        TableName: process.env.NAME_USERSDB,
        Item: newUser
      }).promise()

      await search.index({
        index: process.env.INDEX_USERDB,
        id: newUser.id,
        body: newUser
      })
      response.statusCode = 201;
      response.body = JSON.stringify(newUser);
      return response;
    } else {
      response.statusCode = 200;
      response.body = JSON.stringify(user)
      return response;
    }
  } catch (E){
    return errorResponse(_evt, E);
  }
}