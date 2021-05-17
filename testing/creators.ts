import ava from 'ava'
import {getJSON, request, testResStatus} from "./lib/lib";
import { CREATOR_1} from "./lib/fixtures";

ava('creators:get', async (t) => {
	const json = await getJSON(`/creator/${CREATOR_1}`)
	t.is(json.name, 'Adventure Library')
	t.pass()
})

ava('creators:post non-logged in tries to create a user', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
	})
	let err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava('creators:post non-admin in tries to create a user', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
		userKey: 'TEST1'
	})
	let err = await testResStatus(res, 403)
	if (err) {
		t.fail(err)
	}

	const json = await res.json()
	t.is(json.error.message, "Route requires you to be an admin")

	t.pass()
})

ava('creators: create validation', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
		userKey: 'ADMIN1',
		body: {
		}
	})

	// Name is required
	let err = await testResStatus(res,400)
	if (err) {
		t.fail(err)
	}

	const json = await res.json()
	t.truthy(json.error.key == 'validation')
	t.is(json.error.details[0].field, 'name')

	t.pass()
})

ava('creators:put:validation', async (t) => {
	const res = await request(`/creator/${CREATOR_1}`, {
		method: 'PUT',
		userKey: 'ADMIN1',
		body: {
		}
	})

	// Name is required
	let err = await testResStatus(res,400)
	if (err) {
		t.fail(err)
	}

	const json = await res.json()
	t.truthy(json.error.key == 'validation')
	t.is(json.error.details[0].field, 'name')

	t.pass()
})

ava.serial('creators:put:success as admin', async (t) => {
	let res = await request(`/creator/${CREATOR_1}`, {
		method: 'PUT',
		userKey: 'ADMIN1',
		body: {
			name: 'Updated Name'
		}
	})

	let err = await testResStatus(res,204)
	if (err) {
		t.fail(err)
	}

	const json = await getJSON(`/creator/${CREATOR_1}`)
	t.is(json.name, 'Updated Name')

	// Cleanup
	res = await request(`/creator/${CREATOR_1}`, {
		method: 'PUT',
		userKey: 'ADMIN1',
		body: {
			name: 'Adventure Library'
		}
	})
	err = await testResStatus(res, 204)
	if (err) {
		t.fail(err)
	}


	t.pass()
})

// TODO: PUT test for non-admin who has access to the creator
