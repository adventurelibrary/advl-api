import {validateUserToken} from '../../lib/user';
import { Entity, User } from '../../interfaces/IEntity';
import * as db from '../common/postgres';
import {newHandler, HandlerContext, HandlerResult} from "../common/handlers";
import {getEntityNumCoins} from "../../lib/coins";
import {getUserEmailExists, getUsernameExists, getRegisterValidate} from '../../lib/user'
import {getEventQueryFromAndSize} from "../../lib/asset-search";
import {CoinPurchase, getUserCompletePurchases, getUserTotalCompletePurchases} from "../../lib/purchases";
import {LIMIT_MD} from "../../constants/constants";
import {getUserCreators} from "../../lib/creator";

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
    const numCoins = await getEntityNumCoins(user.id)
    user.num_coins = numCoins

    if (user.is_creator) {
      user.creators = await getUserCreators(user)
    } else {
      user.creators = []
    }

  }

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

/*
  Returns "true": string, in return data, if email already registered to user in db.
*/
export const email_exists = newHandler({
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
    let passedEmail = ctx['event']['pathParameters']['email']
    let emailExists = await getUserEmailExists(passedEmail)
  return {
    status: 200,
    body: emailExists.toString()
  }
})

/*
  Returns "true": string, in return data, if email already registered to user in db.
*/
export const name_exists = newHandler({
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
    let passedUsername = ctx['event']['pathParameters']['username']
    let userameExists = await getUsernameExists(passedUsername)
  return {
    status: 200,
    body: userameExists.toString()
  }
})

/*
  returns integer counts of instances of the passed email and username already existsing in the db for registered users
  returns: stringified JSON{emailcount, usernamecount}
*/
export const register_validate = newHandler({
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
    let passedEmail = ctx['event']['pathParameters']['email']
    let passedUsername = ctx['event']['pathParameters']['username']
    let resCount = await getRegisterValidate(passedEmail, passedUsername)    
  return {
    status: 200,
    body: JSON.stringify(resCount)
  }
})

export const user_my_purchases = newHandler({
  requireUser: true,
}, async ({user, event}) => {
  const {from, size} = getEventQueryFromAndSize(event.queryStringParameters, LIMIT_MD)
  const total = await getUserTotalCompletePurchases(user.id)
  let results : CoinPurchase[] = []
  if (total >= from) {
    results = await getUserCompletePurchases(user.id, from, size)
  }
  return {
    status: 200,
    body: {
      total: total,
      results: results
    }
  }
})
