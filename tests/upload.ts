//import * as fs from 'fs';
import fetch from 'node-fetch';
import { REQ_Get_Signature } from '../src/interfaces/IAsset';
import {testURL} from './constants'
import * as fs from 'fs';
import FormData from 'form-data';

test_fetch_preflight();

export async function test_fetch_preflight() {
  try{
    //File paths are relative to
    //let map = fs.readFileSync("tests/files/Mountain_Dig_Site.png");
    //console.log(map);

    let uploadReq:REQ_Get_Signature = {
      name: "GrassToSnow-1",
      description: "Dice Grimorium's GrassToSnow variant 1",
      collectionID: "001",
      category: "map",
      tags: {},
      unlockPrice: 0, 
      revenueShare: {}
    }

    let response = (await (await fetch(testURL+'assets/get_signature', {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(uploadReq)
    })).json());

    console.log("Response: \n", response)

    let form = new FormData();
    form.append('file', fs.createReadStream('tests/files/GrassToSnow-1.jpg'));
    form.append('params', response.params),
    form.append('signature', response.signature)

    
    let transloadit_response = await (await fetch('https://api2.transloadit.com/assemblies', {
      method: 'post',
      headers: form.getHeaders(),
      body: form
    })).json()
    console.log(transloadit_response);
    
    console.log("\x1b[32m%s\x1b[0m", "RAN: Test Fetch Preflight")
  } catch (E) {
    console.error(E);
  }
}