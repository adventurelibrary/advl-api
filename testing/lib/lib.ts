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

export async function requestAs (url: string, userId: string | null, opts : any = {})  {
  const jwt = await getUserFakeJWT(userId)
  opts.headers = opts.headers || {}
  opts.headers['Authorization'] = 'JWT ' + jwt
  return request(url, opts)
}

export async function getJSON (url: string, opts : any = {}) {
  const res = await request(url, opts)
  const json = await res.json()
  return json
}

export async function getJSONAs (url: string, userId: string) {
  const res = await requestAs(url, userId)
  const json = await res.json()
  return json
}

export async function testResStatus (res: any, status : number) : Promise<string | null> {
  let pass = res.status === status
	let append = ''
  if (!pass) {
  	// If it returns these statuses it won't have JSON so there's nothing to parse
		if (res.status !== 204 && res.status !== 302) {
	    let body
			try {
				body = await res.json()
			} catch (ex) {
				body = `Error getting result JSON ${ex.toString()}`
			}
			append = ` Body ${JSON.stringify(body)}`
		}
    return `Expected ${status} got ${res.status}.` + append
  }
  return null
}

export type AccessTest = {
  path?: string
  userId: string | null
  expectedStatus: number
  method?: string
}

export async function testPathAccess (path: string, tests: AccessTest[]) : Promise<string | null> {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    test.path = path
    const opts = {
      method: test.method || 'GET'
    }
    const res = await requestAs(test.path, test.userId, opts)
    const err = await testResStatus(res, test.expectedStatus)
    if (err) {
      return `[${i}] Failed with user ${test.userId}: ${err}`
    }
  }

  return null
}


export const objHasValues = (data, valuesToMatch) => {
  const keys = Object.keys(valuesToMatch);
  const dataKeys = Object.keys(data);
  let notEquals = [];
  let invalidKeys = [];

  keys.filter((key) => {
    if (!dataKeys.includes(key)) {
      invalidKeys.push(key);
      return
    }
    // For some comparisons we can't just do a === comparison, because we need to be fancier
    // or have a little leeway
    // For example if we want to compare dates from a query with dates from code, we might be okay
    // with the being within 100ms of each other
    // In that case, we can provide a function to objHasValues which will check the value, instead
    // of a direct value to compare
    if (dataKeys.includes(key) && typeof valuesToMatch[key] === 'function') {
      const msg = valuesToMatch[key](data[key])
      if (msg) {
        notEquals.push(msg)
      }
    } else if (dataKeys.includes(key) && data[key] !== valuesToMatch[key]) {
      notEquals.push(`"${key}" has inferred value: ${valuesToMatch[key]}. Got actual value: ${data[key]}`);
    }
  })

  if (invalidKeys.length) {
    return `Data does not contain the following keys: ${invalidKeys.toString()}`;
  }
  if (!notEquals.length) {
    return;
  }

  return notEquals.toString().replace(',', '\n');
}
