import test from 'ava'
import {request, testResStatus} from "./lib/lib";
import {ASSET_1, ASSET_3} from "./lib/fixtures";

test('asset: get asset with wrong id', async (t) => {
	const res = await request(`asset/id-does-not-exit`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset: get asset directly', async (t) => {
	const res = await request(`assets/${ASSET_1}`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	t.is(json.id, ASSET_1)
	t.is(json.name, 'Asset Tester')
	t.is(json.visibility, 'PUBLIC')
	t.is(json.filetype, 'IMAGE')
	t.is(json.unlock_price, 50)
	t.pass()
})

// TODO: Perform this test for assets with different visibilities as well
test.skip('asset: get an asset download link', async (t) => {
	const res = await request(`assets/${ASSET_1}/download`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	t.true(json.link.indexOf('http') === 0, 'Link should begin with http')
	t.pass()
})

test('asset: get an asset download link with wrong id', async (t) => {
	const res = await request(`assets/43263264363/download`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test.serial('asset:put update an asset as admin', async (t) => {
	let res = await request(`assets/${ASSET_1}`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	const asset = json
	t.is(asset.id, ASSET_1)

	// This update doesn't actually change anything
	res = await request(`assets/update`, {
		userKey: 'ADMIN1',
		method: 'PUT',
		body: [asset]
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	// This cleans up the data
	res = await request(`assets/update`, {
		userKey: 'ADMIN1',
		method: 'PUT',
		body: [asset]
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	t.pass()
})


test.serial('asset:put update an asset as creator', async (t) => {
	let res = await request(`assets/${ASSET_3}`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	let json = await res.json()
	const asset = json
	t.is(asset.id, ASSET_3)

	res = await request(`assets/update`, {
		userKey: 'CREATOR1',
		method: 'PUT',
		body: [{
			...asset,
			name: 'New Name'
		}]
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	// Confirm name has changed
	res = await request(`assets/${ASSET_3}`)
	json = await res.json()
	t.is(json.name, 'New Name')


	// This cleans up the data
	res = await request(`assets/update`, {
		userKey: 'CREATOR1',
		method: 'PUT',
		body: [asset]
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	t.pass()
})


test.serial('asset:put update an asset as regular user', async (t) => {
	let res = await request(`assets/update`, {
		userKey: 'TEST1',
		method: 'PUT',
		body: [{
			id: ASSET_3,
			name: 'New Name'
		}]
	})
	let err = await testResStatus(res, 403)
	if (err) {
		t.fail(err)
	}

	t.pass()
})
