import test from 'ava';

import {fetchAsUser, testResStatus} from "./lib";
import {userId1} from "../tests/constants";

test('get my bundles', async (t) => {
	const res = await fetchAsUser('my-bundles', userId1)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const body = await res.json()
	t.is(body.bundles.length, 0)
	t.pass()
})

test('get my bundles but not logged in', async (t) => {
	const res = await fetchAsUser('my-bundles', '')
	let err = await testResStatus(res, 500)
	if (err) {
		t.fail(err)
	}
	t.pass()
})
