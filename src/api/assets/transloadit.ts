import {APIGatewayProxyHandler} from 'aws-lambda';
import {Asset, RES_Get_Signature} from '../../interfaces/IAsset';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import {errorResponse} from "../common/response";
import {createNewAsset, updateAssetAndIndex, updateAssetSearchById, validateAsset} from "../../lib/assets";
import * as db from '../common/postgres';
import {newHandler} from "../common/handlers";


export const get_upload_signature = newHandler({
  takesJSON: true,
  requireCreatorPermission: true,
}, async ({json, creator}) => {
  const newAsset = <Asset>json;
  newAsset.creator_id = creator.id
  validateAsset(newAsset)

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

  // Index this asset so it will appear for this creator
  await updateAssetSearchById(created.id, true)

  return {
    body: _res,
    status: 200
  }
})

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
      let asset = await db.getObj(process.env.DB_ASSETS, params.fields.assetID);
      if(asset && asset.upload_status === "PENDING"){
        const update = {
          size_in_bytes: notification.bytes_received,
          upload_status: 'COMPLETE',
          original_file_ext: notification.uploads[0].ext
        }

        console.log("ASSET TO UPDATE: ", asset);
        console.log("ASSET_UPDATES: ", update);
        await updateAssetAndIndex(asset,  update)

        console.log(`${asset.id} moved upload status from PENDING to COMPLETED.`);
      }
    }
    response.statusCode = 200;
    db.clientRelease();
    return response;
  } catch (E){
    db.clientRelease();
    return errorResponse(_evt, E)
  }
}
