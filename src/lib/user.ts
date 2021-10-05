import * as db from '../api/common/postgres';
import {User, UserToken} from '../interfaces/IEntity';

import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

if (!process.env.STAGE) {
  throw new Error(`env variable STAGE is not set. Three possible reasons
  1. You forgot o include the load-yaml-env.ts file at the top of a file
  2. You didn't provide "--stage dev" to your serverless command"
  3. You need set the env variable before running a command line script, such as npm run reset
    3a. Windows: set STAGE=dev&&npm run reset
    3b. Linux:   STAGE=dev npm run reset`)
}

export async function getUserByID(id: string): Promise<User> {
  try{
    const _sql = `
    SELECT u.*, EXISTS(SELECT creator_id FROM ${process.env.DB_CREATORMEMBERS} WHERE user_id = u.id LIMIT 1) as is_creator
    FROM ${process.env.DB_USERS} u
    WHERE u.id = $1
    `
    const user = <User>(await db.query(_sql, [id]))[0];
    console.log("USER: ", user)
    return user;
  } catch (e){
    return undefined;
  }
}

export async function getUserByToken(jwt: string): Promise<User | undefined>{
  const userToken = validateUserToken(jwt);
  if (!userToken) {
    return undefined
  }
  const res = await getUserByID(userToken.sub);
  return res
}

// Note : You can get jwk from https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
//const jwks = JSON.parse(fs.readFileSync("src/api/users/us-east-1_029QsJhTM.json").toString())
//key 0 is for IdTokens and key 1 is for Access Tokens
const jwks = require(`./${process.env.STAGE}.json`).keys[0]
export function validateUserToken(userToken:string){
  if (!userToken) {
    throw new Error(`Provided user token was blank`)
  }
  //const decoded = jwt.decode(userToken)
  //console.log('WARNING! Not verifying the JWT, just decoding it. Verifying was not working')
  //return <UserToken>decoded
  try{
    let token = <UserToken>jwt.verify(userToken, jwkToPem(jwks));
    return token;
  } catch (e){
    console.log('error trying to verify')
    throw e;
  }
}

/**
 * Checks provided user object to make sure they're an admin
 * @param user : User
 * @returns boolean
 */
export function isAdmin(user: User) : boolean {
  return user.is_admin
}

// returns true if passed email already exists in the db for a registered user
export async function getUserEmailExists (email: string) : Promise<boolean> {
  let emailExists = false

  const res = await db.query(`SELECT u.email FROM users AS u WHERE email = $1`, [email])
  try {
    if (res[0].email)
      emailExists = true
  }
  catch(e) {
    // if no result found do nothing
  }

	return emailExists
}


// returns true if passed username already exists in the db for a registered user
export async function getUsernameExists (username: string) : Promise<boolean> {
  let usernameExists = false

  const res = await db.query(`SELECT u.username FROM users AS u WHERE username = $1`, [username])
  try {
    if (res[0].username)
    usernameExists = true
  }
  catch(e) {
    // if no result found do nothing
  }

	return usernameExists
}

// returns integer counts of instances of the passed email and username already existsing in the db for registered users
// returns: JSON{emailcount, usernamecount}
export async function getRegisterValidate (email: string, username: string) : Promise<JSON> {  
  // clean params
  email.trim()
  username.trim()

  /* query structure:
    SELECT
    (SELECT count(*) AS emailcount FROM users AS u WHERE email ILIKE 'vindexus+admin@gmail.com'),
    (SELECT count(*) AS usernamecount FROM users AS u WHERE username ILIKE 'test-user-01')
  */  
  let q1 = `SELECT count(*) AS emailcount FROM users AS u WHERE email ILIKE '${email}'`
  let q2 = `SELECT count(*) AS usernamecount FROM users AS u WHERE username ILIKE '${username}'`
  let query = `SELECT (${q1}),(${q2})`

  const res = await db.query(query)
  let JSONreturn : JSON 
  try {
    JSONreturn = res[0]
  }
  catch (e) {
    console.log('Error occured while verifying account detail availability.')
  }

	return JSONreturn
}