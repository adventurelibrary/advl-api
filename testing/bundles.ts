import test from 'ava';

import {AccessTest, getJSONAs, requestAs, testPathAccess, testResStatus} from "./lib";
import {BUNDLE_PRIVATE, BUNDLE_PUBLIC, USER_1, USER_2} from './fixtures'

test('bundles: get my bundles', async (t) => {
	const body = await getJSONAs('bundles', USER_1)
	t.is(body.bundles.length, 2) // This user has two bundles in the
	t.is(body.bundles[1].name, 'My D&D Camapaign') // This needs to be their first item in seed data
	t.pass()
})

test('bundles: test access to public bundle page', async (t) => {
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

test('bundles: test access to private bundle page', async (t) => {
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

test('bundles: create a new bundle', async (t) => {
	console.log('starting the create test')
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
	console.log('res received')
	let err = await testResStatus(res, 401) // You need to be logged in to do that
	console.log('err', err)
	if (err) {
		t.fail(err)
	}

	console.log('try doing it again as user')
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

	// Confirm the bundle was created
	/*
	const bundle = getBundle(id)
	t.is(bundle.name, createOpts.body.bundle.name)
	t.is(bundle.description, createOpts.body.bundle.description)
	t.is(bundle.public, createOpts.body.bundle.public)
	t.is(bundle.userId, USER_2) // Confirm it is created by the logged in user
	*/


	// Clean
	//destroyBundle(id)

	t.pass()
})
