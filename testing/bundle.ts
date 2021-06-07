import test from 'ava';
import { ASSET_1, BUNDLE_1 } from './lib/fixtures';
import { request, requestAs, testResStatus } from "./lib/lib";
//import { BUNDLE_1} from './lib/fixtures'

//Create a new bundle as not logged in user
test.serial('Bundle: Try to create a bundle without being logged in', async (t) => {
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
test.serial('Bundle: Create a new bundle as test user', async (t) => {
  const createOpts = {
    method: "post",
    body: {
      name: "Bundling Bundles 2",
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
  t.pass('Bundle created by test-user-01.');
  
})

//Create a new bundle as a creator
test.serial('Bundle: Create a new bundle as test user', async (t) => {
  const createOpts = {
    method: "post",
    body: {
      name: "Bundling Bundles 3",
      public: false,
      description: "The bundliest bundle BY A CREATOR",
      added_assets: [ASSET_1],
      creator_id: '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1'
    },
    userKey: 'TEST1'
  }
  let res = await request('bundles/create', createOpts);
  
  let err = await testResStatus(res, 201)
  if(err){
    t.fail(err);
  }
  t.pass('Bundle created by creator (Adventure Library 2).');
}) 

//attempt to create a bundle for a creator you don't have access too
//Create a new bundle as a creator
test.serial('Bundle: Create a new bundle as test user', async (t) => {
  const createOpts = {
    method: "post",
    body: {
      name: "Bundling Bundles 3",
      public: false,
      description: "The bundliest bundle BY A CREATOR",
      added_assets: [ASSET_1],
      creator_id: '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1'
    },
    userKey: 'ADMIN1'
  }
  let res = await request('bundles/create', createOpts);
  
  let err = await testResStatus(res, 401)
  if(err){
    t.fail(err);
  }
  t.pass('Bundle could not be created.');
}) 


//Update bundle to public
test.serial('Bundle: Update a bundle to public', async (t) => {
  const opts = {
    method: "put",
    body: {
      public:  true,
    },
    userKey: 'TEST1'
  }

  let res = await request(`bundles/${BUNDLE_1}`, opts);
  let err = await testResStatus(res, 200)
  if(err){
    t.fail("Error code not 200")
  }
  
  t.pass("Bundle updated to public")
})


//Get a bundle
test.serial('Bundle: GET a bundle', async (t) => {
  const opts = {
    method: 'get',
  }
  let res = await request (`bundles/${BUNDLE_1}`, opts)
  let bundle = await res.json();
  console.log(bundle);

  t.pass("Bundle fetched")
})


//Search for a bundle 

test.serial("Bundle: search for a bundle by user ID", async (t) => {
  const opts = {
    method: 'get'
  }

  let res = await request(`bundles?creator_id=9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1`, opts);
  console.log(await res.json())

  t.pass();
})
//Delete a bundle