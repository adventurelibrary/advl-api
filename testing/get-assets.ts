import test from 'ava';

import {get, getJSON, testResStatus} from "./lib";


test('get assets', async (t) => {
	const body = await getJSON('assets')
	t.is(body.assets.length, 10)
	t.is(body.total, 15)
	t.pass()
})

test('get assets by tag', async (t) => {
	const body = await getJSON('assets?tags=Archer')
	t.is(body.assets.length, 3)
	t.is(body.total, 3)
	t.pass()
})

test('get with tag that doesnt exist', async (t) => {
	const res = await get('assets?tags=Spaghetti')
	let err = await testResStatus(res, 500)
	if (err) {
		t.fail(err)
		return
	}
	t.pass()
})

test('get assets by two tags', async (t) => {
	const body = await getJSON('assets?tags=Barbarian,Archer')
	t.is(body.assets.length, 1)
	t.is(body.total, 1)
	t.pass()
})
