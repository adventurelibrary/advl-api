import test from 'ava';
import '../load-yaml-env'
import {ASSET_1, BUNDLE_PRIVATE, BUNDLE_PUBLIC, CREATOR_1, CREATOR_2, USER1} from './lib/fixtures';
import {request, testResStatus} from "./lib/lib";
import {deleteBundle} from "../src/lib/bundle";
import {query} from "../src/api/common/postgres";
import {refreshIndex} from "../src/api/common/elastic";
import {Bundle} from "../src/interfaces/IBundle";

async function getBundleByName(name: string) : Promise<Bundle> {
	const rows = await query(`SELECT * FROM bundleinfo WHERE name = $1`, [name])
	return rows[0]
}

//Create a new bundle as not logged in user
test.serial('bundle:create:without being logged in', async (t) => {
  let res = await request('bundles/create', {
    method: 'POST',
    body: {
      name: "Bundling Bundles 1",
      public: false,
      description: "The bundliest",
    }
  });
  let err = await testResStatus(res, 401) //You need to be logged in to do that
  if(err){
    t.fail(err)
  }
  t.pass('Bundle could not be created without being logged in.')
})

//Create a new bundle as user
test.serial('bundle:create:as test user', async (t) => {
  const name = "Newly Created Bundle"
  const createOpts = {
    method: "post",
    body: {
      name: name,
      public: false,
      description: "The bundliest bundle",
      added_assets: [ASSET_1]
    },
    userKey: 'TEST1'
  }
  let res = await request('bundles/create', createOpts);
  let err = await testResStatus(res, 201)
  if(err){
    t.fail(err);
  }

  const bundle = await getBundleByName(name)
  if (bundle.entity_id != USER1) {
    t.fail('Wrong user was created')
  }

	t.log('Refreshing ElasticSearch index: ' + process.env.INDEX_BUNDLEINFO)
	await refreshIndex(process.env.INDEX_BUNDLEINFO)

  // Confirm that the bundle was properly added to the search index
  res = await request('bundles/mine', {
    userKey: 'TEST1'
  });
  err = await testResStatus(res, 200)
  if(err){
    t.fail(err);
  }

  const json = await res.json()
  const latest = json.bundles[json.bundles.length-1]
  t.is(json.bundles.length, 4) // This user has 3 in our test data, then we just added one in this test
  t.truthy(latest.cover_thumbnail.indexOf('http') == 0, `The last bundle should have a cover`)


  // Test cleanup (and bonus delete test)
  const url = 'bundles/' + bundle.id + '/delete'
  res = await request(url, {
    method: 'POST',
    userKey: 'TEST1'
  });
  err = await testResStatus(res, 204)
  if(err){
    t.fail(err);
  }
  t.pass('Bundle created by test-user-01.');
})

//Create a new bundle as a creator
test.serial('bundle:create: a new creator bundle as creator user', async (t) => {
  const name = "Creatorest Bundle"
  const createOpts = {
    method: "post",
    body: {
      name: name,
      public: false,
      description: null,
      added_assets: [ASSET_1],
      creator_id: CREATOR_2
    },
    userKey: 'CREATOR1'
  }
  let res = await request('bundles/create', createOpts);
  let err = await testResStatus(res, 201)
  if(err){
    t.fail(err);
  }

  const bundle = await getBundleByName(name)
  t.is(bundle.entity_id, CREATOR_2, `Wrong creator was assigned`)

  // Cleanup
  await deleteBundle(bundle.id)

  t.pass('Bundle created by creator (Adventure Library 2).');
})

//attempt to create a bundle for a creator you don't have access too
//Create a new bundle as a creator
test.serial('bundle:create:wrong creator', async (t) => {
  const createOpts = {
    method: "post",
    body: {
      name: "Bundling Bundles 3",
      public: false,
      description: "The bundliest bundle BY A CREATOR",
      added_assets: [ASSET_1],
      creator_id: CREATOR_1
    },
    userKey: 'ADMIN1'
  }
  let res = await request('bundles/create', createOpts);

  let err = await testResStatus(res, 403)
  if(err){
    t.fail(err);
  }
  t.pass('Bundle could not be created.');
})


//Update bundle to public
test.serial('bundle:update:to public', async (t) => {
  const opts = {
    method: 'PUT',
    body: {
      public:  true,
    },
    userKey: 'TEST1'
  }

  let res = await request(`bundles/${BUNDLE_PRIVATE}`, opts);
  let err = await testResStatus(res, 204)
  if(err){
    t.fail(err)
  }

  // Confirm access now
  res = await request(`bundles/${BUNDLE_PRIVATE}`)
  await testResStatus(res, 200)
  if(err){
    t.fail(err)
  }

  // Reset the database
  await query(`UPDATE bundleinfo SET public = false WHERE id = $1`, [BUNDLE_PRIVATE])

  t.pass("Bundle updated to public")
})


//Get a bundle
test('bundle:get', async (t) => {
  type AccessTest = {
    id: string
    userKey?: string
    status: number
    fieldTests?: Record<string, any>
    checkThumbnail?: boolean
  }
  const tests : AccessTest[] = [
    {
      // Public bundle, not logged in = OKAY
      id: BUNDLE_PUBLIC,
      fieldTests: {
        name: 'My Public Bundle',
        cover_asset_id: 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw'
      },
      status: 200,
      checkThumbnail: true
    },
    {
      // Public bundle and it's your bundle = OKAY
      id: BUNDLE_PUBLIC,
      fieldTests: {
        name: 'My Public Bundle'
      },
      userKey: 'TEST1',
      status: 200
    },
    {
      // Private bundle that is your bundle = OKAY
      id: BUNDLE_PRIVATE,
      fieldTests: {
        name: 'My Private Bundle'
      },
      userKey: 'TEST1',
      status: 200
    },
    {
      // Private bundle that is NOT your bundle = ERROR
      id: BUNDLE_PRIVATE,
      userKey: 'CREATOR1',
      status: 403
    },
    {
      // Private bundle and not logged in = ERROR
      id: BUNDLE_PRIVATE,
      status: 403
    }
  ]

  for (let i = 0; i < tests.length; i++) {
    const accessTest = tests[i]
    const res = await request(`/bundles/${accessTest.id}`, {
      userKey: accessTest.userKey
    })
    let err = await testResStatus(res, accessTest.status)
    if (err) {
      t.fail(`[${i}] ${accessTest.userKey}@/${accessTest.id} ${err}`)
    }
    const json = await res.json()
    if (accessTest.fieldTests) {
      for (let field in accessTest.fieldTests) {
        t.is(json[field], accessTest.fieldTests[field])
      }
    }
    if (accessTest.checkThumbnail) {
      t.truthy(json.cover_thumbnail.indexOf('https') === 0)
      t.truthy(json.cover_thumbnail.indexOf('undefined') === -1)
    }
  }
  t.pass()
})

test('bundles:get:mine', async (t) => {
  let res = await request (`bundles/mine`, {
    userKey: 'TEST1'
  })
  let result = await res.json();
  t.is(result.bundles.length, 3)
  console.log('result bundles', result.bundles)

  // Only the third bundle has a cover, because it has an asset
  t.truthy(result.bundles[2].cover_thumbnail.indexOf('http') === 0, 'Expected http to start: ' + result.bundles[0].cover_thumbnail) // Confirm the public bundle has a thumb

  res = await request (`bundles/mine`, {
    userKey: 'CREATOR1'
  })
  result = await res.json();
  t.is(result.bundles.length, 0)

  res = await request (`bundles/mine`)
  const err = await testResStatus(res, 401)
  if (err) {
    t.fail(err)
  }


  t.pass("Bundle fetched")
})


test("bundle:search:by creator ID", async (t) => {
  const opts = {
    method: 'get'
  }

  let res = await request(`bundles?creator_id=9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1`, opts);
  console.log(await res.json())

  t.pass();
})
