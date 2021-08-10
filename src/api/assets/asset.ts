import {APIGatewayProxyEventQueryStringParameters, APIGatewayProxyHandler} from 'aws-lambda';
import {search} from '../common/elastic';
import {Asset, Category, image_file_resolutions, REQ_Query} from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import {
  deleteAsset,
  searchAsset,
  setAssetsUnlockedForUser,
  setAssetUnlockedForUser,
  updateAssetAndIndex,
  validateAssetQuery,
  verifyUserHasAssetAccess,
  verifyUserHasAssetsAccess,
  getUserAssetUnlock,
  userPurchaseAssetUnlock, verifyUserHasUnlockedAsset, getUserAssetUnlocks,
} from "../../lib/assets";
import {HandlerContext, HandlerResult, newHandler} from "../common/handlers";
import {APIError} from "../../lib/errors";
import {getUserCreatorIds} from "../../lib/creator";
import {getEventUser} from "../common/events";
import * as db from '../common/postgres';
import {
  ErrNotEnoughCoins,
  ErrAssetAlreadyUnlocked,
  ErrNoAssetPermission,
  ErrDownloadTypeMissing
} from "../../constants/errors"
import {getEntityNumCoins} from "../../lib/coins"

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

function getCSVParam (params: APIGatewayProxyEventQueryStringParameters, key: string) : string[] {
  if (params && params[key]) {
    return params[key].indexOf(',') > 0 ? params[key].split(',') : [params[key]]
  }
  return []
}

// Converts the query string parameters that serverless has, into our custom type
// that we use to query assets
function getEvtQuery (eventParams: APIGatewayProxyEventQueryStringParameters) : REQ_Query {
  console.log(eventParams);
  const queryObj:REQ_Query = {};

  if(eventParams){
    for(let key of Object.keys(eventParams)){
      queryObj[key] = eventParams[key]
    }
    queryObj.size = parseInt(eventParams.size)
  } // null means that we just use an empty queryObj

  // Certain fields are comma delimited, which we override here
  queryObj.tags = getCSVParam(eventParams, 'tags')
  queryObj.categories = <Category[]>getCSVParam(eventParams, 'categories')
  //queryObj.categories = eventParams.category != "" ? <Category[]>eventParams.category.split(",") : [];
  queryObj.ids = getCSVParam(eventParams, 'ids')

  if (isNaN(queryObj.size) || queryObj.size <= 0) {
    queryObj.size = 10
  }

  return queryObj
}

export const query_assets: APIGatewayProxyHandler = newHandler({
  includeUser: true
}, async ({event: _evt, user}) => {
  let params;

  const queryObj = getEvtQuery(_evt.queryStringParameters)

  // If ID then just do a GET on the ID, search params don't matter
  if(queryObj.id) {
    let FrontEndAsset:Asset = await searchAsset(queryObj.id);

    // If this asset isn't public, then we need to ensure that this user has
    // the proper access
    if (FrontEndAsset.visibility !== 'PUBLIC') {
      try {
        await verifyUserHasAssetAccess(user, FrontEndAsset.id)
      } catch (ex) {
        // If they don't have permission we just throw a 404
        if (ex == ErrNoAssetPermission) {
          return {
            status: 404,
          }
        }
        throw ex
      }
    }

    FrontEndAsset = await setAssetUnlockedForUser(FrontEndAsset, user)
    return {
      status: 200,
      body: transformAsset(FrontEndAsset)
    }
  }

  let from = queryObj['from'] ? queryObj['from'] : 0
  let size = queryObj['size'] ? queryObj['size'] : 10

  let assetIds : string [] = []

  // Multiple ids provided by the query string
  if(queryObj.ids && queryObj.ids.length) {
    assetIds = queryObj.ids
  } else {
    // If the query contains ?unlocked, then we only return assets that have been unlocked
    // by the currently logged in user
    if (queryObj.hasOwnProperty('unlocked')) {
      if (!user) {
        throw new APIError({
          status: 401,
          message: 'You must be logged in to get unlocked assets'
        })
      }
      const uls = await getUserAssetUnlocks(user.id, from, size)
      assetIds = uls.map(ul => ul.asset_id)

      // We have to reset the skip here back to 0. We're skipping through the assets
      // in the query above, not in the ElasticSearch query.
      // We want to go like "hey postgres, give me 10 unlocks, and skip 30 of them"
      // and then go "hey elasticsearch, give me these 10 assets, don't skip any of them"
      from = 0
    }
  }

  // Will check for things like invalid tags or negative limits
  validateAssetQuery(queryObj)

  const text = queryObj.text

  let _query : any = {
    "bool": {
      "must": [{
        "match": {
          "deleted": false
        }
      }],
      "filter": [
        {
          "match": {
            "visibility" : "PUBLIC"
          }
        }
      ]
    }
  }

  if (assetIds.length) {
    _query.bool.must.push({
      ids: {
        values: assetIds
      }
    })
  }

  // TODO: Only admins and people getting their own assets should be able to remove the PUBLIC filter
  if(queryObj['visibility'] == 'all'){
    _query.bool.filter = [];
  }

  // For searching for assets that you have access to
  if(queryObj.hasOwnProperty('mine')) {
    const user = await getEventUser(_evt)
    const creatorIds = await getUserCreatorIds(user.id)
    if (!creatorIds.length) {
      return {
        body: {
          total: 0,
          assets: []
        },
        status: 200
      }
    }

    const creatorFilter = {
      bool: {
        minimum_should_match: 1,
        should: []
      }
    }

    creatorIds.forEach((id) => {
      creatorFilter.bool.should.push({
        match: {
          creator_id: id
        }
      })
    })
    _query.bool.filter.push(creatorFilter)
    //_query.bool.minimum_should_match = 1
    queryObj.sort = 'uploaded.raw'
    queryObj.sort_type = 'desc'
  }


  // Performs a text search on 'name' and 'description' and sorts by score
  // Fuzzy search means that "froze" will match "Frozen" and "kings" will match "King"
  if (text) {
    _query.bool.must.push({
      "dis_max": {
        "tie_breaker": 0.7,
        "queries": [
          {
            "fuzzy": {
              'name': text
            }
          },
          {
            "fuzzy": {
              'description': text
            }
          }
        ]
      }
    })
  }

  // Asset must match ALL provided tags
  // This the equivalent of ' AND 'Archer' IN asset.tags AND 'Barbarian' IN asset.tags
  if (queryObj.tags.length) {
    queryObj.tags.forEach((tag) => {
      _query.bool.must.push({
        "match": {
          "tags": tag
        }
      })
    })
  }

  // Asset must match ONE of the provided categories
  // This is the equivalent of " AND category IN ('maps', 'scenes')"
  if (queryObj.categories.length) {
    _query.bool.must.push({
      "terms": {
        "category": queryObj.categories
      }
    })
  }


  // Query doesn't include ID
  params = {
    index: process.env.INDEX_ASSETDB,
    body: {
      from: from,
      size: size,
      sort: queryObj['sort'] ?
        [{
          [queryObj['sort']] : queryObj['sort_type']
        }]
        :
        [{
          "_score": "desc"
        }],
      query: _query
    }
  }
  console.log('params', JSON.stringify(params, null, 2))
  let searchResults = await search.search(params)


  let FrontEndAssets:Asset[] = searchResults.body.hits.hits.map((doc:any) => {
    doc._source = transformAsset(doc._source)
    return doc._source
  })

  // Change the `unlock` of each asset, based on the logged in user
  FrontEndAssets = await setAssetsUnlockedForUser(FrontEndAssets, user)

  return {
    body: {
      assets: FrontEndAssets,
      total: searchResults.body.hits.total.value,
      params: params,
    },
    status: 200
  }
})

/**
 * TODO
 * Only authorized users should be able to fetch certain types of files
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

// Returns the asset directly from our database
export const get_asset : APIGatewayProxyHandler = newHandler({
  requireAsset: true
}, async (ctx : HandlerContext) : Promise<HandlerResult> => {
  return {
    status: 200,
    body: transformAsset(ctx.asset)
  }
})

export const delete_asset : APIGatewayProxyHandler = newHandler({
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
export const update_asset : APIGatewayProxyHandler = newHandler({
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
