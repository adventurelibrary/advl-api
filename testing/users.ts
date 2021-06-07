import ava from 'ava'
import {request, testResStatus} from "./lib/lib";

ava('users:get', async (t) => {
	let res = await request(`/users`, {
		userKey: 'ADMIN1'
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	let json = await res.json()
	t.is(json.users.length, 3)
	t.is(json.users[0].username, 'test-admin-1')
	t.is(json.total, 3)

	res = await request(`/users`, {
		userKey: 'TEST1'
	})
	err = await testResStatus(res, 403)
	if (err) {
		t.fail(err)
	}
	t.pass()
})
