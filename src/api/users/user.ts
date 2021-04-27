import { APIGatewayProxyHandler } from 'aws-lambda';
import { errorResponse, newResponse } from '../common/response';
import {getUserByToken} from '../../lib/user';
import { User, UserNotFoundError } from '../../interfaces/IUser';
import { dyn } from '../common/database';
import { search } from '../common/elastic';

/**
 * Creates a new user if it doesn't exist, returns the user if it does.
 */
export const user: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();

  try{
    const user: User|UserNotFoundError = await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
    if(user['error']){
      //create new user
      const newUser:User = {
        id: user['token'].sub,
        username: user['token'].username,
        email: user['token'].email,
        type: "USER",
        notification_preferences: {},
        last_seen: Date.now().toString(),
        joinDate: Date.now().toString()
      }

      await dyn.put({
        TableName: process.env.NAME_USERSDB,
        Item: newUser
      }).promise()

      await search.index({
        index: process.env.INDEX_USERSDB,
        id: newUser.id,
        body: newUser
      })
      response.statusCode = 201;
      response.body = JSON.stringify(newUser);
      return response;
    } else {
      response.statusCode = 200;
      await updateUser(<User>user, {last_seen: Date.now().toString()})
      response.body = JSON.stringify(user)
      return response;
    }
  } catch (E){
    return errorResponse(_evt, E);
  }
}

/**
 * POST
 * 
 */

async function updateUser(user:User, updates:any){
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