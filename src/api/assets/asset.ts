import {APIGatewayProxyHandler} from 'aws-lambda';
import {Asset, image_file_resolutions} from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import {
  deleteAsset,
  getUserAssetUnlock, getUserAssetUnlocks,
  setAssetsUnlockedForUser, setAssetUnlockedForUser,
  updateAssetAndIndex,
  userPurchaseAssetUnlock,
  validateAssetQuery,
  verifyUserHasAssetsAccess,
  verifyUserHasUnlockedAsset,
} from "../../lib/assets";
import {HandlerContext, HandlerResult, newHandler} from "../common/handlers";
import {APIError} from "../../lib/errors";
import * as db from '../common/postgres';
import {ErrAssetAlreadyUnlocked, ErrDownloadTypeMissing, ErrNotEnoughCoins} from "../../constants/errors"
import {getEntityNumCoins} from "../../lib/coins"
import {evtQueryToAssetSearchOptions, getEventQueryFromSize, searchAssets} from "../../lib/asset-search";

/**
 * Takes a DB asset and converts it to be more friendly for Front End
 * @param asset
 * @returns
 */
export function transformAsset (asset : Asset) : Asset {
  //asset.previewLink = b2.GetURL('optimized', asset);
  //asset.thumbnail =  b2.GetURL('optimized', asset);
  asset.previewLink = b2.GetURL('watermarked', asset);
  asset.thumbnail =  b2.GetURL('thumbnail', asset);
  return asset
}

/**
 * Public route to get a specific asset
 * TODO: Use creator slug and asset slug instead of slug ID for this route
 *  This is so our routes can be adventurelibrary.art/john/mountain-pass
 */
export const asset_get : APIGatewayProxyHandler = newHandler({
  includeUser: true,
  requireAsset: true
}, async ({user, asset}) => {
  if (!asset) {
    console.log('No asset found in asset_get handler')
    return {
      status: 404
    }
  }

  // This properly builds the thumbnail and preview links
  asset = transformAsset(asset)

  // This sets the `unlocked` bool value for logged in user
  asset = await setAssetUnlockedForUser(asset, user)
  return {
    status: 200,
    body: asset,
  }
})

/**
 * The big query function used by the site's search bar
 */
export const query_assets: APIGatewayProxyHandler = newHandler({
  includeUser: true
}, async ({event: _evt, user}) => {
  const queryObj = evtQueryToAssetSearchOptions(_evt.queryStringParameters)

  // Will check for things like invalid tags or negative limits
  validateAssetQuery(queryObj)
  const searchResult = await searchAssets(queryObj)

  // Change the `unlock` of each asset, based on the logged in user
  searchResult.assets = await setAssetsUnlockedForUser(searchResult.assets, user)

  const body : any = {
    assets: searchResult.assets,
    total: searchResult.total,
  }

  // If the search has also returned the final params it sent to ElastiSearch, then we will
  // return that in our body response as well
  // This is just for debugging
  if (searchResult.params) {
    body.params = searchResult.params
  }

  return {
    body: body,
    status: 200
  }
})

/**
 * Returns the current logged in user's unlocked assets
 * Does not allow for any actual searching just yet,
 */
export const assets_unlocked = newHandler({
  requireUser: true,
}, async ({user, event}) => {
  const {from, size} = getEventQueryFromSize(event.queryStringParameters)
  const uls = await getUserAssetUnlocks(user.id, from, size)
  if (uls.length === 0) {
    return {
      status: 200,
      body: {
        assets: [],
        total: 0
      }
    }
  }
  const assetIds = uls.map(ul => ul.asset_id)
  const searchResult = await searchAssets({
    assetIds: assetIds,
    size: size
  })
  searchResult.assets = searchResult.assets.map((asset) => {
    asset.unlocked = true
    return asset
  })

  // TODO: Sort them into the same order as the unlocks

  return {
    status: 200,
    body: searchResult
  }
})

/**
 * Returns the URL for the image to be given to the frontend
 * The frontend can then open a new window or redirect as needed
 */
export const asset_download_link = newHandler({
  requireUser: true,
  requireAsset: true
}, async ({event, asset, user}: HandlerContext) => {
  if (!event.queryStringParameters || !event.queryStringParameters.type) {
    throw ErrDownloadTypeMissing
  }

  // Will throw an error if the current logged in user has not unlocked
  // this asset
  await verifyUserHasUnlockedAsset(user.id, asset.id)

  let link = 'ERROR_FETCHING_LINK';
  if(asset.filetype == "IMAGE"){
    link = b2.GetURL(<image_file_resolutions>event.queryStringParameters.type, asset);
  } else {
    throw new Error(`ERROR_FETCHING_LINK`)
  }
  return {
    status: 200,
    body: {
      url: link
    }
  }
})

/**
 * For admins/creators to get an asset's data
 * Not for public consumption
 */
export const asset_manage_get : APIGatewayProxyHandler = newHandler({
  requireAsset: true,
  assetSource: 'database',
  requireAssetPermission: true
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
  return {
    status: 200,
    body: transformAsset(ctx.asset)
  }
})

export const asset_manage_delete : APIGatewayProxyHandler = newHandler({
  requireAssetPermission: true,
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
  // Result will be either 'deleted' or 'hidden', depending on if the asset
  // was purchased ('hidden') or not ('deleted')
  const result = await deleteAsset(ctx.asset)
  return {
    status: 200,
    body: {
      result: result
    }
  }
})

// Takes in an array of asset data as the body and updates each of them
export const assets_manage_update : APIGatewayProxyHandler = newHandler({
  requireUser: true,
  takesJSON: true
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
  const {user, json} = ctx
  //Specifically ANY so only the relevant keys are passed in
  let reqAssets:any[] = json
  if (!Array.isArray(reqAssets)) {
    throw new APIError({
      status: 400,
      message: 'Body must be an array of assets'
    })
  }

  const assetIds = reqAssets.map(asset => asset.id)
  await verifyUserHasAssetsAccess(user, assetIds)

  for (let i = 0; i < reqAssets.length; i++) {
    const reqAsset = reqAssets[i]
    const id = reqAsset.id
    if (!id) {
      throw new Error(`No id provided at index ${i}`)
    }

    const asset = await db.getObj(process.env.DB_ASSETS, id);
    await updateAssetAndIndex(asset, reqAsset)
  }
  return {
    status: 204,
  }
})

/**
 * A user is attempting to unlock an asset with coins so that they can download it
 */
export const asset_unlock = newHandler({
  requireUser: true,
  requireAsset: true
}, async ({user, asset}) => {
  // First we make sure that this user hasn't already unlocked this asset
  const unlock = await getUserAssetUnlock(user.id, asset.id)
  if (unlock) {
    throw ErrAssetAlreadyUnlocked
  }

  // Next we make sure they have enough coins to unlock this asset
  const numCoins = await getEntityNumCoins(user.id)
  if (numCoins < asset.unlock_price) {
    throw ErrNotEnoughCoins
  }

  // Create the unlock and add new entity_coins entries
  await userPurchaseAssetUnlock(user.id, asset)

  return {
    status: 200,
    body: {
      numCoins: numCoins - asset.unlock_price
    }
  }
})
