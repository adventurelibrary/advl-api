import fetch from "node-fetch";
import { testURL } from "./constants";

query_asset_test();
export async function query_asset_test(){
  await get_asset();
}

async function get_asset(){
  let assetID = 'KjQB1Q8IWmpKvoGe9XXhtF8Ks9uagzqO'
  try{
    let response = (await (await fetch(testURL+'assets?id='+assetID, {
      method: 'get'
    })).json())
    console.debug("Asset: \n", response)
    console.log("\x1b[32m%s\x1b[0m", "RAN: Get Asset")
  } catch (e){
    console.error(e);
  }
}