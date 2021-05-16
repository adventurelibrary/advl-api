import {updateUser, validateUserToken} from '../../lib/user';
import { User } from '../../interfaces/IUser';
import * as db from '../common/postgres';
import {newHandler} from "../common/handlers";

/**
 * Creates a new user if it doesn't exist, returns the user if it does.
 * GET - returns user if auth token is correct
 * PUT - updates user
 */

export const user_get = newHandler({
  includeUser: true
}, async ({user, event}) => {
  console.log('user in user_get from handler factory', user)
  // Not logged in, but they have an Auth header
  if (!user && event.headers.Authorization) {
    let userToken
    try {
      userToken = validateUserToken(event.headers.Authorization.split(' ')[1]);
    } catch (ex) {
      console.log('Could not verify JWT', ex)
      return {
        status: 204
      }
    }
    console.log('no find user with it', userToken.sub)
    const newUser:User = {
      id: userToken.sub,
      username: userToken['username'],
      email: userToken.email || userToken.username + '@thisemailisfake.com',
      notification_preferences: {},
      is_admin: false,
      last_seen: new Date(),
      join_date: new Date()
    }

    await db.insertObj(process.env.DB_USERS, newUser);
    return {
      status: 201,
      body: newUser
    }
  } else if (user) {
    // TODO: updateUserLastSeen()
    await updateUser(user, {last_seen: new Date()})
  }
  return {
    status: 200,
    body: user
  }
})

export const user_put = newHandler({
  requireUser: true
}, async ({user, json}) => {
  await updateUser(user, {
    ...json,
    last_seen: new Date()
  })
  return {
    status: 204,
  }
})
