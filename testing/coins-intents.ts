import '../load-yaml-env'
import ava from 'ava';
import {request, testResStatus} from "./lib/lib";
import {PURCHASE_OPTIONS} from "../src/constants/coins";

ava('coins:intents:access', async (t) => {
	let res = await request('coins/purchase/stripe-intent', {
		method: 'POST',
	})

	let err = await testResStatus(res, 401)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava('coins:intents:validation', async (t) => {
	let res = await request('coins/purchase/stripe-intent', {
		method: 'POST',
		userKey: 'TEST1',
		body: {
			coins: 1337
		}
	})

	let err = await testResStatus(res, 400)
	if (err) {
		t.fail(err)
	}

	t.pass()
})

ava.only('coins:intents:success', async (t) => {
	let res = await request('coins/purchase/stripe-intent', {
		method: 'POST',
		userKey: 'TEST1',
		body: {
			coins: PURCHASE_OPTIONS[0].coins
		}
	})

	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}

	const data = await res.json()
	console.log('data', data)
	t.truthy(data.client_secret.indexOf('pi_') == 0, 'Should start with pi_')

	// Let's try to confirm this one. It will fail cause they haven't paid.

	t.pass()
})

ava.serial('coins:intents:confirm', async (t) => {
	// TODO: Create a payment intent and complete it in the test environment
	//   then confirm it here
	t.pass()
})
