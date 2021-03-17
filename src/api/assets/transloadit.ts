import { APIGatewayProxyHandler } from 'aws-lambda';
import { REQ_Get_Signature, RES_Get_Signature } from '../../interfaces/IAsset';
import * as crypto from 'crypto';

export const get_signature: APIGatewayProxyHandler = async (_event, _context) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    console.log(_event.body)
    response.statusCode = 200;
    response.body = JSON.stringify({success: "Hello World!"});
    let FileRequest:REQ_Get_Signature = JSON.parse(_event.body);
    let params = await getParams(FileRequest);
    let signature = await calcSignature(params);
    console.debug("Params: ", params);
    console.debug("Signature: ", signature);

    let _res:RES_Get_Signature = {
      params: params, 
      signature: signature
    }

    response = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(_res)
    }

    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_event} \n Error: ${E}` );
    return response;
  }
}

async function getParams(req:REQ_Get_Signature): Promise<string> {
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

  const params = JSON.stringify({
    auth: {
      key: authKey,
      expires: expires
    }, 
    steps: require("./file_upload_steps.json").steps
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