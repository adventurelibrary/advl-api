import { APIGatewayProxyHandler } from "aws-lambda";
import { errorResponse, newResponse } from "../common/response";
import {query} from "../common/postgres";
import {indexAssetsSearch, reindexAssetsSearch} from "../../lib/assets";
import {Asset} from "../../interfaces/IAsset";
import {search} from "../api/common/elastic";
import {bulkIndex, clearIndex} from "../common/elastic";
import {indexBundles, reindexBundles} from "../../lib/bundle";
import {Bundle} from "../../interfaces/IBundle";

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
    const sql = `SELECT a.*, c.name as creator_name
FROM assets a
JOIN creators c 
ON c.id = a.creator_id`
    const assets = await query<Asset>(sql)
    await reindexAssetsSearch(assets)


    // Delete and re-index the bundles
    const bundles = await query<Bundle>(`
SELECT b.*, c.name as creator_name, u.username
FROM bundleinfo b
LEFT JOIN creators c 
ON c.id = b.creator_id
LEFT JOIN users u
ON u.id = b.user_id`)
    await reindexBundles(bundles)
    response.statusCode = 204
    return response;
  } catch (e) {
    return errorResponse(_evt,e);
  }
}
