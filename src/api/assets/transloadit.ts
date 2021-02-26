import { APIGatewayProxyHandler } from 'aws-lambda';

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
    response.body = JSON.stringify({success: "Hello World!"})
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_event} \n Error: ${E}` );
    return response;
  }
}
