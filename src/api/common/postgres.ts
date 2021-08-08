import {Pool} from 'pg';
const pg_read = new Pool({
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_READ_URL,
  database: process.env.POSTGRES_DB_NAME,
  max: 1,
})

export const pg_write = new Pool({
  user: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_WRITE_URL,
  database: process.env.POSTGRES_DB_NAME,
  max: 1
})

/**
 * Runs the query against the Postgres DB we have in the background.
 * The last param determines if the query should use the writer, or if can just use the reader
 * The reader can handle a lot more connetions because it's Aurora, and it doesn't actually need to connect to the db but rather reads logs to build state
 * @param sql The sql to run
 * @param params
 * @param isWriteQuery Defaults to true, but should be false where possible
 */
async function executeStatement(sql: string, params:any[]){
  console.debug("======POSTGRES QUERY======");
  console.debug("SQL: ", sql)
  console.debug("Params: ", JSON.stringify(params));

  const isWriteQuery = sql.trim().toLowerCase().indexOf('select') !== 0

  console.debug("isWriteQuery:",  isWriteQuery);

  if(isWriteQuery){
    const res = await pg_write.query(sql, params);
    return res;
  } else {
    const res = await pg_read.query(sql, params);
    return res;
  }
}

export async function query(sql:string, params:any[] = []){
  const res = await executeStatement(sql, params);
  return res.rows;
}

export async function insertObj(tableName:string, obj:any, returning = 'id') : Promise<Record<string, any> | undefined | string | number> {
  let columns: string[] = []
  let values: any[] = []
  for(let key of Object.keys(obj)){
    columns.push(key);
    values.push(obj[key])
  }

  //replace ? with $i to match what the library wants
  let paramMarks = "";
  for(let i=1; i<=values.length; i++){
    paramMarks += i == values.length ? `$${i}` : `$${i},`
  }

  let _sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${paramMarks})`;

  // This allows you to immediately get the id of a newly created object
  // You can specify more fields if you need more fields
  if (returning) {
    _sql += ` RETURNING ${returning}`
  }

  const result = await executeStatement(_sql, values);
  if (returning) {
    const row = result.rows[0]
    if (returning === 'id') {
      return row.id
    }

    return row
  }
}

export async function getObj(tableName:string, id: string) {
  const _sql = `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`;
  const res = await executeStatement(_sql, [id]);
  return res.rows[0];
}

export async function updateObj(tableName:string, objID: string | number, updates: Record<string, any>) {
  const updateString: string[] = [];
  const params: any[] = [];
  const keys = Object.keys(updates)
  for(let i=0; i<keys.length; i++){
    //have to do the +1 here because pg won't recognize $0 as a parameter
    updateString.push(`${keys[i]} = $${i+1}`);
    params.push(updates[keys[i]])
  }
  //last param is the object's id for the WHERE clause
  params.push(objID)
  const _sql = `UPDATE ${tableName} SET ${updateString.join(",")} WHERE id=$${params.length}`
  await executeStatement(_sql, params);
  return true;
}

export async function deleteObj(tableName:string, id:string) {
  const _sql = `DELETE FROM ${tableName} WHERE id = $1`;
  return await executeStatement(_sql, [id]);
}

export function clientRelease(){
  try{
    pg_read.end();
    pg_write.end();
  } catch (e) {
    console.log("Pool already ended!");
  }
}

/**
 * The SQL should include the tablename
 * @param sql
 * @param values
 * @param skip
 * @param limit
 * @param orderBy
 */
export async function getObjects(sql: string, values:any[] = [], skip:number = 0, limit: number = 10, orderBy?: string){
  if(orderBy){
    sql += ` ORDER BY ${orderBy}`
  }

  if(limit){
    values.push(limit);
    sql += ` LIMIT $${values.length}`
  }

  if(skip){
    values.push(skip)
    sql += ` OFFSET $${values.length}`
  }

  return await query(sql, values);
}
