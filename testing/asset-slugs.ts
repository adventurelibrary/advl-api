import '../load-yaml-env'
import test from "ava";
import {request, testResStatus} from "./lib/lib";
import {
	ASSET_2,
	ASSET_2_SLUG,
	ASSET_HIDDEN_SLUG,
	CREATOR_1_SLUG,
	CREATOR_2_SLUG,
	CREATOR_3,
	CREATOR_3_SLUG
} from "./lib/fixtures";
import {deleteAsset, getAsset, updateAssetById} from "../src/lib/assets";

test('asset: get asset by slugs', async (t) => {
	const res = await request(`creators/${CREATOR_3_SLUG}/asset/${ASSET_2_SLUG}`)
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
	}
	const json = await res.json()
	t.is(json.asset.slug, ASSET_2_SLUG)
	t.is(json.creator.slug, CREATOR_3_SLUG);
	t.pass()
})

test('asset: get non-existent asset by slugs', async (t) => {
	const res = await request(`creators/${CREATOR_3_SLUG}/asset/fdshjfdskafdsafdsa`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})
test('asset: get asset by wrong creator slug', async (t) => {
	const res = await request(`creators/${CREATOR_2_SLUG}/asset/${ASSET_2_SLUG}`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})

test('asset: get hidden asset by slugs', async (t) => {
	const res = await request(`creators/${CREATOR_1_SLUG}/asset/${ASSET_HIDDEN_SLUG}`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	t.pass()
})


// This one is serial because it changes our test data while it runs, then changes it back
test.serial('asset: get pending asset by slugs', async (t) => {
	await updateAssetById(ASSET_2, {
		upload_status: 'PENDING'
	})
	const res = await request(`creators/${CREATOR_1_SLUG}/asset/${ASSET_2_SLUG}`)
	let err = await testResStatus(res, 404)
	if (err) {
		t.fail(err)
	}
	// Cleanup
	await updateAssetById(ASSET_2, {
		upload_status: 'COMPLETE'
	})
	t.pass()
})


test.serial('upload:get signature of duplicate name', async (t) => {
	let res = await request(`manage/creator/${CREATOR_3}/upload-signature`, {
		userKey: 'ADMIN1',
		method: "POST",
		body: {
			name: "Mutante",
			description: "This should have a number added to its slug",
			category: "token",
			tags: [''],
			unlock_price: 0,
			revenue_share: {},
			creator_id: CREATOR_3,
			visibility: 'HIDDEN',
		}
	})
	let err = await testResStatus(res, 200)
	if (err) {
		t.fail(err)
		return
	}

	let json = await res.json()
	t.true(json.assetID.length > 0, 'Asset ID should exist')

	const asset = await getAsset(json.assetID)
	if (!asset) {
		t.fail(`Could not find asset with ID ${json.assetID}`)
	}
	t.truthy(asset.slug.indexOf('mutante-') === 0, `Slug should start with "mutante-" but it is "${asset.slug}"`)
	const appended = asset.slug.replace('mutante-', '')
	const num = parseInt(appended)
	t.truthy(!isNaN(num))
	t.truthy(num > 0)

	// Cleanup: destroy the new thing
	try {
		await deleteAsset(asset)
	} catch (ex) {
		t.fail(ex.toString())
	}

	t.pass()
})

