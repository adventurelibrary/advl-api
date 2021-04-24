import test from 'ava';

import {get, getJSON, testResStatus} from "./lib";

test('assets: get assets', async (t) => {
	const body = await getJSON('assets')
	t.is(body.assets.length, 10)
	t.is(body.total, 29)
	t.pass()
})

test('assets: get assets by tag', async (t) => {
	const body = await getJSON('assets?tags=Archer')
	t.is(body.assets.length, 6)
	t.is(body.total, 6)
	t.pass()
})

test('assets: get with pagination', async (t) => {
	const body = await getJSON('assets?size=1&from=1')
	t.is(body.assets.length, 1)
	t.is(body.total, 29)
	t.pass()
})

test('assets: get with tag that doesnt exist', async (t) => {
	const res = await get('assets?tags=Spaghetti')
	let err = await testResStatus(res, 500)
	if (err) {
		t.fail(err)
		return
	}
	t.pass()
})

test('assets: get assets by two tags', async (t) => {
	const body = await getJSON('assets?tags=Barbarian,Archer')
	t.is(body.assets.length, 2)
	t.is(body.total, 2)
	t.pass()
})

// TODO: get asset by id
// TODO: get asset by ids
// TODO: search for assets with text
// TODO: get assets by category
