import ava from 'ava'
import {request, testResStatus} from "./lib/lib";

ava('creators: non-logged in tries to create a user', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
	})
	let err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava('creators: non-admin in tries to create a user', async (t) => {
	const res = await request('/creator', {
		method: 'POST',
		userKey: 'TEST1'
	})
	let err = await testResStatus(res, 403)
	if (err) {
		t.fail(err)
	}

	const json = await res.json()
	t.is(json.error, "Route requires you to be an admin")

	t.pass()
})
