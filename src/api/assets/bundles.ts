import { Asset } from "../../interfaces/IAsset";
import { Bundle, BundleAsset, GetBundle, REQ_Bundle_Create, REQ_Bundle_Update } from "../../interfaces/IBundle";
import { searchAsset } from "../../lib/assets";
import { getCreatorByID, isMemberOfCreatorPage } from "../../lib/creator";
import { getUserByID } from "../../lib/user";
import { search } from "../common/elastic";
import { newHandler } from "../common/handlers";
import { idgen } from "../common/nanoid";
import * as db from '../common/postgres';
import { transformAsset } from "./asset";

export const bundle_create = newHandler({
  requireUser: true,
  takesJSON: true,
}, async ({user, json}) => {
  let newBundleInfo: REQ_Bundle_Create = <REQ_Bundle_Create> json;
  if(newBundleInfo.creator_id && !(await isMemberOfCreatorPage(newBundleInfo.creator_id, user.id))){
    //check if the user actually has permissions to do things as that creator
    return {
      status: 401,
      body: {error: "User doesn't have permissions to create a bundle on behalf of the creator specified."}
    }
  }
  
  let newBundle: Bundle = {
    id: idgen(),
    name: newBundleInfo.name,
    public: newBundleInfo.public,
    description: newBundleInfo.description,
    creator_id: newBundleInfo.creator_id ? newBundleInfo.creator_id : null,
    user_id: newBundleInfo.creator_id ? null : user.id
  }

  await db.insertObj(process.env.DB_BUNDLE_INFO, newBundle)
  await search.index({
    index: process.env.INDEX_BUNDLEINFO,
    id: newBundle.id,
    body: newBundle
  })

  if(newBundleInfo.added_assets){
    for (let assetID of newBundleInfo.added_assets){
      let newBundleAsset:BundleAsset = {
        id: newBundle.id,
        asset_id: assetID,
        time_added: new Date()
      }
  
      await db.insertObj(process.env.DB_BUNDLE_ASSETS, newBundleAsset)
    }
  }

  return {
    status: 201,
    body: {bundle_id: newBundle.id}
  }
})

export const bundle_update = newHandler({
  requireUser: true,
  takesJSON: true,
  requireBundle: true
}, async ({user, json, bundle}) => {
  //check if the user/creator is actually owner of the bundle
  let reqBundleUpdate: REQ_Bundle_Update = <REQ_Bundle_Update> json;
  
  //if creatorID is passed in, check that the user actually has permissions to pass it in
  if(reqBundleUpdate.creator_id && !isMemberOfCreatorPage(reqBundleUpdate.creator_id, user.id)){
    //check if the user actually has permissions to do things as that creator
    return {
      status: 401,
      body: {error: "User doesn't have permissions to create a bundle on behalf of the creator specified."}
    }
  }

  //check that the bundle can be editted by the user/creator
  if(
    (reqBundleUpdate.creator_id && bundle.creator_id != reqBundleUpdate.creator_id) ||
    (user.id != bundle.user_id)
    )
  {
    return {
      status: 401,
      body: {error: "User/Creator doesn't have permission to edit this bundle"}
    }    
  } 

  //update the bundle
  let updates: Record<string, any> = {};
  if(reqBundleUpdate.name){
    updates['name'] = reqBundleUpdate.name;
    bundle.name = reqBundleUpdate.name;
  }
  if(reqBundleUpdate.description){
    updates['description'] = reqBundleUpdate.description;
    bundle.description = reqBundleUpdate.description;
  }
  if(Object.keys(reqBundleUpdate).includes('public')){
    updates['public'] = reqBundleUpdate.public;
    bundle.public = reqBundleUpdate.public;
  }

  await db.updateObj(process.env.DB_BUNDLE_INFO, bundle.id, updates);

  await search.update({
    index: process.env.INDEX_BUNDLEINFO,
    id: bundle.id,
    body: {
      doc: bundle
    }
  })

  if(reqBundleUpdate.removed_assets){
    //update the removed assets
    for(let assetID of reqBundleUpdate.removed_assets){
      await db.query(`DELETE FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id = ? AND asset_id = ?`, [bundle.id, assetID])
    }
  }

  if(reqBundleUpdate.added_assets){
    //update the added asses
    for (let assetID of reqBundleUpdate.added_assets){
      let newBundleAsset:BundleAsset = {
        id: bundle.id,
        asset_id: assetID,
        time_added: new Date()
      }

      await db.insertObj(process.env.DB_BUNDLE_ASSETS, newBundleAsset)
    }
  }

  return {
    status: 200,
    body: {success:true}
  }
})

export const bundle_get = newHandler({
  requireBundle: true
}, async ({bundle}) => {
  let bundleAssets: Asset[];
  let bundleAssetIDs = (await db.query(`SELECT * FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id= ?`, [bundle.id])).map((record) => {
    let bundleAsset:BundleAsset = <BundleAsset> record;
    return bundleAsset.asset_id;
  })

  for(let id of bundleAssetIDs) {
    bundleAssets.push(await transformAsset(await searchAsset(id)));
  }

  let bOwnerName = "";
  if(bundle.creator_id){
    bOwnerName = (await getCreatorByID(bundle.creator_id)).name
  } else if (bundle.user_id){
    bOwnerName = (await getUserByID(bundle.user_id)).username
  }

  let returnedBundle: GetBundle = {
    ...bundle,
    owner_name: bOwnerName,
    assets: bundleAssets
  }

  return {
    status: 200,
    body: returnedBundle
  }
})

export const bundle_delete = newHandler({
  requireUser: true,
  requireBundle: true,
  takesJSON: true
}, async ({user, bundle, json}) => {
  //check if user has permission to delete bundle
  //if creator id is passed in the json, check if the user has permissions on the creator
    // and if creator has permission to delete bundle
  //if creatorID is passed in, check that the user actually has permissions to pass it in
  if(json.creator_id && !isMemberOfCreatorPage(json.creator_id, user.id)){
    //check if the user actually has permissions to do things as that creator
    return {
      status: 401,
      body: {error: "User doesn't have permissions to create a bundle on behalf of the creator specified."}
    }
  }
  //check that the bundle can be editted by the user/creator
  if(
    (json.creator_id && bundle.creator_id != json.creator_id) ||
    (user.id != bundle.user_id)
    )
  {
    return {
      status: 403,
      body: {error: "User/Creator doesn't have permission to edit this bundle"}
    }    
  }
  
  //delete from Postgres
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id = ?`, [bundle.id])
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_INFO} WHERE id = ?`, [bundle.id])
  //delete from Elastic  
  await search.delete({
    index: process.env.INDEX_BUNDLEINFO,
    id: bundle.id
  })

  return {
    status: 200,
    body: {
      success: true
    }
  }
})


//export const bundle_query
