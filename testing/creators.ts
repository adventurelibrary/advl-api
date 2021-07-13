import ava from 'ava'
import '../load-yaml-env'
import {getJSON, request, testResStatus} from "./lib/lib";
import {CREATOR_1} from "./lib/fixtures";
import {query} from "../src/api/common/postgres";

ava('creators:get a single creator', async (t) => {
	const json = await getJSON(`/creator/${CREATOR_1}`)
	t.is(json.name, 'Adventure Library')
	t.pass()
})

ava('creators:get a list of creators', async (t) => {
	let res = await request(`/creators`, {
		userKey: 'ADMIN1'
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	let json = await res.json()
	t.is(json.creators.length, 3)
	t.is(json.creators[0].name, 'Adventure Library')
	t.is(json.total, 3)

	// Test the skip param
	res = await request(`/creators?skip=10`, {
		userKey: 'ADMIN1'
	})
	err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	json = await res.json()
	t.is(json.creators.length, 0)
	t.is(json.total, 3)
	t.pass()
})


ava('creators:get:mine', async (t) => {
	// Admin owns no creators
	let res = await request(`/creators/mine`, {
		userKey: 'ADMIN1'
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	let json = await res.json()
	t.is(json.creators.length, 0)
	t.is(json.total, 0)

	res = await request(`/creators/mine`, {
		userKey: 'CREATOR1'
	})
	err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	json = await res.json()
	t.is(json.creators.length, 1)
	t.is(json.creators[0].name, 'Gerrin Tramis')
	t.is(json.total, 1)


	res = await request(`/creators/mine`, {
		userKey: 'TEST1'
	})
	err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	json = await res.json()
	t.is(json.creators.length, 0)
	t.is(json.total, 0)


	res = await request(`/creators/mine`)
	err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava('creators:post non-logged in tries to create a creator', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
	})
	let err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava('creators:post non-admin in tries to create a creator', async (t) => {
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
	t.is(json.error.details[1].field, 'slug')
	t.is(json.error.details.length, 2)

	t.pass()
})

ava.serial('creators:create success', async (t) => {
	let res = await request('/creator', {
		method: 'POST',
		userKey: 'ADMIN1',
		body: {
			name: 'Creatortron',
			slug: 'creatortron'
		}
	})

	let err = await testResStatus(res,201)
	if (err) {
		t.fail(err)
	}

	const json = await res.json()
	const id = json.id

	// Cleanup: destroy the new thing
	await query(`
DELETE FROM ${process.env.DB_CREATORS}
WHERE id = $1
`, [id])

	t.pass()
})

ava('creators:put:validation', async (t) => {
	const res = await request(`/creator/${CREATOR_1}`, {
		method: 'PUT',
		userKey: 'ADMIN1',
		body: {
			name: ''
		}
	})

	// Name is required
	let err = await testResStatus(res,400)
	if (err) {
		t.fail(err)
	}

	const json = await res.json()
	t.truthy(json.error.key == 'validation')
	t.is(json.error.details.length, 1)
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
