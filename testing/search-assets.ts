import test from 'ava';

import {getJSON, request, testResStatus} from "./lib/lib";

test('searchassets: get assets', async (t) => {
	let body = await getJSON('assets')
	t.is(body.assets.length, 4)
	t.is(body.total, 4)

	body = await getJSON('assets', {
		userKey: 'TEST1'
	})
	t.is(body.assets[0].unlocked, true)
	t.is(body.assets[1].unlocked, false)
	t.is(body.assets[2].unlocked, false)
	t.is(body.assets[3].unlocked, false)
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
	t.is(body.assets[0].name, 'Hope Keyshot')
	t.is(body.assets[1].name, 'House')
	t.is(body.assets[2].name, 'Killion')
	t.is(body.assets[3].name, 'First Kill')
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
	t.is(body.unlocked, false)

	const res = await request('assets?id=CTgHDPNAjeRpdPYg89WeDYwqa5pXcEC2')
	const err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}


	t.pass()
})

test('searchassets: get assets by ids', async (t) => {
	const body = await getJSON('assets?ids=spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw,caiQ4wQRlXFiOtMrCO2D86gX1odpqeuj')
	t.is(body[0].id, 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body[1].id, 'caiQ4wQRlXFiOtMrCO2D86gX1odpqeuj')
	t.pass()
})


test('searchassets: get unlocked asset by id', async (t) => {
	let body = await getJSON('assets?id=B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx', {
		userKey: 'TEST1'
	})
	t.is(body.id, 'B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx')
	t.is(body.unlocked, true)

	body = await getJSON('assets?id=B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx', {
		userKey: 'ADMIN1'
	})
	t.is(body.id, 'B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx')
	t.is(body.unlocked, false)

	t.pass()
})


// TODO: search for assets with text
// TODO: get assets by category
