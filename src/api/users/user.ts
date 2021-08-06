import {validateUserToken} from '../../lib/user';
import { Entity, User } from '../../interfaces/IEntity';
import * as db from '../common/postgres';
import {newHandler} from "../common/handlers";
import {getEntityNumCoins} from "../../lib/coins";

/**
 * Creates a new user if it doesn't exist, returns the user if it does.
 * GET - returns user if auth token is correct
 * PUT - updates user
 */

export const user_get = newHandler({
  includeUser: true
}, async ({user, event}) => {
  // Not logged in, but they have an Auth header
  if (!user && event.headers.Authorization) {
    let userToken;
    try {
      userToken = validateUserToken(event.headers.Authorization.split(' ')[1]);
    } catch (ex) {
      console.log('Could not verify JWT', ex)
      return {
        status: 204
      }
    }
    const newUser:User = {
      id: userToken.sub,
      is_admin: false,
      username: userToken['cognito:username'],
      email: userToken.email || userToken.username + '@thisemailisfake.com',
      notification_preferences: {},
      last_seen: new Date(),
      join_date: new Date()
    }

    const newEntity:Entity = {
      id: newUser.id,
      type: "USER"
    }

    await db.insertObj(process.env.DB_ENTITIES, newEntity);
    await db.insertObj(process.env.DB_USERS, newUser);
    newUser.num_coins = 0
    return {
      status: 201,
      body: newUser
    }
  } else if (user) {
    await db.updateObj(process.env.DB_USERS, user.id, {last_seen: new Date()});
  }

  const numCoins = await getEntityNumCoins(user.id)
  user.num_coins = numCoins

  return {
    status: 200,
    body: user
  }
})

export const user_put = newHandler({
  requireUser: true
}, async ({user, json}) => {
  await db.updateObj(process.env.DB_USERS, user.id, {
    ...json,
    last_seen: new Date()
  })
  return {
    status: 204,
  }
})
