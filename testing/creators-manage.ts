import ava from 'ava'
import '../load-yaml-env'
import {AccessTest, getJSON, request, testPathAccess, testResStatus} from "./lib/lib";
import {CREATOR_1, CREATOR_2} from "./lib/fixtures";
import {query} from "../src/api/common/postgres";

ava('creators:manage get access', async (t) => {
	const path = `/creator/manage/${CREATOR_1}`
	let tests : AccessTest[] = [{
		// A user without access to this asset's creator
		userKey: 'TEST1',
		expectedStatus: 403,
	}, {
		// Not logged in
		userKey: null,
		expectedStatus: 401,
	}]
	let err = await testPathAccess(path, tests, {
		method: 'POST'
	})
	if (err != null) {
		t.fail(err)
	}
	t.pass()
})

ava('creators:manage get assets access', async (t) => {
	const path = `/creator/manage/${CREATOR_1}/assets`
	let tests : AccessTest[] = [{
		// A user without access to this asset's creator
		userKey: 'TEST1',
		expectedStatus: 403,
	}, {
		// Not logged in
		userKey: null,
		expectedStatus: 401,
	}]
	let err = await testPathAccess(path, tests, {
		method: 'POST'
	})
	if (err != null) {
		t.fail(err)
	}
	t.pass()
})


ava.serial('creators:manage:put:success as admin', async (t) => {
	let res = await request(`/manage/creator/${CREATOR_1}`, {
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

	const json = await getJSON(`/manage/creator/${CREATOR_1}`)
	t.is(json.name, 'Updated Name')

	// Cleanup
	res = await request(`/manage/creator/${CREATOR_1}`, {
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


ava('creators:manage:get:mine', async (t) => {
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

ava('creators:manage:post non-logged in tries to create a creator', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
	})
	let err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava('creators:manage:post non-admin in tries to create a creator', async (t) => {
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

ava('creators:manage: create validation', async (t) => {
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

ava.serial('creators:manage:create success', async (t) => {
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

ava('creators:manage:put:validation', async (t) => {
	const res = await request(`/manage/creator/${CREATOR_1}`, {
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

ava.only('creators:manage:get assets', async (t) => {
	let res = await request(`/manage/creator/${CREATOR_2}/assets`, {
		userKey: 'ADMIN1',
	})
	let json = await res.json()
	/*console.log('json.assets.assets', json.assets.assets.map((x) => {
		return {
			uploaded: x.uploaded,
			name: x.name
		}
	}))*/
	t.is(json.creator.id, CREATOR_2)
	t.is(json.assets.total, 4)
	t.is(json.assets.assets[0].visibility, 'HIDDEN')
	t.is(json.assets.assets[3].visibility, 'PUBLIC')
	t.is(json.assets.assets[0].name, 'Hope Keyshot')
	t.is(json.assets.assets[1].name, 'House')
	t.is(json.assets.assets[2].name, 'Killion')
	t.is(json.assets.assets[3].name, 'First Kill')
})
