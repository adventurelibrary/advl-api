import test from 'ava'
import {request, testResStatus} from "./lib/lib";
import {ASSET_1} from "./lib/fixtures";

test('asset: get asset with wrong id', async (t) => {
	const res = await request(`asset/id-does-not-exit`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset: get asset directly', async (t) => {
	const res = await request(`assets/${ASSET_1}`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	t.is(json.id, ASSET_1)
	t.is(json.name, 'Asset Tester')
	t.is(json.visibility, 'PUBLIC')
	t.is(json.filetype, 'IMAGE')
	t.is(json.unlock_price, 50)
	t.pass()
})

// TODO: Perform this test for assets with different visibilities as well
test.skip('asset: get an asset download link', async (t) => {
	const res = await request(`assets/${ASSET_1}/download`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	t.true(json.link.indexOf('http') === 0, 'Link should begin with http')
	t.pass()
})

test('asset: get an asset download link with wrong id', async (t) => {
	const res = await request(`assets/43263264363/download`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})


// TODO: Test(s) for PUT updating asset(s)
