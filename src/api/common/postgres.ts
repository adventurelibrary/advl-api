import {Client} from 'pg';
const pg_read = new Client({
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_READ_URL,
  database: process.env.POSTGRES_DB_NAME
})

const pg_write = new Client({
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_WRITE_URL,
  database: process.env.POSTGRES_DB_NAME
})



/**
 * Runs the query against the Postgres DB we have in the background.
 * The last param determines if the query should use the writer, or if can just use the reader
 * The reader can handle a lot more connections because it's Aurora, and it doesn't actually need to connect to the db but rather reads logs to build state
 * @param sql The sql to run
 * @param params 
 * @param isWriteQuery Defaults to true, but should be false where possible
 */
async function executeStatement(sql: string, params:any[], isWriteQuery: boolean = true){
  console.debug("======POSTGRES QUERY======");
  console.debug("SQL: ", sql)
  console.debug("Params: ", params);
  console.debug("isWriteQuery:",  isWriteQuery);

  if(isWriteQuery){
    try{
      pg_write.connect()
    } catch (e) {
      //E just means it's already connected, so just continue
    }
    return await pg_write.query(sql, params);
  } else {
    try{
      pg_read.connect()
    } catch (e) {
      //E just means it's already connected so just continue
    }
    return await pg_read.query(sql, params);
  }
}

export async function query(sql:string, params:any[] = [], isWriteQuery: boolean = true){
  const res = await executeStatement(sql, params, isWriteQuery);
  return res.rows;
}


export async function insertObj(tableName:string, obj:any) {
  let columns: string[] = []
  let values: any[] = []
  for(let key of Object.keys(obj)){
    columns.push(key);
    values.push(obj[key])
  }

  //replace ? with $i to match what the library wants
  let paramMarks = "";
  for(let i=1; i++; i<=values.length){
    paramMarks += i == values.length ? `$${i}` : `$${i},`
  }

  let _sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${paramMarks})`;
  try{
    await executeStatement(_sql, values, true);
    return true;
  } catch (e) {
    throw e;
  } 
}

export async function getObj(tableName:string, id: string) {
  const _sql = `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`;
  const res = await executeStatement(_sql, [id], false);
  return res.rows[0];
}

export async function updateObj(tableName:string, objID: string, updates: Record<string, any>) {
  const updateString: string[] = [];
  const params: any[] = [];
  const keys = Object.keys(updates)
  for(let i=0; i<keys.length; i++){
    updateString.push(`${keys[i]} = $${i}`);
    params.push(updates[keys[i]])
  }
  //last param is the object's id for the WHERE clause
  params.push(objID)

  const _sql = `UPDATE ${tableName} SET ${updateString.join(",")} WHERE id=$${params.length}`
  await executeStatement(_sql, params, true);
  return true;
}

export async function deleteObj(tableName:string, id:string) {
  const _sql = `DELETE FROM ${tableName} WHERE id = $1`;
  return await executeStatement(_sql, [id], true);
}

export async function clientRelease(){
  pg_read.end();
  pg_write.end();
}