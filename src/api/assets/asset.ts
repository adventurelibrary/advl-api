import { APIGatewayProxyHandler } from 'aws-lambda';
import { search } from '../common/elastic';
import { dyn } from '../common/database';
import { Asset } from '../../interfaces/IAsset';
import { User } from '../../interfaces/IUser';

export const query_assets: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let queryObj = {};
    // Create lists from comma deliminted query string parameters
    for(let key of Object.keys(_evt.queryStringParameters)){
      let val = _evt.queryStringParameters[key].split(",")
      queryObj[key] = val.length == 1 ? val[0] : val 
    }
    console.log("Query Obj: ", queryObj);

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
      FrontEndAsset.previewLink = `https://f000.backblazeb2.com/file/advl-watermarked/${FrontEndAsset.creatorID}/${FrontEndAsset.id}.webp`
      FrontEndAsset.thumbnail = `https://f000.backblazeb2.com/file/advl-watermarked/${FrontEndAsset.creatorID}/${FrontEndAsset.id}.webp`    
      response.body = JSON.stringify(FrontEndAsset);
    } else {
      response.body = JSON.stringify({error: "Only fetch by ID is currently supported"})
    }

    response.statusCode = 200;
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
