const test = require('ava')
const testURL = 'http://localhost:3000/v1/'
const fetch = require('node-fetch')

async function assertStatus (res, status) {
	let msg = ''
	let pass = res.status === status
	if (!pass) {
		const body = await res.json()
		msg =	`Expected 200 got ${res.status}. Body ${JSON.stringify(body)}`
	}
	return {
		pass,
		msg
	}
}

async function get (url)  {
	return fetch(testURL + url)
}

test('get assets', async (t) => {
	const res = await get('assets')
	const body = await res.json()
	t.is(body.assets.length, 10)
	t.is(body.total, 15)
})

test('get assets by tag', async (t) => {
	const res = await get('assets?tags=Archer')
	const body = await res.json()
	t.is(body.assets.length, 3)
	t.is(body.total, 3)
})

test('get assets by two tags', async (t) => {
	const res = await get('assets?tags=Barbarian,Archer')
	const tested = await assertStatus(res, 200)
	if (!tested.pass) {
		t.fail(tested.msg)
	}
	const body = await res.json()
	console.log('body', body)
})
