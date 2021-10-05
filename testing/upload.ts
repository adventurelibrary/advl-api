//import * as fs from 'fs';
import fetch from 'node-fetch';
import {REQ_Get_Signature} from '../src/interfaces/IAsset';
import * as fs from 'fs';
import FormData from 'form-data';
import test from 'ava'
import {request, testResStatus} from "./lib/lib";
import {CREATOR_1} from "./lib/fixtures";
import '../load-yaml-env'
import {deleteAsset} from "../src/lib/assets";

const uploadReq:REQ_Get_Signature = {
  name: "Mountain Dig Site + " + new Date().getTime(),
  description: "Frag Maps Mountain Dig Site",
  category: "token",
  tags: ['Mountain'],
  unlock_price: 0,
  revenue_share: {},
  creator_id: CREATOR_1,
  visibility: 'HIDDEN',
}

test('upload: upload a file while not logged in', async (t) => {
  const response = await request(`manage/creator/${uploadReq.creator_id}/upload-signature`, {
    method: "POST",
    body: uploadReq
  })
  const err = await testResStatus(response, 500)
  if (err) {
    t.fail(err)
  }
  t.pass()
})

test('upload: validation', async (t) => {
  const response = await request(`manage/creator/${uploadReq.creator_id}/upload-signature`, {
    userKey: 'ADMIN1',
    method: "POST",
    body: {

    }
  })
  let err = await testResStatus(response, 400)
  if (err) {
    t.fail(err)
    return
  }

  const json = await response.json()
  t.is(json.error.key, 'validation')
  t.is(json.error.details[0].field, 'name')
  t.is(json.error.details[2].field, 'category')
  t.pass()
})

test.only('upload:get signature', async (t) => {
  let res = await request(`manage/creator/${uploadReq.creator_id}/upload-signature`, {
    userKey: 'ADMIN1',
    method: "POST",
    body: uploadReq
  })
  let err = await testResStatus(res, 200)
  if (err) {
    t.fail(err)
    return
  }

  let json = await res.json()
  t.true(json.signature.length > 10, 'Signature should be at least 10 chars long')
  t.true(json.assetID.length > 0, 'Asset ID should exist')

  // Force the EC index to update
  //await refreshIndex(process.env.INDEX_ASSETDB)

  // This item should now appear in this user's list of assets
  res = await request(`/manage/creator/${uploadReq.creator_id}/assets?refresh=true`, {
    userKey: 'ADMIN1',
  })
  json = await res.json()

  console.log('json assets assets', json.assets.assets)
  const first = json.assets.assets[0]

  t.is(first.name, uploadReq.name)
  t.is(first.visibility, 'HIDDEN')
  t.is(first.upload_status, 'PENDING')

  // Cleanup: destroy the new thing
  try {
    await deleteAsset(first)
  } catch (ex) {
    t.fail(ex.toString())
  }

  err = await testResStatus(res,200)
  if (err) {
    t.fail(err)
  }

  t.pass()
})

test.skip('upload: upload a file to transloadit', async (t) => {
  //const productionURL = 'https://api.adventurelibrary.art/'
  let transloadit_response
  try{
    const response = await request(`manage/creator/${uploadReq.creator_id}/upload-signature`, {
      userKey: 'TEST1',
      method: "POST",
      body: uploadReq
    })
    let err = await testResStatus(response, 200)
    if (err) {
      t.fail(err)
      return
    }

    const json = await response.json()

    if (!json) {
      t.fail('No json returned from get signature')
      return
    }

    let form = new FormData();
    form.append('file', fs.createReadStream('tests/files/Mountain_Dig_Site.png'));
    form.append('params', json.params),
    form.append('signature', json.signature)


    transloadit_response = await (await fetch('https://api2.transloadit.com/assemblies', {
      method: 'post',
      headers: form.getHeaders(),
      body: form
    })).json()

  } catch (E) {
    console.log(transloadit_response);
    console.error(E);
    t.fail(E.toString())
    return
  }

  t.pass()
})
