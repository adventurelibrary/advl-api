import { APIGatewayProxyHandler } from "aws-lambda";
import { errorResponse, newResponse } from "../common/response";
import {query} from "../common/postgres";
import {indexAssetsSearch} from "../../lib/assets";
import {Asset} from "../../interfaces/IAsset";

export const debug_rds:APIGatewayProxyHandler = async (_evt, _ctx) => {
  try{
    let response = newResponse();
    const body = JSON.parse(_evt.body)
    let sql:string = body['query'];
    let params = body.params
		const result = await query(sql, params);
    console.log('result', result)
    response.body = JSON.stringify(result);
    console.log('body', response.body)
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
  try{
    let response = newResponse();
    const sql = `SELECT * FROM assets`
    const assets = await query<Asset>(sql)
    await indexAssetsSearch(assets)

    return response;
  } catch (e) {
    return errorResponse(_evt,e);
  }
}
