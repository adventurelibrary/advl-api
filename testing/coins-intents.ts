import '../load-yaml-env'
import ava from 'ava';
import {request, testResStatus} from "./lib/lib";
import {PURCHASE_OPTIONS} from "../src/constants/coins";
import {COIN_PURCHASE_PENDING, PAYMENT_INTENT_COMPLETE_PID} from "./lib/fixtures";
import {query, updateObj} from "../src/api/common/postgres";

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

ava('coins:intents:success', async (t) => {
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
	t.truthy(data.client_secret.indexOf('pi_') == 0, 'Should start with pi_')

	// Let's try to confirm this one. It will fail cause they haven't paid.

	t.pass()
})

ava.serial('coins:intents:confirm', async (t) => {
	let res = await request('coins/purchase/stripe-intent-confirm', {
		method: 'POST',
		userKey: 'TEST1',
		body: {
			paymentIntentId: PAYMENT_INTENT_COMPLETE_PID,
		}
	})

	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}

	const body = await res.json()
	t.is(body.coins, 1950, `User should have 1450 + 500 coins`)

	// Delete the coins that were just added
	await query(`DELETE FROM ${process.env.DB_ENTITY_COINS} WHERE purchase_id = $1`, [COIN_PURCHASE_PENDING])

	// Revert the coin purchase
	await updateObj(process.env.DB_COIN_PURCHASES, COIN_PURCHASE_PENDING, {
		status: 'pending',
		succeeded_date: null
	})

	t.pass()
})
