import test from 'ava';
import '../load-yaml-env'
import {ASSET_1, BUNDLE_PRIVATE, BUNDLE_PUBLIC, CREATOR_1, USER1} from './lib/fixtures';
import { request, requestAs, testResStatus } from "./lib/lib";
import {deleteBundle, getBundleByName} from "../src/lib/bundle";
import {query} from "../src/api/common/postgres";

//Create a new bundle as not logged in user
test.serial('bundle:create:without being logged in', async (t) => {
  const createOpts = {
    method: "post",
    body: {
      name: "Bundling Bundles 1",
      public: false,
      description: "The bundliest",
    }
  }
  let res = await requestAs('bundles/create', null, createOpts);
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
  if (bundle.user_id != USER1) {
    t.fail('Wrong user was created')
  }

  // Test cleanup
  await deleteBundle(bundle.id)

  t.pass('Bundle created by test-user-01.');
})

//Create a new bundle as a creator
test.serial('bundle:create: a new creator bundle as test user', async (t) => {
  const name = "Creatorest Bundle"
  const createOpts = {
    method: "post",
    body: {
      name: name,
      public: false,
      description: "The bundliest bundle BY A CREATOR",
      added_assets: [ASSET_1],
      creator_id: CREATOR_1
    },
    userKey: 'TEST1'
  }
  const res = await request('bundles/create', createOpts);
  let err = await testResStatus(res, 201)
  if(err){
    t.fail(err);
  }

  const bundle = await getBundleByName(name)
  t.is(bundle.creator_id, CREATOR_1, `Wrong creator was assigned`)

  // Test cleanup
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
  await query(`UPDATE bundleinfo SET public = false WHERE id = ?`, [BUNDLE_PRIVATE])

  t.pass("Bundle updated to public")
})


//Get a bundle
test('bundle:get', async (t) => {
  type AccessTest = {
    id: string
    userKey?: string
    status: number
    name?: string
  }
  const tests : AccessTest[] = [
    {
      // Public bundle, not logged in = OKAY
      id: BUNDLE_PUBLIC,
      name: 'My Public Bundle',
      status: 200
    },
    {
      // Public bundle and it's your bundle = OKAY
      id: BUNDLE_PUBLIC,
      name: 'My Public Bundle',
      userKey: 'TEST1',
      status: 200
    },
    {
      // Private bundle that is your bundle = OKAY
      id: BUNDLE_PRIVATE,
      name: 'My Private Bundle',
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
    if (accessTest.name) {
      const json = await res.json()
      t.is(accessTest.name, json.name)
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
