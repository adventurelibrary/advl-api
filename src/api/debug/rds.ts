import { APIGatewayProxyHandler } from "aws-lambda";
import { errorResponse, newResponse } from "../common/response";
import * as db from '../common/postgres';
import { search } from "../common/elastic";
import {query} from "../common/postgres";

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
    let assets = db.query('select * from assets');
    assets.then(async (records) => {
      records = <any[]> records;
      let recordObjects = []
      let columnNames = await db.getColumnNames('assets')
      for(let r of records){
        recordObjects.push(db.stitchObject(columnNames, r));
      }
      const body = recordObjects.flatMap(doc => [{index: {_index:'assets'}}, doc]);
      await search.bulk({refresh: true, body});
    })

    return response;
  } catch (e) {
    return errorResponse(_evt,e);
  }
}
