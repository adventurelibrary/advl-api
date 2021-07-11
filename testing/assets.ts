import test from 'ava'
import '../load-yaml-env'
import {AccessTest, getJSON, request, testPathAccess, testResStatus} from "./lib/lib";
import {ASSET_1, ASSET_3, CREATOR_2} from "./lib/fixtures";
import {updateAssetSearchById} from "../src/lib/assets";
import {Asset} from "../src/interfaces/IAsset";
import {idgen} from "../src/api/common/nanoid";
import slugify from "slugify";
import * as db from "../src/api/common/postgres";

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

test.serial('asset:delete an asset with no purchases', async (t) => {
	// Create a new asset
	const id = idgen()
	const name = 'Map To Be Deleted'
	let newAsset: Asset = {
		id: id,
		category: 'map',
		creator_id: CREATOR_2,
		deleted: false,
		description: 'This map s about to be deleted',
		filetype: "IMAGE",
		name: name,
		original_file_ext: 'UNKNOWN',
		revenue_share: {},
		size_in_bytes: 0,
		slug: slugify(name).toLowerCase(),
		tags: [],
		unlock_count: 0,
		unlock_price: 0,
		uploaded: new Date(),
		visibility: "PUBLIC",
	}
	await db.insertObj(process.env.DB_ASSETS, newAsset);
	await updateAssetSearchById(id)

	// Double check that this new asset appears in the search

	const body = await getJSON('assets?id=' + id)
	t.is(body.id, id)

	// Delete it
	let res = await request('assets/' + id + '/delete', {
		method: 'POST',
		userKey: 'CREATOR1' // This user has access to the creator who made this
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}

	// Shouldn't be in the search anymore
	res = await request('assets?id=' + id)
	err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}

	// Shouldn't be accessible directly anymore
	res = await request('assets/' + id)
	err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

test('asset:delete path access', async (t) => {
	const path = 'assets/' + ASSET_1 + '/delete'
	let tests : AccessTest[] = [{
		// A user without access to this asset's creator
		userKey: 'USER1',
		expectedStatus: 403,
	}, {
		// Not logged in
		userKey: null,
		expectedStatus: 403,
	}]
	let err = await testPathAccess(path, tests, {
		method: 'POST'
	})
	if (err != null) {
		t.fail(err)
	}
	t.pass()
})
