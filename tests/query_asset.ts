import fetch from "node-fetch";
import { testURL } from "./constants";

query_asset_test();
export async function query_asset_test(){
  await get_asset();
  await search_asset();
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

//TODO: Should be much more comprehensive and include the full key set but I'm tired
async function search_asset(){
  let qString = 'text=Mountain'
  try{
    let response = (await (await fetch(testURL+'assets?'+qString, {
      method: 'get'
    })).json())
    console.debug("Assets: \n", response)
    console.log("\x1b[32m%s\x1b[0m", "RAN: Searcg Asset")
  } catch (e){
    console.error(e);
  }
}