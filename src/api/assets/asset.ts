import {
  APIGatewayEventDefaultAuthorizerContext,
  APIGatewayProxyEventBase,
  APIGatewayProxyHandler,
  Context
} from 'aws-lambda';
import { search } from '../common/elastic';
import { Asset, image_file_resolutions, REQ_Query } from '../../interfaces/IAsset';
import * as b2 from '../common/backblaze';
import { dyn } from '../common/database';
//import { dyn } from '../common/database';
//import { User } from '../../interfaces/IUser';

function newResponse () {
  return {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
        'Access-Control-Allow-Origin': "*",
        'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }
}

function transformAsset(FrontEndAsset : Asset) : Asset {
  FrontEndAsset.creatorName = FrontEndAsset.creatorID; //TODO change to above code when we have users
  FrontEndAsset.previewLink = b2.GetURL('watermarked', FrontEndAsset);
  FrontEndAsset.thumbnail =  b2.GetURL('thumbnail', FrontEndAsset);
  return FrontEndAsset
}

const query_asset = async (evt: APIGatewayProxyEventBase<APIGatewayEventDefaultAuthorizerContext>, ctx : Context) => {
  let doc;
  const response = newResponse()
  const id = evt.queryStringParameters['id']
  try{
    doc = await search.get({
      index: process.env.INDEX_ASSETDB,
      id: id
    })
  } catch (e) {
    // Doc doesn't exist
    response.body = JSON.stringify({error: `${id} doesn't exist in Index`});
    throw new Error(`${id} doesn't exist in Index`);
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
  response.body = JSON.stringify(FrontEndAsset);
  response.statusCode = 200;
  return response;
}

export const query_assets: APIGatewayProxyHandler = async (_evt, _ctx) => {
  const response = newResponse()

  try{
    let queryObj:REQ_Query = {};
    if (_evt.queryStringParameters) {
      // Create lists from comma deliminted query string parameters
      for(let key of Object.keys(_evt.queryStringParameters)){
        let val = _evt.queryStringParameters[key].split(",")
        queryObj[key] = val.length == 1 ? val[0] : val
      }
    }

    // If ID then just do a GET on the ID, search params don't matter
    if(queryObj['id']){
      return await query_asset(_evt, _ctx)
    }

    let _query : any = {}
    const queries = []
    let exclude_attributes = ['sort', 'sort_type', 'from', 'size', 'text']
    for(let key of Object.keys(queryObj)){
      const val = queryObj[key]
      //id key is already taken care of in the above code block
      if(!exclude_attributes.includes(key)){
        queries.push({
          "match": {
            [key]: val
          }
        })
      } else if(key == 'text'){
        queries.push({
          "match": {
            'name': val
          }
        })
        queries.push({
          "match": {
            'description': val
          }
        })
      }
    }


    const body : any = {
      from: queryObj['from'] ? queryObj['from'] : 0,
      size: queryObj['size'] ? queryObj['size'] : 10,
      sort: queryObj['sort'] ? [{
        [queryObj['sort']] : queryObj['sort_type']
      }] : [{
        "_score": "desc"
      }],
    }

    if (queries.length) {
      _query.dis_max = {
        queries: queries,
        "tie_breaker": 0.7
      }
      body.query = _query
    } else {
      //throw new Error("Query string was empty");
    }

    // Query doesn't include ID
    let searchResults = await search.search({
      index: process.env.INDEX_ASSETDB,
      body: body
    })

    console.log('body', JSON.stringify(body))

    let totalAssets = 0

    const countQuery : any = {
      index: process.env.INDEX_ASSETDB,
    }
    if (queries.length) {
      countQuery.body = {
        query: _query
      }
    }
    const count = await search.count(countQuery)
    totalAssets = count.body.count

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
    console.log('num found in this page', FrontEndAssets.length)
    response.body = JSON.stringify({
      results: FrontEndAssets,
      total: totalAssets
    });
    response.statusCode = 200;
    return response;
  } catch (E){
    console.error(E)
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const asset_download_link: APIGatewayProxyHandler = async (_evt, _ctx) => {
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

    //Specifically ANY so only the relevant keys are passed in
    let reqAsset:any = JSON.parse(_evt.body);
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

    response.statusCode = 200;
    response.body = JSON.stringify({success: "Asset Updated"})
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
