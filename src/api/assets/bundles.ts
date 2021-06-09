import { Asset } from "../../interfaces/IAsset";
import { Bundle, BundleAsset, GetBundle, REQ_Bundle_Create, REQ_Bundle_Update } from "../../interfaces/IBundle";
import { searchAsset } from "../../lib/assets";
import { isMemberOfCreatorPage } from "../../lib/creator";
import { search } from "../common/elastic";
import { newHandler } from "../common/handlers";
import { idgen } from "../common/nanoid";
import * as db from '../common/postgres';
import { transformAsset } from "./asset";
import {User} from "../../interfaces/IUser";
import {APIError} from "../../lib/errors";

async function verifyUserIsCreatorMember (user: User, creatorId: string) {
  const isMember = await isMemberOfCreatorPage(creatorId, user.id)
  if (!isMember) {
    throw new APIError({
      status: 403,
      message: "User doesn't have permissions to create a bundle on behalf of the creator specified."
    })
  }
}

export const bundle_create = newHandler({
  requireUser: true,
  takesJSON: true,
}, async ({user, json}) => {
  let newBundleInfo: REQ_Bundle_Create = <REQ_Bundle_Create> json;
  if(newBundleInfo.creator_id){
    await verifyUserIsCreatorMember(user, newBundleInfo.creator_id)
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
  requireBundle: true,
  requireBundlePermission: true
}, async ({user, json, bundle}) => {
  //check if the user/creator is actually owner of the bundle
  let reqBundleUpdate: REQ_Bundle_Update = <REQ_Bundle_Update> json;

  //if creatorID is passed in, check that the user actually has permissions to pass it in
  if(reqBundleUpdate.creator_id){
    await verifyUserIsCreatorMember(user, reqBundleUpdate.creator_id)
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

  if (Object.keys(updates).length > 0) {
    await db.updateObj(process.env.DB_BUNDLE_INFO, bundle.id, updates);
  }

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
    status: 204,
  }
})

export const bundle_get = newHandler({
  requireBundle: true
}, async ({bundle}) => {
  return {
    status: 200,
    body: await buildFEBundleFromBundleInfo(bundle)
  }
})

export const bundle_delete = newHandler({
  requireUser: true,
  requireBundle: true,
  takesJSON: true,
  requireBundlePermission: true
}, async ({user, bundle}) => {
  await verifyUserIsCreatorMember(user, bundle.creator_id)

  //delete from Postgres
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id = ?`, [bundle.id])
  await db.query(`DELETE FROM ${process.env.DB_BUNDLE_INFO} WHERE id = ?`, [bundle.id])
  //delete from Elastic
  await search.delete({
    index: process.env.INDEX_BUNDLEINFO,
    id: bundle.id
  })

  return {
    status: 204
  }
})

async function buildFEBundleFromBundleInfo(bundle:Bundle){
  let bundleAssets: Asset[] = [];
  let bundleAssetIDs = (await db.query(`SELECT * FROM ${process.env.DB_BUNDLE_ASSETS} WHERE id= ?`, [bundle.id])).map((record) => {
    let bundleAsset:BundleAsset = <BundleAsset> record;
    return bundleAsset.asset_id;
  })

  for(let id of bundleAssetIDs) {
    bundleAssets.push(await transformAsset(await searchAsset(id)));
  }

  let returnedBundle: GetBundle = {
    ...bundle,
    assets: bundleAssets
  }

  return returnedBundle;
}

export const bundle_query = newHandler({}, async ({query}) => {
  const result = await searchBundles(query)

  return {
    status: 200,
    body: result
  }
})

export const bundles_mine = newHandler({
  requireUser: true
}, async ({query, user}) => {
  query.user_id = user.id
  const result = await searchBundles(query)

  return {
    status: 200,
    body: result
  }
})

async function searchBundles(query: any) {
  let _query: any = {}
  if (query.user_id) {
    _query = {
      "bool": {
        "must": [],
        "filter": [
          {
            "match": {
              "user_id": query.user_id
            }
          }
        ]
      }
    }
  }

  if (query.creator_id){
    _query = {
      "bool": {
        "must": [],
        "filter": [
          {
            "match": {
              "creator_id" : query.creator_id
            }
          }
        ]
      }
    }
  }

  if (query.text){
    //search by fuzzy text match of title or description
  }

  let results = await search.search({
    index: process.env.INDEX_BUNDLEINFO,
    body: {
      from: query.from ? query.from : 0,
      size: query.size ? query.size: 10,
      query: _query
    }
  })

  let FEBundles:GetBundle[] = [];

  for(let doc of results.body.hits.hits){
    FEBundles.push(doc._source)
    //FEBundles.push(await buildFEBundleFromBundleInfo(doc._source));
  }
  return {
    bundles: FEBundles,
    total: results.body.hits.total.value
  }
}
