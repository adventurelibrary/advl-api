import { APIGatewayProxyHandler } from 'aws-lambda';
import { newResponse } from './common/response';

export const template: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();

  try{
    response.statusCode = 200;
    response.body = JSON.stringify({success: "Hello World!"})
    return response;

  }catch (E){ return errorResponse(_evt, E) }
}
