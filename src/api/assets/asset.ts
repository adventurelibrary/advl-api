import { APIGatewayProxyHandler } from 'aws-lambda';
import { search } from '../common/elastic';
import { Asset, image_file_resolutions, REQ_Query } from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import { dyn } from '../common/database';
import {newResponse} from "../common/response";
import {indexAssetSearch, getAsset, updateAsset} from "../../lib/assets";
//import { dyn } from '../common/database';
//import { User } from '../../interfaces/IUser';

function transformAsset (asset : Asset) : Asset {
  asset.creatorName = asset.creatorID; //TODO change to above code when we have users
  asset.previewLink = b2.GetURL('watermarked', asset);
  asset.thumbnail =  b2.GetURL('thumbnail', asset);
  return asset
}

export const sync_assets : APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()
  let params : any = {
    TableName: process.env.NAME_ASSETDB
  };

  let scanResults = [];
  let items;

  try {
    do {
      items = await dyn.scan(params).promise();
      items.Items.forEach((item) => scanResults.push(item));
      params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");
  } catch (E) {
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    response.body = JSON.stringify({
      error: E.toString()
    })
    return response;
  }

  for (let i = 0; i < scanResults.length; i++) {
    console.log('Syncing', scanResults[i].id, scanResults[i])
    await indexAssetSearch(scanResults[i])
  }

  response.statusCode = 200
  response.body = JSON.stringify({
    message: `Synced ${scanResults.length} db items to search`
  })

  return response
}

export const query_assets: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()

  try{
    let queryObj:REQ_Query = {};

    if(_evt.queryStringParameters){
      // Create lists from comma deliminted query string parameters
      for(let key of Object.keys(_evt.queryStringParameters)){
        let val = _evt.queryStringParameters[key].split(",")
        queryObj[key] = val.length == 1 ? val[0] : val
      }
    } // null means that we just use an empty queryObj

    // If ID then just do a GET on the ID, search params don't matter
    if(queryObj['id']){
      let FrontEndAsset:Asset = await getAsset(_evt.queryStringParameters.id)
      FrontEndAsset = transformAsset(FrontEndAsset)
      //FrontEndAsset.previewLink = `https://f000.backblazeb2.com/file/advl-watermarked/${FrontEndAsset.creatorID}/${FrontEndAsset.id}.webp`
      //FrontEndAsset.thumbnail = `https://f000.backblazeb2.com/file/advl-watermarked/${FrontEndAsset.creatorID}/${FrontEndAsset.id}.webp`
      response.body = JSON.stringify(FrontEndAsset);
      response.statusCode = 200;
      return response;
    }

    let _query = {
      "bool": {
        "must": [
          {
            "dis_max": {
              "tie_breaker": 0.7,
              "queries": []
            }
          }
        ],
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

    let exclude_attributes = ['sort', 'sort_type', 'from', 'size', 'text', 'visibility']
    for(let key of Object.keys(queryObj)){
      const val = queryObj[key]
      //id key is already taken care of in the above code block
      if(!exclude_attributes.includes(key)){
        _query.bool.must[0].dis_max.queries.push({
          "match": {
            [key]: val
          }
        })
      } else if(key == 'text'){
        _query.bool.must[0].dis_max.queries.push({
          "match": {
            'name': val
          }
        })
        _query.bool.must[0].dis_max.queries.push({
          "match": {
            'description': val
          }
        })
      }
    }


    if(_query.bool.must[0].dis_max.queries.length == 0){
      //empty query string so match all
      _query.bool.must[0].dis_max.queries.push({
        "match_all": {}
      })
    }


    // Query doesn't include ID
    let params = {
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
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const asset_download_link: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()

  try{
    let asset:Asset = await getAsset(_evt.queryStringParameters.id)
    let link = 'ERROR_FETCHING_LINK';
    if(asset.fileType == "IMAGE"){
      link = b2.GetURL(<image_file_resolutions>_evt.queryStringParameters.type, asset);
      response.body=JSON.stringify({url: link});
    }
    response.statusCode = 200;
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const update_asset: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()
  try{
    //Specifically ANY so only the relevant keys are passed in
    let reqAssets:any[] = JSON.parse(_evt.body);
    for (let i = 0; i < reqAssets.length; i++) {
      const reqAsset = reqAssets[i]
      const id = reqAsset.id
      if (!id) {
        throw new Error(`No id provided at index ${i}`)
      }
      await updateAsset(id, reqAsset)
    }

    response.statusCode = 200;
    response.body = JSON.stringify({success: "Assets Updated"})
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
