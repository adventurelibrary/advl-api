import {
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyHandler
} from 'aws-lambda';
import { search } from '../common/elastic';
import {Asset, Category, image_file_resolutions, REQ_Query} from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import {errorResponse, newResponse} from "../common/response";
import {
  searchAsset,
  updateAssetAndIndex,
  validateAssetQuery,
  verifyUserHasAssetAccess
} from "../../lib/assets";
import {HandlerContext, HandlerResult, newHandler} from "../common/handlers";
import {APIError} from "../../lib/errors";
import {getUserCreatorIds } from "../../lib/creator";
import {getEventUser} from "../common/events";
import * as db from '../common/postgres';
import {query} from "../common/postgres";

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

export const query_assets: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();
  let params;

  try{
    const queryObj = getEvtQuery(_evt.queryStringParameters)

    // If ID then just do a GET on the ID, search params don't matter
    if(queryObj.id) {
      let FrontEndAsset:Asset;
      try{
        FrontEndAsset = await searchAsset(queryObj.id);
      } catch (e) {
        response.statusCode = 400;
        response.body = JSON.stringify({error: `ID (${queryObj.id}) doesn't exist in Index`})
        db.clientRelease();
        return response;
      }
      response.body = JSON.stringify(transformAsset(FrontEndAsset));
      response.statusCode = 200;
      db.clientRelease();
      return response;
    }

    // Multiple ids
    if(queryObj.ids && queryObj.ids.length) {
      let FEAssets:Asset[] = [];
      for(let id of queryObj.ids){
        let FrontEndAsset:Asset;
        try{
          FrontEndAsset = await searchAsset(id);
        } catch(e){
          response.statusCode = 400;
          response.body = JSON.stringify({error: `ID (${id}) not found in Index`});
          db.clientRelease();
          return response;
        }

        FEAssets.push(transformAsset(FrontEndAsset));
      }
      response.body = JSON.stringify(FEAssets);
      response.statusCode = 200;
      db.clientRelease();
      return response;
    }

    // Will check for things like invalid tags or negative limits
    try {
      validateAssetQuery(queryObj)
    } catch (ex) {
      return errorResponse(_evt, ex)
    }

    const text = queryObj.text

    let _query : any = {
      "bool": {
        "must": [],
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
        response.body = JSON.stringify({
          total: 0,
          assets: []
        })
        response.statusCode = 200
        db.clientRelease();
        return response
      }
      _query.bool.should = creatorIds.map((id) => {
        return {
          match: {
            creator_id: id
          }
        }
      })
      _query.bool.minimum_should_match = 1
      queryObj.sort = 'uploaded'
      queryObj.sort_type = 'desc'
    }


    // Performs a text search on 'name' and 'description' and sorts by score
    // Fuzzy search means that "froze" will match "Frozen" and "kings" will match "King"
    if (text) {
      _query.bool.must.push({
        "dis_max": {
          "tie_breaker": 0.9,
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

    console.log("SEARCH PARAMS: ", JSON.stringify(params));
    let searchResults = await search.search(params)

    let FrontEndAssets:Asset[] = searchResults.body.hits.hits.map((doc:any) => {
      doc._source = transformAsset(doc._source)
      return doc._source
    })

    response.body = JSON.stringify({
      assets: FrontEndAssets,
      total: searchResults.body.hits.total.value,
      params: params,
    });
    response.statusCode = 200;
    db.clientRelease();
    return response;
  } catch (E){
    const response = errorResponse(_evt, E)
    response.body = JSON.stringify({
      error: E,
      params: params
    })
    db.clientRelease();
    return response
  }
}


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
  await verifyUserHasAssetAccess(user, assetIds)

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
