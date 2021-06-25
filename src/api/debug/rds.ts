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
  
    let q = JSON.parse(_evt.body)['query']
    console.log("Query: ", q);
    console.log("Attempting connection");
    const client = new Client({
      user: 'advl',
      password: 'library567',
      host: 'advl-dev-db.cluster-cyynasj2ssh4.us-east-1.rds.amazonaws.com',
      database: 'adventurelibrary'
    })
    await client.connect();
    console.log("connected");
    client.connect()
      .then(() => {
        console.log("Connected Again?")
      })
      .catch( (e) => {
        console.error("Connecting Problems: ", e)
      })
    
    let res = await client.query(q)
    console.log(res);
    response.body = JSON.stringify(res);
    client.end();
    return response;
  } catch (e){
    console.error(e);
    return errorResponse(_evt, e);
  }
}