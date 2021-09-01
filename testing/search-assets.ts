import test from 'ava';

import {getJSON, request, testResStatus} from "./lib/lib";
import {ASSET_1, ASSET_2, ASSET_4} from "./lib/fixtures";

test('searchassets: get assets', async (t) => {
	let body = await getJSON('assets')
	t.is(body.assets.length, 4)
	t.is(body.total, 4)

	body = await getJSON('assets', {
		userKey: 'TEST1'
	})
	t.is(body.assets[0].id, 'B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx')
	t.is(body.assets[1].id, 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body.assets[1].creator_slug, 'carlos-cara-alvarez')
	t.is(body.assets[0].unlocked, true)
	t.is(body.assets[1].unlocked, true)
	t.is(body.assets[2].unlocked, false)
	t.is(body.assets[3].unlocked, false)
	t.pass()
})

test('searchassets: get assets by creator slug', async (t) => {
	let body = await getJSON('assets?creator_slugs=carlos-cara-alvarez')
	t.is(body.assets.length, 1)
	t.is(body.total, 1)

	t.is(body.assets[0].id, 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body.assets[0].creator_slug, 'carlos-cara-alvarez')

	//advl
	body = await getJSON('assets?creator_slugs=advl')
	t.is(body.assets.length, 1)
	t.is(body.total, 1)

	t.is(body.assets[0].id, ASSET_1)
	t.is(body.assets[0].creator_slug, 'advl')


	// Both
	body = await getJSON('assets?creator_slugs=carlos-cara-alvarez,advl')
	t.is(body.assets.length, 2)
	t.is(body.total, 2)

	t.is(body.assets[0].creator_slug, 'carlos-cara-alvarez')
	t.is(body.assets[1].creator_slug, 'advl')


	t.pass()
})

test('searchassets: unlocked assets not logged in', async (t) => {
	// Route requires you to be logged in
	const res = await request('assets/unlocked')
	const err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}
	t.pass()
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
	const body = await getJSON('assets/spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body.id, 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw')
	t.is(body.unlocked, false)

	// This asset is hidden
	const res = await request('assets/CTgHDPNAjeRpdPYg89WeDYwqa5pXcEC2')
	const err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}


	t.pass()
})


test('searchassets: get unlocked asset by id', async (t) => {
	let body = await getJSON('assets/B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx', {
		userKey: 'TEST1'
	})
	t.is(body.id, 'B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx')
	t.is(body.unlocked, true)

	body = await getJSON('assets/B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx', {
		userKey: 'ADMIN1'
	})
	t.is(body.id, 'B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx')
	t.is(body.unlocked, false)

	t.pass()
})

test('searchassets:my unlocked assets', async (t) => {
	let body = await getJSON('assets/unlocked', {
		userKey: 'TEST1'
	})
	t.is(body.total, 2)
	t.is(body.assets[0].id, ASSET_4)
	t.is(body.assets[1].id, ASSET_2)

	body = await getJSON('assets/unlocked', {
		userKey: 'CREATOR1'
	})
	t.is(body.total, 0)

	t.pass()
})

test('searchassets: get asset by text', async (t) => {
	const body = await getJSON('assets?text=house')
	t.is(body.total, 1)
	t.is(body.assets.length, 1)
	t.is(body.assets[0].name, 'House')
	t.pass()
})

// TODO: Test for user with many assets unlocked. Pagination as well
// TODO: get assets by category
// TODO: search for assets with text
