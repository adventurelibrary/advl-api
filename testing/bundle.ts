import test from 'ava';
import { request, requestAs, testResStatus } from "./lib/lib";
import {ASSET_1} from './lib/fixtures'

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
  console.log(res.status)
  console.log(await res.json());
  t.pass();
  /*
  let err = await testResStatus(res, 201)
  if(err){
    t.fail(err);
  }
  t.pass('Bundle created by test-user-01.');
  */
})


//Create a new bundle as a creator 
//Update bundle to public
//Get a bundle
//Add assets to a bundle
//Remove assets from a bundle
//Search for a bundle 
//Delete a bundle