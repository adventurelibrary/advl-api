import ava from 'ava'
import '../load-yaml-env'
import {request, testResStatus} from "./lib/lib";
import {CREATOR_1} from "./lib/fixtures";

ava('creators:get a single creator', async (t) => {
	const res = await request(`/creator/${CREATOR_1}`)
	const json = await res.json()
	t.is(json.name, 'Adventure Library')
	t.pass()
})

ava('creators:get a list of creators', async (t) => {
	let res = await request(`/creators`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	let json = await res.json()
	t.is(json.creators.length, 3)
	t.is(json.creators[0].name, 'Adventure Library')
	t.pass()
})


// TODO: PUT test for non-admin who has access to the creator
