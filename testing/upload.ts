//import * as fs from 'fs';
import fetch from 'node-fetch';
import { REQ_Get_Signature } from '../src/interfaces/IAsset';
import * as fs from 'fs';
import FormData from 'form-data';
import test from 'ava'
import {request, testResStatus} from "./lib/lib";

const uploadReq:REQ_Get_Signature = {
  name: "Mountain Dig Site",
  description: "Frag Maps Mountain Dig Site",
  collectionID: "001",
  category: "token",
  tags: ['Mountain'],
  unlockPrice: 0,
  revenueShare: {}
}


test('upload: upload a file while not logged in', async (t) => {
  const response = await request('assets/get_signature', {
    method: "POST",
    body: uploadReq
  })
  const err = await testResStatus(response, 500)
  if (err) {
    t.fail(err)
  }
  t.pass()
})
test('upload: upload a file to transloadit', async (t) => {
  //const productionURL = 'https://api.adventurelibrary.art/'
  let transloadit_response
  try{
    const response = await request('assets/get_signature', {
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
			t.fail('No json retunred from get signature')
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
