import { APIGatewayProxyHandler } from 'aws-lambda';
import { search } from '../common/elastic';
import { Asset, image_file_resolutions, REQ_Query } from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import { dyn } from '../common/database';
import {newResponse} from "../common/response";
//import { dyn } from '../common/database';
//import { User } from '../../interfaces/IUser';

function transformAsset (asset : Asset) : Asset {
  asset.creatorName = asset.creatorID; //TODO change to above code when we have users
  asset.previewLink = b2.GetURL('watermarked', asset);
  asset.thumbnail =  b2.GetURL('thumbnail', asset);
  return asset
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
      let doc;
      try{
        doc = await search.get({
          index: process.env.INDEX_ASSETDB,
          id: queryObj['id']
        })
      } catch (e) {
        // Doc doesn't exist
        response.body = JSON.stringify({error: `${queryObj['id']} doesn't exist in Index`});
        throw new Error(`${queryObj['id']} doesn't exist in Index`);
      }
      let FrontEndAsset:Asset = doc.body._source;
      /*
      FrontEndAsset.creatorName = (<User>(await dyn.get({
        TableName: process.env.NAME_USERSDB,
        Key: {
          id: FrontEndAsset.creatorID
        }
      }).promise()).Item).name;
      */
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
            key: val
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
        sort: queryObj['sort'] ? [{
          [queryObj['sort']] : queryObj['sort_type']
        }] : [{
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
    let doc;
    try{
      doc = await search.get({
        index: process.env.INDEX_ASSETDB,
        id: _evt.queryStringParameters.id
      })
    } catch (e){
      response.body = JSON.stringify({error:`Asset ${_evt.queryStringParameters.id} not found`})
      throw new Error(`Asset ${_evt.queryStringParameters.id} not found`)
    }
    let asset:Asset = doc.body._source;
    let link = 'ERROR_FETCHING_LINK';
    if(asset.fileType == "IMAGE"){
      link = b2.GetURL(<image_file_resolutions>_evt.queryStringParameters.type, asset);
      response.body=JSON.stringify({url: link});
    }
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
      let doc:any;
      try{
        doc = await search.get({
          index: process.env.INDEX_ASSETDB,
          id: reqAsset['id']
        })
      } catch (e) {
        // Doc doesn't exist
        response.body = JSON.stringify({error: `${reqAsset['id']} doesn't exist in Index`});
        throw new Error(`${reqAsset['id']} doesn't exist in Index`);
      }
      let original:Asset = doc.body._source;

      //validate stuff
      //TODO Validate Tags actually exist
      //TODO Validate that RevenueShare creatorIDs actually exist
      //TODO Validate Category actually exists
      //TODO Validate Visibility exists
      //TODO Validate Collection ID
      //TODO Validate unlockPrice is positive

      original.visibility = reqAsset.visibility ? reqAsset.visibility : original.visibility;
      original.name = reqAsset.name ? reqAsset.name : original.name;
      original.description = reqAsset.description ? reqAsset.description : original.description;
      original.collectionID = reqAsset.collectionID ? reqAsset.collectionID : original.collectionID;
      original.category = reqAsset.category ? reqAsset.category : original.category;
      original.tags = reqAsset.tags ? reqAsset.tags : original.tags;
      original.unlockPrice = reqAsset.unlockPrice ? reqAsset.unlockPrice : original.unlockPrice;
      original.revenueShare = reqAsset.revenueShare ? reqAsset.revenueShare : original.revenueShare;

      console.log("Updated Asset: ", original)
      // Update Dyn
      await dyn.update({
        TableName: process.env.NAME_ASSETDB,
        Key: {
          id: original.id,
          uploaded: original.uploaded
        },
        UpdateExpression: "set visibility = :v, #name = :n, description = :d, collectionID = :cID, category = :cat, tags = :t, unlockPrice = :uP",
        ExpressionAttributeNames: {
          "#name": "name"
        },
        ExpressionAttributeValues: {
          ":v": original.visibility,
          ":n": original.name,
          ":d": original.description,
          ":cID": original.collectionID,
          ":cat": original.category,
          ":t": original.tags,
          ":uP": original.unlockPrice
        }
      }).promise();

      // Update ES
      await search.update({
        index: process.env.INDEX_ASSETDB,
        id: original.id,
        body: {
          doc: original
        }
      });
    }

    response.statusCode = 200;
    response.body = JSON.stringify({success: "Assets Updated"})
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
