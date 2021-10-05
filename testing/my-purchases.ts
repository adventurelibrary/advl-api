import '../load-yaml-env'
import ava from 'ava';
import {request, testResStatus} from './lib/lib';


ava('mypurchases:get my purchases', async (t) => {
	let res = await request('users/my-purchases?size=0&from=0', {
		userKey: 'TEST1'
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}

	let json = await res.json()
	t.is(json.total, 23)
	console.log('json', json)
	t.is(json.results[1].coins, 500)
	t.is(json.results[1].cents, 500)
	t.is(json.results[0].coins, 2500)
	t.is(json.results[0].cents, 2500)

	res = await request('users/my-purchases?size=5&from=5', {
		userKey: 'TEST1'
	})
	err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}

	json = await res.json()
	t.is(json.total, 23)
	t.is(json.results.length, 5)
	t.is(json.results[0].coins, 500)
	t.is(json.results[0].cents, 500)
	t.is(json.results[1].coins, 500)
	t.is(json.results[1].cents, 500)
	t.pass()
})


ava('mypurchases:access', async (t) => {
	let res = await request('users/my-purchases')
	let err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})
