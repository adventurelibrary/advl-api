const fetch = require('node-fetch')
import {testURL} from "../tests/constants";

export async function get (url: string)  {
	return fetch(testURL + url)
}

export async function getJSON (url: string) {
	const res = await get(url)
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
