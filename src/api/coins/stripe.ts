//webhook listeners
import { APIGatewayProxyHandler } from "aws-lambda";

/**
 * Can't use newHandler here because it's built on newResponse, which uses CORS rules
 * The events for this endpoint will come from stripe.com not from adventurelibrary.art
 */
export const event_listener:APIGatewayProxyHandler = async (_evt, _ctx) => {
  console.log("EVENT: \n", JSON.parse(_evt.body));

  return {
    statusCode: 200,
    body: ""
  }
}