import { APIGatewayProxyHandler } from "aws-lambda";
import { errorResponse, newResponse } from "../common/response";
import * as db from '../common/postgres';

export const debug_rds:APIGatewayProxyHandler = async (_evt, _ctx) => {
  try{
    let response = newResponse();
    let query:string = JSON.parse(_evt.body)['query'];
    response.body = JSON.stringify(await db.query(query));
    response.statusCode = 200;
    return response;
  } catch (e){
    return errorResponse(_evt, e);
  }
}