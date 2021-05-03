import {RDSDataService} from 'aws-sdk';
const rds = new RDSDataService({region:'us-east-1'})

export async function insertObj(tableName:string, obj:any){
  try{
    let columns: string[] = []
    let values: any[] = []
    for(let key of Object.keys(obj)){
      columns.push(key);
      if(typeof obj[key] === 'string'){
        values.push(`\'${obj[key]}\'`);
      } else {
        values.push(obj[key]);
      }
    }

    let _sql = `INSERT INTO ${tableName}(${columns.join(",")}) VALUES (${values.join(",")})`;
    const result = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: _sql 
    }).promise();
    console.debug("Result: ", result);
    return result;
  } catch (e){
    throw e;
  }
}
export async function getObj(tableName:string, id:string){
  try{
    let _sql = `SELECT * FROM ${tableName} WHERE id='${id}'`
    const result = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: _sql 
    }).promise();
    //console.debug("Result: ", result);
    if(result.records.length == 0){ return undefined;}
    return stitchObject(await getColumnNames(tableName), valuesArray(result.records[0]))
  } catch (e) {
    throw e;
  }
}

/**
 * SELECT * FROM Table WHERE ${query}
 * @param tableName 
 * @param query 
 */
export async function getObjects(tableName:string, query:string){
  try{
    let _sql = `SELECT * FROM ${tableName} WHERE ${query}`
    const result = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: _sql 
    }).promise();
    
    let columnNames = await getColumnNames(tableName);
    let objects = [];
    for(let record of result.records){
      objects.push(stitchObject(columnNames, valuesArray(record)));
    }
    return objects;
  } catch (e) {
    throw e;
  }
}

export async function updateObj(tableName:string, objID: string, updatedObj:any){
  try{
    let updateString:string[] = [];
    for(let key of Object.keys(updatedObj)){
      updateString.push(`${key} = ${updateObj[key]}`);
    }

    let _sql = `UPDATE ${tableName} SET ${updateString.join(",")} WHERE id='${objID}'`;
    const result = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: _sql 
    }).promise();
    console.debug("Result: ", result);
    return result;
  } catch (e) {
    throw e;
  }
}

/**
 * Runs the raw query against the database
 * @param sql 
 * @returns 
 */
export async function query(sql:string){
  try{
    const result = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: sql 
    }).promise();
    console.debug("Result: ", result);
    return result;
  } catch (e) {
    throw e;
  }
}

async function getColumnNames(tableName:string){
  try{
    const columnResult = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: `SELECT json_object_keys(to_json((SELECT t FROM public.${tableName} t LIMIT 1)))` 
    }).promise();

    let columnNames:string[] = []
    for(let columnNameArr of columnResult.records[0]){
      columnNames.push(columnNameArr[0]['stringValue']);
    }

    return columnNames;
  }catch(e){
    throw e;
  }
}

function valuesArray(rdsValues:any[]): any[]{
  let values:any[] = [];
  for(let valueObj of rdsValues){
    values.push(Object.values(valueObj)[0]);
  };
  return values;
}

function stitchObject(columNames:string[], values:any[]){
  let obj:any = {}

  for(let i=0; i<columNames.length; i++){
    obj[columNames[i]] = values[i]
  };

  return obj;
}