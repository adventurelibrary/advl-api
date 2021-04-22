import { APIGatewayProxyHandler } from 'aws-lambda';

export const template: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    response.statusCode = 200;
    response.body = JSON.stringify({success: "Hello World!"})
    return response;

  }catch (E){ return errorResponse(_evt, E) }
}
