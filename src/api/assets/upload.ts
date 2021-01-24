import { APIGatewayProxyHandler } from 'aws-lambda';

export const upload: APIGatewayProxyHandler = async (_event, _context) => {
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
    console.error(`UPLOAD ERROR | \n Event: ${_event} \n Error: ${E}` );
    return response;
  }
}
