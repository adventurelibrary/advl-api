import { APIGatewayProxyHandler } from 'aws-lambda';
import { REQ_Get_Signature, RES_Get_Signature, Asset } from '../../interfaces/IAsset';
import * as crypto from 'crypto';
import slugify from 'slugify';
import { dyn } from '../common/database';
import * as qs from 'querystring';
import {idgen} from '../common/nanoid';

export const get_signature: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let FileRequest:REQ_Get_Signature = JSON.parse(_evt.body);
    // TODO: Fetch UserID from the Cognito Authorizer
    let creatorID = "admin-test"
    let newAsset = await createNewAsset(creatorID, FileRequest);

    let params = await getParams(newAsset);
    let signature = await calcSignature(params);

    let _res:RES_Get_Signature = {
      params: params, 
      signature: signature
    }

    response = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': "*",
        'Access-Control-Allow-Credential': true
      },
      body: JSON.stringify(_res)
    }

    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

async function createNewAsset(_creatorID: string, req:REQ_Get_Signature): Promise<Asset> {
  let newAsset: Asset = {
    id: idgen(),
    slug: slugify(req.name),
    size: 0,
    uploaded: (new Date()).toISOString(),
    visibility: "PENDING",
    fileType: "IMAGE",
    creatorID: _creatorID,
    unlockCount: 0,

    name: req.name,
    description: req.description,
    collectionID: req.collectionID,
    categoryID: req.categoryID,
    tagIDs: req.tagIDs,
    unlockPrice: req.unlockPrice,
    revenueShare: req.revenueShare
  }

  await dyn.put({
    TableName: process.env.NAME_ASSETDB, 
    Item: newAsset
  }).promise()

  return newAsset;
}

async function getParams(asset: Asset): Promise<string> {
  const utcDateString = (ms) =>{
    return new Date(ms)
    .toISOString()
    .replace(/-/g, '/')
    .replace(/T/, " ")
    .replace(/\.\d+\Z$/, '+00:00')   
  }

  // expire 30 minutes from now (this must be milliseconds)
  const expires = utcDateString((+new Date()) + 30 * 60 * 1000)
  const authKey = process.env.TRANSLOADIT_AUTH_KEY

  let _steps = require("./file_upload_steps.json").steps;

  _steps.export_original.path = `originals/${asset.creatorID}/${asset.id}.`+'${file.ext}';
  _steps.export_compressed_image.path = `optimized/${asset.creatorID}/${asset.id}.webp`;

  //TODO: Change the credentials for preview and thumbs to a different bucket that's publically accessible and doesn't need a presigned url
  _steps.export_watermark.path = `preview/${asset.creatorID}/${asset.id}.webp`;
  _steps.export_thumb.path = `thumb/${asset.creatorID}/${asset.id}.webp`;

  const params = JSON.stringify({
    auth: {
      key: authKey,
      expires: expires
    }, 
    steps: _steps,
    notify_url: process.env.TRANSLOADIT_NOTIFY_URL,
    fields: {
      creatorID: asset.creatorID,
      assetID: asset.id
    }
  })
  
  return params;
}

async function calcSignature(params: string): Promise<string>{
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET
  const signature = crypto
                    .createHmac('sha1', authSecret)
                    .update(Buffer.from(params, 'utf-8'))
                    .digest('hex')

  return signature
} 

export const transloadit_notify: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let notification = JSON.parse(<string>qs.parse(_evt.body).transloadit);
    console.log(notification);

    if(notification.error){
      throw new Error(JSON.stringify(notification))
    } else if(notification.ok == "ASSEMBLY_COMPLETED"){
      let params = JSON.parse(notification.params);
      let asset = <Asset> (await dyn.get({
        TableName: process.env.NAME_ASSETDB,
        Key: {id: params.fields.assetID}
      }).promise()).Item

      if(asset && asset.visibility == "PENDING"){
        await dyn.update({
          TableName: process.env.NAME_ASSETDB,
          Key: {
            id: asset.id
          },
          UpdateExpression: "set size = :sz, visibility = :updatedStatus",
          ExpressionAttributeValues: {
            ':sz': notification.bytes_received,
            ':updatedStatus': "HIDDEN"
          }
        }).promise();
      }
    }
    response.statusCode = 200;
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
