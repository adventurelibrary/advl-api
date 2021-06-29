import { APIGatewayProxyHandler } from 'aws-lambda';
import { RES_Get_Signature, Asset } from '../../interfaces/IAsset';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import {errorResponse, newResponse} from "../common/response";
import {getEventUser} from "../common/events";
import {
  createNewAsset,
  getAsset,
  updateAssetAndIndex,
  validateAsset
} from "../../lib/assets";
import { clientRelease } from '../common/postgres';

export const get_signature: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()

  try{
    const user = await getEventUser(_evt)
    if(!user){
      throw new Error("You must be logged in to upload a new asset");
    }
    const newAsset = <Asset>JSON.parse(_evt.body);
    await validateAsset(newAsset)

    const created = await createNewAsset(newAsset);

    if (!created.id) {
      throw new Error('Created asset is missing id')
    }

    let params = await getParams(created);
    let signature = await calcSignature(params);

    let _res:RES_Get_Signature = {
      params: params,
      signature: signature,
      assetID: created.id
    }

    response.statusCode = 200
    response.body = JSON.stringify(_res)
    clientRelease();
    return response;
  }catch (E){  
    clientRelease();
    return errorResponse(_evt, E)
  }
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
  _steps.export_original.path = `${asset.creator_id}/${asset.id}.`+'${file.ext}';
  _steps.export_compressed_image.credentials = "ADVL WEBP"
  _steps.export_compressed_image.path = `${asset.creator_id}/${asset.id}.webp`;

  _steps.export_watermark.credentials = "ADVL Watermarked"
  _steps.export_watermark.path = `${asset.creator_id}/${asset.id}.webp`;
  _steps.export_thumb.credentials = "ADVL Thumbs"
  _steps.export_thumb.path = `${asset.creator_id}/${asset.id}.webp`;

  const params = {
    auth: {
      key: authKey,
      expires: expires
    },
    steps: _steps,
    notify_url: process.env.IS_OFFLINE == "true" ? process.env.TRANSLOADIT_OFFLINE_NOTIFY_URL : process.env.TRANSLOADIT_NOTIFY_URL,
    fields: {
      creatorID: asset.creator_id,
      assetID: asset.id
    }
  }

  if (!params.fields.assetID) {
    throw new Error('WHERE IS TEH ASSET ID?')
  }
  clientRelease();
  return JSON.stringify(params);
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
      if(notification.uploads.length > 1){
        throw new Error("Transloadit got multiple file uploads!");
      }

      let params = JSON.parse(notification.params);
      const assetId = params.fields.assetID
      if (!assetId) {
        throw new Error('Missing assetID from params')
      }
      let asset = await getAsset(params.fields.assetID)
      if(asset && asset.visibility == "PENDING"){
        const update = {
          size_in_bytes: notification.bytes_received,
          visibility: 'HIDDEN',
          original_file_ext: notification.uploads[0].ext
        }
        await updateAssetAndIndex(asset,  update)

        console.log(`${asset.id} moved from PENDING to HIDDEN.`);
      }
    }
    response.statusCode = 200;
    clientRelease();
    return response;
  } catch (E){
    clientRelease();
    return errorResponse(_evt, E)
  }
}
