import '../load-yaml-env'
import test from 'ava';
import {request, testResError} from "./lib/lib";
import {ASSET_1, ASSET_4, ASSET_HIDDEN, USER1} from "./lib/fixtures"
import {ErrAssetAlreadyUnlocked, ErrAssetNotFound, ErrNotEnoughCoins} from "../src/constants/errors"
import {query} from "../src/api/common/postgres"

test('asset:unlock:does not exist', async (t) => {
	const res = await request(`/assets/332434253425/unlock`, {
		method: 'POST',
		userKey: 'TEST1'
	})
	const err = await testResError(res, ErrAssetNotFound)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset:unlock:HIDDEN', async (t) => {
	const res = await request(`/assets/${ASSET_HIDDEN}/unlock`, {
		method: 'POST',
		userKey: 'TEST1'
	})
	const err = await testResError(res, ErrAssetNotFound)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset:unlock:not have enough coins', async (t) => {
	const res = await request(`/assets/${ASSET_1}/unlock`, {
		method: 'POST',
		userKey: 'CREATOR1'
	})
	const err = await testResError(res, ErrNotEnoughCoins)
	if (err) {
		t.fail(err)
	}
	t.pass()
})


test('asset:unlock:already have it unlocked', async (t) => {
	const res = await request(`/assets/${ASSET_4}/unlock`, {
		method: 'POST',
		userKey: 'TEST1'
	})
	const err = await testResError(res, ErrAssetAlreadyUnlocked)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset:unlock', async (t) => {
	// Double check their coins at the start
	let res = await request(`/users`, {
		userKey: 'TEST1'
	})
	let body = await res.json()
	t.is(body.num_coins, 1450)


	// Make request to unlock
	res = await request(`/assets/${ASSET_1}/unlock`, {
		method: 'POST',
		userKey: 'TEST1',
	})
	body = await res.json()
	t.is(body.numCoins, 1400) // New coin count should be returned

	// Confirm getting the asset shows it unlocked
	res = await request(`/assets/${ASSET_1}`, {
		userKey: 'TEST1'
	})
	body = await res.json()
	t.is(body.id, ASSET_1)
	t.is(body.unlocked, true)

	res = await request(`/users`, {
		userKey: 'TEST1'
	})
	body = await res.json()
	t.is(body.num_coins, 1400)

	// Data cleanup
	try {
		const sel = await query(`SELECT id 
			FROM entity_coins 
			WHERE entity_id = $1 
			AND num_coins = -50 
			AND unlock_id > 1
			LIMIT 1`, [USER1])
		await query(`DELETE FROM entity_coins WHERE id = $1`, [sel[0].id])
	} catch (ex) {
		t.fail()
	}

	try {
		await query(`DELETE FROM asset_unlocks WHERE asset_id = $1 AND user_id = $2`, [ASSET_1, USER1])
	} catch (ex) {
		t.fail()
	}

	t.pass()
})
