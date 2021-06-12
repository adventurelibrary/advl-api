import { APIGatewayProxyHandler } from "aws-lambda";
import { errorResponse, newResponse } from "../common/response";
import {query} from "../common/postgres";
import {resetAssets} from "../../lib/assets";
import {resetBundles} from "../../lib/bundle";

export const debug_rds:APIGatewayProxyHandler = async (_evt, _ctx) => {
  try{
    let response = newResponse();
    const body = JSON.parse(_evt.body)
    let sql:string = body['query'];
    let params = body.params
		const result = await query(sql, params);
    response.body = JSON.stringify(result);
    response.statusCode = 200;
    return response;
  } catch (e){
    return errorResponse(_evt, e);
  }
}

/**
 * TODO: Replace with real sync worker that paginates the results. This will time out on larger databases that take longer than 45 seconds to retreieve.
 * @param _evt
 * @param _ctx
 */
export const debug_sync:APIGatewayProxyHandler = async(_evt, _ctx) => {
  let response = newResponse();
  try{
    await resetAssets()
    await resetBundles()
    response.statusCode = 204
    return response;
  } catch (e) {
    return errorResponse(_evt,e);
  }
}

import { Client } from 'pg';

export const rds_vpc:APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();
  try{
    console.log("Attempting connection");
    const client = new Client({
      user: 'advl',
      password: 'library567',
      host: 'advl-dev-db.cluster-cyynasj2ssh4.us-east-1.rds.amazonaws.com',
      database: 'adventurelibrary'
    })
    client.connect();
    console.log("connected")
    let res = await client.query('select * from information_schema.tables')
    console.log(res);
    response.body = JSON.stringify(res);
    return response;
  } catch (e){
    console.error(e);
    return errorResponse(_evt, e);
  }
}