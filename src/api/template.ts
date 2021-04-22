import { APIGatewayProxyHandler } from 'aws-lambda';
import { newResponse } from './common/response';

export const template: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();

  try{
    response.statusCode = 200;
    response.body = JSON.stringify({success: "Hello World!"})
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
