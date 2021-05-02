import {APIGatewayProxyEventQueryStringParameters, APIGatewayProxyHandler} from 'aws-lambda';
import { search } from '../common/elastic';
import { Asset, image_file_resolutions, REQ_Query } from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import {errorResponse, newResponse} from "../common/response";
import { getAsset, updateAsset, validateAssetQuery} from "../../lib/assets";
import { User } from '../../interfaces/IUser';
import { getUserByToken, isAdmin } from '../../lib/user';

function transformAsset (asset : Asset) : Asset {
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
  const queryObj:REQ_Query = {};

  if(eventParams){
    for(let key of Object.keys(eventParams)){
      queryObj[key] = eventParams[key]
    }
    queryObj.size = parseInt(eventParams.size)
  } // null means that we just use an empty queryObj

  // Certain fields are comma delimited, which we override here
  queryObj.tags = getCSVParam(eventParams, 'tags')
  queryObj.categories = getCSVParam(eventParams, 'categories')
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
      let FrontEndAsset:Asset = await getAsset(queryObj.id);
      response.body = JSON.stringify(transformAsset(FrontEndAsset));
      response.statusCode = 200;
      return response;
    }

    // Multiple ids
    if(queryObj.ids && queryObj.ids.length) {
      let FEAssets:Asset[] = [];
      for(let id of queryObj.ids){
        let FrontEndAsset:Asset = await getAsset(id);
        FEAssets.push(transformAsset(FrontEndAsset));
      }
      response.body = JSON.stringify(FEAssets);
      response.statusCode = 200;
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
        "must": [        ],
        "filter": [
          {
            "match": {
              "visibility" : "PUBLIC"
            }
          }
        ]
      }
    }

    if(queryObj['visibility'] == 'all'){
      _query.bool.filter = [];
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
      /*
      doc._source.creatorName = (<User>(await dyn.get({
        TableName: process.env.NAME_USERSDB,
        Key: {
          id: doc._source.creatorID
        }
      }).promise()).Item).name;
      */
      doc._source = transformAsset(doc._source)
      return doc._source
    })

    response.body = JSON.stringify({
      assets: FrontEndAssets,
      total: searchResults.body.hits.total.value,
      params: params,
    });
    response.statusCode = 200;
    return response;
  } catch (E){
    const response = errorResponse(_evt, E)
    response.body = JSON.stringify({
      error: E,
      params: params
    })
    return response
  }
}

/**
 * TODO
 * Only authorized users should be able to fetch certain types of files 
 */
export const asset_download_link: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()

  try{
    let asset:Asset = await getAsset(_evt.queryStringParameters.id)
    let link = 'ERROR_FETCHING_LINK';
    if(asset.file_type == "IMAGE"){
      link = b2.GetURL(<image_file_resolutions>_evt.queryStringParameters.type, asset);
      response.body=JSON.stringify({url: link});
    }
    response.statusCode = 200;
    return response;
  } catch (E){
    return errorResponse(_evt, E)
  }
}


export const update_asset: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()
  try{
    let user: User = await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
    if(!user){
      throw new Error("You must be logged in to upload a new asset");
    }
    
    //Specifically ANY so only the relevant keys are passed in
    let reqAssets:any[] = JSON.parse(_evt.body);
    for (let i = 0; i < reqAssets.length; i++) {
      const reqAsset = reqAssets[i]
      const id = reqAsset.id
      if (!id) {
        throw new Error(`No id provided at index ${i}`)
      }
      const asset:Asset = await getAsset(id);
      
      if(user.username != asset.creator_name || !isAdmin(user.id)){
        throw new Error("User doesn't have permissions to edit this asset");
      }

      await updateAsset(reqAsset, asset)
    }

    response.statusCode = 200;
    response.body = JSON.stringify({success: "Assets Updated"})
    return response;
  } catch (E){
    return errorResponse(_evt, E)
  }
}
