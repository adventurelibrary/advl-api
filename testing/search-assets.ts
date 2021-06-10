import test from 'ava';

import {getJSON, request, testResStatus} from "./lib/lib";

test('searchassets: get assets', async (t) => {
	const body = await getJSON('assets')
	t.is(body.assets.length, 4)
	t.is(body.total, 4)
	t.pass()
})

test('searchassets: get my assets', async (t) => {
	// User with no assets because they don't belong to any creators
	let body = await getJSON('assets?mine', {
		userKey: 'TEST1'
	})
	t.is(body.assets.length, 0)
	t.is(body.total, 0)

	body = await getJSON('assets?mine', {
		userKey: 'CREATOR1'
	})
	t.is(body.assets.length, 2)
	t.is(body.total, 2)
	t.is(body.assets[0].name, 'House')
	t.is(body.assets[1].name, 'First Kill')


	body = await getJSON('assets?mine&visibility=all', {
		userKey: 'CREATOR1'
	})
	t.is(body.assets.length, 4)
	t.is(body.total, 4)
	t.is(body.assets[0].name, 'House')
	t.is(body.assets[1].name, 'First Kill')
	t.is(body.assets[2].name, 'Killion')
	t.is(body.assets[3].name, 'Hope Keyshot')
	t.pass()
	return
})

test('searchassets: get assets by tag', async (t) => {
	const body = await getJSON('assets?tags=Barbarian')
	t.is(body.assets.length, 2)
	t.is(body.total, 2)
	t.pass()
})

test('searchassets: get with pagination', async (t) => {
	const body = await getJSON('assets?size=1&from=1')
	t.is(body.assets.length, 1)
	t.is(body.total, 4)
	t.pass()
})

test('searchassets: get with tag that doesnt exist', async (t) => {
	const res = await request('assets?tags=Spaghetti')
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
		return
	}
	t.pass()
})

test('searchassets: get assets by two tags', async (t) => {
	const body = await getJSON('assets?tags=Barbarian,House')
	t.is(body.assets.length, 1)
	t.is(body.total, 1)
	t.pass()
})

test('searchassets: get asset by id', async (t) => {
	const body = await getJSON('assets?id=spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body.id, 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.pass()
})

test('searchassets: get assets by ids', async (t) => {
	const body = await getJSON('assets?ids=spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw,caiQ4wQRlXFiOtMrCO2D86gX1odpqeuj')
	t.is(body[0].id, 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body[1].id, 'caiQ4wQRlXFiOtMrCO2D86gX1odpqeuj')
	t.pass()
})

// TODO: search for assets with text
// TODO: get assets by category
