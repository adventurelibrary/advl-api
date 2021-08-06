import {APIGatewayProxyEventQueryStringParameters, APIGatewayProxyHandler} from 'aws-lambda';
import {search} from '../common/elastic';
import {Asset, Category, image_file_resolutions, REQ_Query} from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import {errorResponse, newResponse} from "../common/response";
import {
  deleteAsset,
  searchAsset,
  updateAssetAndIndex,
  validateAssetQuery,
  verifyUserHasAssetsAccess
} from "../../lib/assets";
import {HandlerContext, HandlerResult, newHandler} from "../common/handlers";
import {APIError} from "../../lib/errors";
import {getUserCreatorIds} from "../../lib/creator";
import {getEventUser} from "../common/events";
import * as db from '../common/postgres';

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
}, async ({event: _evt}) => {
  let params;

  const queryObj = getEvtQuery(_evt.queryStringParameters)

  // If ID then just do a GET on the ID, search params don't matter
  if(queryObj.id) {
    const FrontEndAsset:Asset = await searchAsset(queryObj.id);
    return {
      status: 200,
      body: transformAsset(FrontEndAsset)
    }
  }

  // Multiple ids
  if(queryObj.ids && queryObj.ids.length) {
    let FEAssets:Asset[] = [];
    for(let id of queryObj.ids){
      let FrontEndAsset:Asset;
      FrontEndAsset = await searchAsset(id);
      FEAssets.push(transformAsset(FrontEndAsset));
    }
    return {
      status: 200,
      body: FEAssets
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
      from: queryObj['from'] ? queryObj['from'] : 0,
      size: queryObj['size'] ? queryObj['size'] : 10,
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
  let searchResults = await search.search(params)

  let FrontEndAssets:Asset[] = searchResults.body.hits.hits.map((doc:any) => {
    doc._source = transformAsset(doc._source)
    return doc._source
  })
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
  includeUser: true, // For later, we can check the user passed in
  requireAsset: true
}, async ({event, asset}: HandlerContext) => {
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
