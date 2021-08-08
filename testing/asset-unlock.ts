import '../load-yaml-env'
import test from 'ava';
import {request, testResError} from "./lib/lib";
import {ASSET_HIDDEN, ASSET_1} from "./lib/fixtures"
import {ErrAssetNotFound} from "../src/lib/assets"
import {ErrNotEnoughCoins} from "../src/constants/errors"

test('asset:unlock an asset that doesnt exist', async (t) => {
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

test('asset:unlock an asset that is HIDDEN', async (t) => {
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

test('asset:unlock: unlock an asset when you dont have enough coins', async (t) => {
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


test('asset:unlock: unlock an asset when you already have it unlocked', async (t) => {
	t.pass()
})

test('asset:unlock: unlock an asset', async (t) => {
	// Make request to unlock
	// Confirm getting the asset shows it unlocked
	// Confirm the user's coins value has changed
	t.pass()
})