const fetch = require('node-fetch')

const testURL = process.env.TEST_URL || 'http://localhost:3000/v1/'

// For testing purposes, this wil generate a JWT with the user's info from our database
// To avoid having to actually use cognito for unit tests we COULD have the server
// do something like "if (process.env.OFFLINE && jwt.indexOf('testingjwt_') == 0" to verify jwt ¯\_(ツ)_/¯
export async function getUserJWT (userId: string | null) {
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

export async function request (url: string, opts: any = {})  {
	opts.headers = opts.headers || {}

	// Authomatically convert objects our tests pass into JSON
	if (opts.body) {
		if (typeof opts.body == 'object') {
			opts.body = JSON.stringify(opts.body)
			opts.headers['Content-Type'] = 'application/json'
		}
	}
	return fetch(testURL + url, opts)
}

export async function requestAs (url: string, userId: string | null, opts : any = {})  {
	const jwt = await getUserJWT(userId)
	opts.headers = opts.headers || {}
	opts.headers['Authorization'] = 'JWT ' + jwt
	return request(url, opts)
}

export async function getJSON (url: string) {
	const res = await request(url)
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
	if (!pass) {
		const body = await res.json()
		return `Expected ${status} got ${res.status}. Body ${JSON.stringify(body)}`
	}
	return null
}

export type AccessTest = {
	path?: string
	userId: string | null
	expectedStatus: number
}

export async function testPathAccess (path: string, tests: AccessTest[]) : Promise<string | null> {
	for (let i = 0; i < tests.length; i++) {
		const test = tests[i]
		test.path = path
		const res = await requestAs(test.path, test.userId)
		const err = await testResStatus(res, test.expectedStatus)
		if (err) {
			return `[${i}] Failed with user ${test.userId}: ${err}`
		}
	}

	return null
}
