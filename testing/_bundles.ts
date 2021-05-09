import test from 'ava';

import {AccessTest, getJSONAs, requestAs, testPathAccess, testResStatus} from "./lib/lib";
import {ASSET_1, ASSET_2, ASSET_3, ASSET_4, BUNDLE_PRIVATE, BUNDLE_PUBLIC, USER_1, USER_2, USER_ADMIN} from './lib/fixtures'

// Note: we use .serial because ava by default runs tests concurrently
// this might cause issues where one test updates data while another test reads it from the same source
// All non-serial tests are run concurrently AFTER all the serial tests are run
// Because of this I make all the read-only tests non-serial

test.serial('bundles: create a new bundle', async (t) => {
	const createOpts = {
		method: 'POST',
		body: {
			bundle: {
				name: 'My Cool Bundle',
				public: true,
				description: 'It is cool and public'
			}
		}
	}

	let res = await requestAs('bundles', null, createOpts)
	let err = await testResStatus(res, 401) // You need to be logged in to do that
	if (err) {
		t.fail(err)
	}

	res = await requestAs('bundles', USER_2, createOpts)
	err = await testResStatus(res, 201) // Should send back a created status code
	if (err) {
		t.fail(err)
	}

	// Get the ID of the new item from the response
	const id = res.data.id
	if (!id) {
		t.fail(`The id sent back from the create is blank`)
	}

	// TODO: Confirm the bundle was created, and fields were saved properly
	/*
	const bundle = getBundle(id)
	t.is(bundle.name, createOpts.body.bundle.name)
	t.is(bundle.description, createOpts.body.bundle.description)
	t.is(bundle.public, createOpts.body.bundle.public)
	t.is(bundle.userId, USER_2) // Confirm it is created by the logged in user
	*/


	// TODO: Clean
	//destroyBundle(id)

	t.pass()
})

test.serial('bundles: update bundle', async (t) => {
	const path = 'bundle/' + BUNDLE_PUBLIC
	// Test that non-owner and anonymous users can't edit other people's bundles
	let tests : AccessTest[] = [{
		userId: USER_2,
		expectedStatus: 401,
		method: 'PUT'
	}, {
		userId: null,
		expectedStatus: 401,
		method: 'PUT'
	}, {
		userId: USER_ADMIN,
		expectedStatus: 400, // An admin rshould get past the 401, but with no body they should get bad request
		method: ''
	}]
	let err = await testPathAccess(path, tests)
	if (err != null) {
		t.fail(err)
	}

	// TODO: Load the bundle in before doing the test, so that we can save it
	// after the tests to clean up and reset our test data
	// const bundle = getBundle(BUNDLE_PUBLIC)

	const updates = {
		name: 'New Bundle Name',
		description: 'New Name',
		public: false,
	}
	const res = await requestAs(path, USER_1, {
		method: 'PUT',
		body: {
			bundle: updates
		}
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	const json = await getJSONAs(path, USER_1)
	t.is(json.bundle.name, updates.name)
	t.is(json.bundle.description, updates.description)
	t.is(json.bundle.public, updates.public)
	t.is(json.assets.length, 2) // Number of assets should not change

	// TODO: Clean up
	// saveBundle(bundle.id, bundle)
	t.pass()
})

test.serial('bundles: add assets', async (t) => {
	const path = 'bundle/' + BUNDLE_PUBLIC + '/add'
	// Test that non-owner and anonymous users can't edit other people's bundles
	// TODO: Maybe change method to PUT?
	let tests : AccessTest[] = [{
		userId: USER_2,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: null,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: USER_ADMIN,
		expectedStatus: 400, // An admin rshould get past the 401, but with no body they should get bad request
		method: 'POST'
	}]
	let err = await testPathAccess(path, tests)
	if (err != null) {
		t.fail(err)
	}

	const newAssetIds = [ASSET_3, ASSET_4]

	const res = await requestAs(path, USER_1, {
		method: 'POST',
		body: {
			assetIds: newAssetIds
		}
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	const json = await getJSONAs('bundles/' + BUNDLE_PUBLIC, USER_1)
	t.is(json.assets.length, 4) // Assuming it already had 2, and we added 2
	t.is(json.assets[3].id, ASSET_4) // Last one was appended

	// TODO: Clean up
	// removeAssetsFromBundle(BUNDLE_PUBLIC, newAssetIds)
	t.pass()
})

test.serial('bundles: remove assets', async (t) => {
	const path = 'bundle/' + BUNDLE_PUBLIC + '/remove'
	// Test that non-owner and anonymous users can't edit other people's bundles
	let tests : AccessTest[] = [{
		userId: USER_2,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: null,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: USER_ADMIN,
		expectedStatus: 400, // An admin rshould get past the 401, but with no body they should get bad request
		method: 'POST'
	}]
	let err = await testPathAccess(path, tests)
	if (err != null) {
		t.fail(err)
	}

	const newAssetIds = [ASSET_1]

	const res = await requestAs(path, USER_1, {
		method: 'POST',
		body: {
			assetIds: newAssetIds
		}
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	const json = await getJSONAs('bundles/' + BUNDLE_PUBLIC, USER_1)
	t.is(json.assets.length, 1) // Assuming it already had 2
	t.is(json.assets[0].id, ASSET_2)

	// TODO: Clean up and make sure to reset it to rank 1 (first in list)
	// updateBundleAsset(BUNDLE_PUBLIC, ASSET_1, 1)
	t.pass()
})

test.serial('bundles: reorder assets', async (t) => {
	const path = 'bundle/' + BUNDLE_PUBLIC + '/sort'
	// Test that non-owner and anonymous users can't edit other people's bundles
	let tests : AccessTest[] = [{
		userId: USER_2,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: null,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: USER_ADMIN,
		expectedStatus: 400, // An admin rshould get past the 401, but with no body they should get bad request
		method: 'POST'
	}]
	let err = await testPathAccess(path, tests)
	if (err != null) {
		t.fail(err)
	}

	const res = await requestAs(path, USER_1, {
		method: 'POST',
		body: {
			updates: [{
				assetId: ASSET_2,
				rank: 1
			}, {
				assetId: ASSET_1,
				rank: 2
			}]
		}
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}

	const json = await getJSONAs('bundles/' + BUNDLE_PUBLIC, USER_1)
	t.is(json.assets.length, 2) // Should still have two items
	t.is(json.assets[0].id, ASSET_2)
	t.is(json.assets[1].id, ASSET_1)

	// TODO: Clean up the data by putting them back in the old order
	/*
	updateBundleAsset(ASSET_1, {
				assetId: ASSET_1,
				rank: 1
			}, {
				assetId: ASSET_2,
				rank: 2
			}
	 */
	t.pass()
})

test.serial('bundles: delete an asset', async (t) => {
	const path = 'bundle/' + BUNDLE_PUBLIC
	// Test that non-owner and anonymous users can't edit other people's bundles
	let tests : AccessTest[] = [{
		userId: USER_2,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: null,
		expectedStatus: 401,
		method: 'POST'
	}, {
		userId: USER_ADMIN,
		expectedStatus: 204,
		method: 'POST'
	}]
	let err = await testPathAccess(path, tests)
	if (err != null) {
		t.fail(err)
	}

	// Bundle should 404 after it's been archived
	const res = await requestAs('bundles/' + BUNDLE_PUBLIC, USER_1)
	err = await testResStatus(res, 404)
	if (err != null) {
		t.fail(err)
	}

	// TODO: Clean up by unarchiving it
	// unarchiveBundle(ASSET_1)

	t.pass()
})


test('bundles: get my bundles', async (t) => {
	const body = await getJSONAs('bundles', USER_1)
	t.is(body.bundles.length, 2) // This user has two bundles in the
	t.is(body.bundles[0].name, 'My D&D Campaign') // This needs to be their first item in seed data
	t.pass()
})

test('bundles: access to view public bundle page', async (t) => {
	let tests : AccessTest[] = [{
		userId: USER_1,
		expectedStatus: 200
	}, {
		userId: USER_2,
		expectedStatus: 200
	}, {
		userId: null,
		expectedStatus: 200
	}]
	let err = await testPathAccess('bundle/' + BUNDLE_PUBLIC, tests)
	if (err != null) {
		t.fail(err)
	}
})

test('bundles: get bundle', async (t) => {
	const json = await getJSONAs('bundle/' + BUNDLE_PUBLIC, USER_1)
	// TODO: Update these tests with the actual data that's in the seed file
	t.is(json.bundle.name, 'My D&D Campaign')
	t.is(json.bundle.description, '')
	t.is(json.bundle.public, true)
	t.is(json.assets.length, 2) // There should be two assets in this bundle in the seed data
})

test('bundles: access to view private bundle page', async (t) => {
	let tests : AccessTest[] = [{
		userId: USER_1,
		expectedStatus: 200
	}, {
		userId: USER_2,
		expectedStatus: 404
	}, {
		userId: null,
		expectedStatus: 404
	}]
	let err = await testPathAccess('bundle/' + BUNDLE_PRIVATE, tests)
	if (err != null) {
		t.fail(err)
	}
})
