import test from 'ava';

import {getJSON, request, testResStatus} from "./lib/lib";

test.skip('searchassets: get assets', async (t) => {
	const body = await getJSON('assets')
	t.is(body.assets.length, 10)
	t.is(body.total, 29)
	t.pass()
})

test.skip('searchassets: get assets by tag', async (t) => {
	const body = await getJSON('assets?tags=Archer')
	t.is(body.assets.length, 6)
	t.is(body.total, 6)
	t.pass()
})

test.skip('searchassets: get with pagination', async (t) => {
	const body = await getJSON('assets?size=1&from=1')
	t.is(body.assets.length, 1)
	t.is(body.total, 29)
	t.pass()
})

test.skip('searchassets: get with tag that doesnt exist', async (t) => {
	const res = await request('assets?tags=Spaghetti')
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
		return
	}
	t.pass()
})

test.skip('searchassets: get assets by two tags', async (t) => {
	const body = await getJSON('assets?tags=Barbarian,Archer')
	t.is(body.assets.length, 2)
	t.is(body.total, 2)
	t.pass()
})

test.skip('searchassets: get asset by id', async (t) => {
	const body = await getJSON('assets?id=6L13wQqQbRfkVHkbPirNKQP0rQWTafRq')
	t.is(body.id, '6L13wQqQbRfkVHkbPirNKQP0rQWTafRq')
	t.pass()
})

test.skip('searchassets: get assets by ids', async (t) => {
	const body = await getJSON('assets?ids=6L13wQqQbRfkVHkbPirNKQP0rQWTafRq,FILCEmPky8w3JOpH9kT9vPMulzAmaX3h')
	t.is(body[0].id, '6L13wQqQbRfkVHkbPirNKQP0rQWTafRq')
	t.is(body[1].id, 'FILCEmPky8w3JOpH9kT9vPMulzAmaX3h')
	t.pass()
})

// TODO: search for assets with text
// TODO: get assets by category
