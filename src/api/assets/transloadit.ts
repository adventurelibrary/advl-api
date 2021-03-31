import { APIGatewayProxyHandler } from 'aws-lambda';
import { REQ_Get_Signature, RES_Get_Signature, Asset } from '../../interfaces/IAsset';
import * as crypto from 'crypto';
import slugify from 'slugify';
import { dyn } from '../common/database';
import * as qs from 'querystring';
import {idgen} from '../common/nanoid';
import { search } from '../common/elastic';

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
    slug: slugify(req.name).toLowerCase(),
    sizeInBytes: 0,
    uploaded: (new Date()).toISOString(),
    visibility: "PENDING",
    fileType: "IMAGE",
    creatorID: _creatorID,
    unlockCount: 0,

    name: req.name,
    description: req.description,
    collectionID: req.collectionID,
    category: req.category,
    tags: req.tags,
    unlockPrice: req.unlockPrice,
    revenueShare: req.revenueShare
  }

  await dyn.put({
    TableName: process.env.NAME_ASSETDB, 
    Item: newAsset
  }).promise();

  console.log(`PENDING ASSET CREATED\n`, newAsset);
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

  _steps.export_original.credentials = "ADVL Originals"
  _steps.export_original.path = `${asset.creatorID}/${asset.id}.`+'${file.ext}';
  _steps.export_compressed_image.credentials = "ADVL WEBP"
  _steps.export_compressed_image.path = `${asset.creatorID}/${asset.id}.webp`;

  _steps.export_watermark.credentials = "ADVL Watermarked"
  _steps.export_watermark.path = `${asset.creatorID}/${asset.id}.webp`;
  _steps.export_thumb.credentials = "ADVL Thumbs"
  _steps.export_thumb.path = `${asset.creatorID}/${asset.id}.webp`;

  const params = JSON.stringify({
    auth: {
      key: authKey,
      expires: expires
    }, 
    steps: _steps,
    notify_url: process.env.IS_OFFLINE == "true" ? process.env.TRANSLOADIT_OFFLINE_NOTIFY_URL : process.env.TRANSLOADIT_NOTIFY_URL,
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
    console.log("TRANSLOADIT NOTIFICATION: \n", notification);

    if(notification.error){
      throw new Error(JSON.stringify(notification))
    } else if(notification.ok == "ASSEMBLY_COMPLETED"){
      let params = JSON.parse(notification.params);
      let asset = <Asset> (await dyn.query({
        TableName: process.env.NAME_ASSETDB,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: {
          "#id": "id"
        }, 
        ExpressionAttributeValues: {
          ":id": params.fields.assetID
        }
      }).promise()).Items[0]

      if(asset && asset.visibility == "PENDING"){
        await dyn.update({
          TableName: process.env.NAME_ASSETDB,
          Key: {
            id: asset.id,
            uploaded: asset.uploaded
          },
          UpdateExpression: "set sizeInBytes = :sz, visibility = :updatedStatus",
          ExpressionAttributeValues: {
            ':sz': notification.bytes_received,
            ':updatedStatus': "HIDDEN"
          }
        }).promise();

        asset.sizeInBytes = notification.bytes_received;
        asset.visibility = "HIDDEN";

        //Add the asset to the Elasticsearch DB
        await search.index({
          index: process.env.INDEX_ASSETDB,
          id: asset.id,
          body: asset
        });

        console.log(`${asset.id} moved from PENDING to HIDDEN.`);
      }
    }
    response.statusCode = 200;
    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${JSON.stringify(_evt)} \n Error: ${E}` );
    return response;
  }
}
