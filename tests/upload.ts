import * as fs from 'fs';
import fetch from 'node-fetch';
import { REQ_Get_Signature } from '../src/interfaces/IAsset';
import {testURL} from './test'

export async function test_fetch_preflight() {
  try{
    //File paths are relative to
    //let map = fs.readFileSync("tests/files/Mountain_Dig_Site.png");
    //console.log(map);

    let uploadReq:REQ_Get_Signature = {
      "user": "test-user-01",
      "file": "Mountain_Dig_Site.png",
      "asset_data": {},
    }

    let signature = (await (await fetch(testURL+'assets/get_signature', {
      method: "GET",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(uploadReq)
    })).json()).signature;

    console.log("Signature: %s", signature);

    console.log("\x1b[32m%s\x1b[0m", "PASSING: Test Fetch Preflight")
  } catch (E) {
    console.error(E);
  }
}