import { APIGatewayProxyHandler } from 'aws-lambda';
import { REQ_Get_Signature, RES_Get_Signature, Asset } from '../../interfaces/IAsset';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import { search } from '../common/elastic';
import {errorResponse, newResponse} from "../common/response";
import * as db from '../common/postgres'
import {getEventUser} from "../common/events";
import {createNewAsset} from "../../lib/assets";

export const get_signature: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse()

  try{
    let FileRequest:REQ_Get_Signature = JSON.parse(_evt.body);
    const user = await getEventUser(_evt)
    if(!user){
      throw new Error("You must be logged in to upload a new asset");
    }


    let newAsset:Asset = await createNewAsset(user.username, FileRequest);
    let params = await getParams(newAsset);
    let signature = await calcSignature(params);

    let _res:RES_Get_Signature = {
      params: params,
      signature: signature,
      assetID: newAsset.id
    }

    response.statusCode = 200
    response.body = JSON.stringify(_res)

    return response;
  }catch (E){
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
  _steps.export_original.path = `${asset.creatorName}/${asset.id}.`+'${file.ext}';
  _steps.export_compressed_image.credentials = "ADVL WEBP"
  _steps.export_compressed_image.path = `${asset.creatorName}/${asset.id}.webp`;

  _steps.export_watermark.credentials = "ADVL Watermarked"
  _steps.export_watermark.path = `${asset.creatorName}/${asset.id}.webp`;
  _steps.export_thumb.credentials = "ADVL Thumbs"
  _steps.export_thumb.path = `${asset.creatorName}/${asset.id}.webp`;

  const params = JSON.stringify({
    auth: {
      key: authKey,
      expires: expires
    },
    steps: _steps,
    notify_url: process.env.IS_OFFLINE == "true" ? process.env.TRANSLOADIT_OFFLINE_NOTIFY_URL : process.env.TRANSLOADIT_NOTIFY_URL,
    fields: {
      creatorName: asset.creatorName,
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
      let asset = <Asset> (await db.getObj(process.env.DB_ASSETS, params.fields.assetID));
      if(asset && asset.visibility == "PENDING"){
        await db.updateObj(process.env.DB_ASSETS, asset.id, {
          sizeInBytes: notification.bytes_received,
          visibility: "HIDDEN"
        });

        asset.sizeInBytes = notification.bytes_received;
        asset.visibility = "HIDDEN";
        if(notification.uploads.length > 1){
          throw new Error("Transloadit got multiple file uploads!");
        }
        asset.originalFileExt = notification.uploads[0].ext;
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
    return errorResponse(_evt, E)
  }
}
