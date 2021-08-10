import test from "ava";
import {request, testResError, testResStatus} from "./lib/lib";
import {ASSET_1, ASSET_4, ASSET_HIDDEN} from "./lib/fixtures";
import {ErrAssetNotFound, ErrAssetNotUnlocked, ErrDownloadTypeMissing} from "../src/constants/errors";

test.only('asset:download:unlocked', async (t) => {
	const res = await request(`assets/${ASSET_4}/download?type=original`, {
		userKey: 'TEST1'
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	t.true(json.url.indexOf('http') === 0, 'Link should begin with http')
	t.pass()
})

test('asset:download:HIDDEN', async (t) => {
	const res = await request(`assets/${ASSET_HIDDEN}/download?type=original`, {
		userKey: 'TEST1'
	})
	const err = await testResError(res, ErrAssetNotFound)
	if (err) {
		t.fail(err)
	}
	t.pass()
})


test('asset:download:missing type', async (t) => {
	const res = await request(`assets/${ASSET_HIDDEN}/download`, {
		userKey: 'TEST1'
	})
	const err = await testResError(res, ErrDownloadTypeMissing)
	if (err) {
		t.fail(err)
	}
	t.pass()
})


test('asset:download:locked', async (t) => {
	const res = await request(`assets/${ASSET_1}/download?type=original`, {
		userKey: 'TEST1'
	})
	const err = await testResError(res, ErrAssetNotUnlocked)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset:download:wrong id', async (t) => {
	const res = await request(`assets/43263264363/download?type=original`)
	const err = await testResError(res, ErrAssetNotFound)
	if (err) {
		t.fail(err)
	}
	t.pass()
})
