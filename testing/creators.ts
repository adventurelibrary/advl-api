import ava from 'ava'
import '../load-yaml-env'
import {getJSON, request, testResStatus} from "./lib/lib";
import {CREATOR_1} from "./lib/fixtures";

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


// TODO: PUT test for non-admin who has access to the creator
