import { APIGatewayProxyHandler } from 'aws-lambda';

export const template: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    response.statusCode = 200;
    response.body = JSON.stringify({success: "Hello World!"})
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}
