import {signInUser} from "./cognito";

import fetch from 'node-fetch';
import {users} from "./fixtures"

export const testURL = process.env.TEST_URL || 'http://localhost:3000/dev/'

// For testing purposes, this wil generate a JWT with the user's info from our database
// To avoid having to actually use cognito for unit tests we COULD have the server
// do something like "if (process.env.OFFLINE && jwt.indexOf('testingjwt_') == 0" to verify jwt ¯\_(ツ)_/¯
// TODO: Maybe just replace this with actual Cognito JWTs
export async function getUserFakeJWT (userId: string | null) {
  return new Promise((res) => {
    if (userId === null) {
      res('')
      return
    }
    setTimeout(() => {

      // const user = getUserFromDb(userId)
      // jwt = jwtPackage.encrypt(user)
      res('testingjwt_' +  userId)
    }, 25)
  })
}

export async function request (url: string, opts: any = {}) {
  opts.headers = opts.headers || {}

  // If this is provided by our test, we will attempt to log in as this user first
  // and use their jwt in the request
  if (opts.userKey) {
    const user = users[opts.userKey]
    if (!user) {
       throw new Error(`Could not find tes user with key '${opts.userKey}' in our fixture file`)
    }
    const jwt = await signInUser(user.username, user.password)
    opts.headers.Authorization = 'JWT ' + jwt
  }

  // Authomatically convert objects our tests pass into JSON
  if (opts.body) {
    if (typeof opts.body == 'object' || Array.isArray(opts.body)) {
      opts.body = JSON.stringify(opts.body)
      opts.headers['Content-Type'] = 'application/json'
    }
  }

  // This just makes it so you don't have to worry about "Do I prefix a slash? Or no?"
  if (url.indexOf('/') === 0) {
    url = url.substr(1)
  }

  return fetch(testURL + url, opts)
}

export async function getJSON (url: string, opts : any = {}) {
  const res = await request(url, opts)
  const json = await res.json()
  return json
}

export async function testResStatus (res: any, status : number) : Promise<string | null> {
  let pass = res.status === status
  if (!pass) {
    let body
    try {
      body = await res.json()
    } catch (ex) {
      body = `Error getting result JSON ${ex.toString()}`
    }
    return `Expected ${status} got ${res.status}. Body ${JSON.stringify(body)}`
  }
  return null
}

export type AccessTest = {
  path?: string
  userKey: string | null
  expectedStatus: number
  method?: string
}

export async function testPathAccess (path: string, tests: AccessTest[], defaults?: object) : Promise<string | null> {
  for (let i = 0; i < tests.length; i++) {
    const test = {
      ...defaults,
      ...tests[i]
    }
    test.path = path
    const opts : any = {
      method: test.method || 'GET'
    }
    if (test.userKey) {
      opts.headers = {
        userKey: test.userKey
      }
    }
    const res = await request(test.path, opts)
    const err = await testResStatus(res, test.expectedStatus)
    if (err) {
      return `[${i}] Failed with user ${test.userKey}: ${err}`
    }
  }

  return null
}

