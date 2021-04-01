import { APIGatewayProxyHandler } from 'aws-lambda';
import { search } from '../common/elastic';
import { Asset, image_file_resolutions, REQ_Query } from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
//import { dyn } from '../common/database';
//import { User } from '../../interfaces/IUser';

export const query_assets: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let queryObj:REQ_Query = {};
    // Create lists from comma deliminted query string parameters
    for(let key of Object.keys(_evt.queryStringParameters)){
      let val = _evt.queryStringParameters[key].split(",")
      queryObj[key] = val.length == 1 ? val[0] : val 
    }

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
      FrontEndAsset.creatorName = FrontEndAsset.creatorID; //TODO change to above code when we have users
      FrontEndAsset.previewLink = await b2.GetURL('watermarked', FrontEndAsset);
      FrontEndAsset.thumbnail = await b2.GetURL('thumbnail', FrontEndAsset);
      //FrontEndAsset.previewLink = `https://f000.backblazeb2.com/file/advl-watermarked/${FrontEndAsset.creatorID}/${FrontEndAsset.id}.webp`
      //FrontEndAsset.thumbnail = `https://f000.backblazeb2.com/file/advl-watermarked/${FrontEndAsset.creatorID}/${FrontEndAsset.id}.webp`    
      response.body = JSON.stringify(FrontEndAsset);
      response.statusCode = 200;
      return response;  
    }

    let _query = {
      "dis_max": {
        "queries": [],
        "tie_breaker": 0.7
      }
    }
    for(let key of Object.keys(queryObj)){
      //id key is already taken care of in the above code block
      let exclude_attributes = ['sort', 'sort_type', 'from', 'size', 'text']
      if(!exclude_attributes.includes(key)){
        _query.dis_max.queries.push({
          "match": {
            key: queryObj[key]
          }
        })
      } else if(key == 'text'){
        _query.dis_max.queries.push({
          "match": {
            'name': queryObj[key]
          }
        })
        _query.dis_max.queries.push({
          "match": {
            'description': queryObj[key]
          }
        })
      }
    }
    
    if(_query.dis_max.queries.length == 0){
      throw new Error("Query string was empty");
    }

    // Query doesn't include ID
    let searchResults = await search.search({
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
    })

    let FrontEndAssets:Asset[] = searchResults.body.hits.hits.map((doc:any) => {
      /*
      doc._source.creatorName = (<User>(await dyn.get({
        TableName: process.env.NAME_USERSDB,
        Key: {
          id: doc._source.creatorID
        }
      }).promise()).Item).name;
      */
      doc._source.creatorName = doc._source.creatorID; //TODO change to above code when we have users
      doc._source.previewLink = b2.GetURL('watermarked', doc._source);
      doc._source.thumbnail = b2.GetURL('thumbnail', doc._source);
      //doc._source.previewLink = `https://f000.backblazeb2.com/file/advl-watermarked/${doc._source.creatorID}/${doc._source.id}.webp`
      //doc._source.thumbnail = `https://f000.backblazeb2.com/file/advl-watermarked/${doc._source.creatorID}/${doc._source.id}.webp`    
      return doc._source
    })
    response.body = JSON.stringify(FrontEndAssets);
    response.statusCode = 200;
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const asset_download_link: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

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
