import { APIGatewayProxyHandler } from 'aws-lambda';
import { REQ_Get_Signature, RES_Get_Signature } from '../../interfaces/IAsset';

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
    const signature = await calcSig(FileRequest);
        
    let res_sig: RES_Get_Signature = {

    }

    return response;
  } catch (E){
    console.error(`ERROR | \n Event: ${_event} \n Error: ${E}` );
    return response;
  }
}

async function calcSig(req:REQ_Get_Signature): Promise<String>{
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
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET

  return '';
} 