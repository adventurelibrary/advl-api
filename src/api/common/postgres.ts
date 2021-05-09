import {RDSDataService} from 'aws-sdk';
import {FieldList, Metadata, SqlParameter} from "aws-sdk/clients/rdsdataservice";
const rds = new RDSDataService({region:'us-east-1'})

type QueryParams = any[] | Record<string, any>

function camelToSnake (colName: string) : string {
  return colName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export async function insertObj(tableName:string, obj:any){
  try{
    let columns: string[] = []
    let values: any[] = []
    for(let key of Object.keys(obj)){
      columns.push(camelToSnake(key));
      values.push(obj[key])
    }
    const qmarks = values.map(_ => '?')

    let _sql = `INSERT INTO ${tableName}(${columns.join(",")}) VALUES (${qmarks.join(",")})`;
    console.debug("INSERT SQL: ", _sql);
    const result = await executeStatement(_sql, values)
    console.debug("Result: ", result);
    return result;
  } catch (e){
    throw e;
  }
}

// Takes in an array of parameters that are meant to be put into an SQL query
// For a query like SELECT * FROM table WHERE id = :p1
// you would give this function a value like ['at32h3i8agagw']
// For a query like UPDATE table SET last_updated = :p0, name = :p1 WHERE id = :p2
// you would give it an array like [new Date(), 'Fresh Name', 82]
// This function presumes that parameter names in the SQL query will be in the same order
// as the array of paremters given here
export function paramsListToSqlParams (params : any[]) : SqlParameter[] {
  return params.map((value: any, idx: number) => {
    const name = 'p' + idx
    return paramToSqlParam(value, name)
  })
}

// This function works the same as the list one, but it takes in key:value pairs
// So you have query like "UPDATE table SET name = :name WHERE id = :id"
// and you use paramsMapToSqlParams({name: 'New Name', id: 34})
export function paramsMapToSqlParams (params : Record<string, any>) : SqlParameter[] {
  const sqlParams : SqlParameter[] = []
  const keys = Object.keys(params)
  for (let key of keys) {
    const val = params[key]
    sqlParams.push(paramToSqlParam(val, key))
  }
  return sqlParams
}

// Converts a single javascript value into an SqlParameter with a given name
// We use this when we're querying to take the nice JavaScript variables we like
// working with and convert them into a format that RDS expects
function paramToSqlParam (value: any, name: string) : SqlParameter {
  if (value === null) {
    return {
      name: name,
      value: {
        isNull: true
      }
    }
  }

  let key
  let paramValue = value

  let to = typeof value
  let typeHint
  switch (to) {
    case "boolean":
      key = "booleanValue";
      break
    case "string":
      key = "stringValue"
      break;
    // TODO: Find a way to do DOUBLE vs LONG correctly
    case "number":
      key = "doubleValue"
      break;
    case "object":
      if (typeof value.toISOString === 'function') {
        key = "stringValue"
        typeHint = "TIMESTAMP"
        paramValue = dateToTimeStamp(value)
      }
      // This doesn't feel like an appropriate check
      else if (value.toString() == '[object Object]') {
        key = "stringValue"
        paramValue = JSON.stringify(value)
        typeHint = 'JSON'
      }
      if (Array.isArray(value)) {
        console.warn(`Amazon RDS does not support array parameters`)
        key = "stringValue"
        paramValue = value.join(',')
      }
      break;
  }

  if (key === undefined) {
    throw new Error(`Could not find an appropriate value key for param ${name}
    typeof: ${typeof value}
    value: ${JSON.stringify(value, null, 2)}`)
  }

  const param : any = {
    name: name,
    value: {
      [key]: paramValue
    }
  }

  if (typeHint) {
    param.typeHint = typeHint
  }

  return param
}

export async function executeStatement (sql: string, params : QueryParams = []) {
  // Sometimes it's easier to build a query using ? for param replacement
  // At this stage we want to replace the ?'s with actual parameter names
  // so that UPDATE table SET name = ? WHERE id = ?
  // becomes UPDATE table SET name = :p0 WHERE id = :p1
  let questionParams = false
  if (sql.indexOf('?') >= 0) {
    questionParams = true
    const parts = sql.split('?')
    let newSql = parts[0]
    for (let i = 1; i < parts.length; i++) {
      newSql += ':p' + (i-1) + parts[i]
    }
    sql = newSql
  }

  // We accept both an array list of params and key:value object
  // This will convert both into the list that rds needs
  let sqlParams : SqlParameter[] = []
  try {
    if (Array.isArray((params))) {
      sqlParams = paramsListToSqlParams(params)
    } else {
      sqlParams = paramsMapToSqlParams(params)
      if (questionParams) {
        throw new Error(`You can't run a query with ? parameter placeholders and a non-array params. Params need to be array if using ?`)
      }
    }
  } catch (ex) {
    throw ex
  }

  // TODO: remove this when code is more solid, or wrap around a check that we're in dev mode

  let response
  try {
    response = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: sql,
      parameters: sqlParams,
      includeResultMetadata: true
    }).promise();
  } catch (ex) {
    throw ex
  }
  return response
}

// The data send back is returned in arrays, so we need to convert it to
// key:value object
// The columns metadata tells us what the fields in the returne data are
function convertResultToMap(record : FieldList, columnsMeta : Metadata) {
  const obj = {}
  // Column data isn't returned with each record, so we build the object ourselves
  columnsMeta.forEach((col, idx) => {
    const colName = col.name
    let value : any

    const returnedValue = record[idx]
    if (returnedValue.isNull) {
      value = null
    } else {
      // This will turn {stringValue: 'hi'} into 'hi'
      const things = Object.entries(returnedValue)
      value = things[0][1]
    }

    obj[colName] = value
  })
  return obj
}

// Creates a function that you can use to .map a list of results
function mapFromColumns(columnsMeta: Metadata) : (record : FieldList, idx: number, records: FieldList[]) => any {
  return (record: FieldList) => {
    return convertResultToMap(record, columnsMeta)
  }
}

// Runs a query which returns a list of results
export async function query<T>(sql: string, params: QueryParams = []) : Promise<T[]> {
  const res = await executeStatement(sql, params)

  return res.records.map(mapFromColumns(res.columnMetadata))
}

// Returns a single object from a table
export async function getObj (tableName:string, id:string) {
  const sql = `SELECT * FROM ${tableName} WHERE id = :id LIMIT 1`
  const rows = await query(sql, {id: id})
  return rows[0]
}

export async function updateObj(tableName:string, objID: string, updates : Record<string, any>){
  const updateString:string[] = [];
  const params : any[] = []
  for(let key of Object.keys(updates)){
    updateString.push(`${camelToSnake(key)} = ?`);
    params.push(updates[key])
  }
  params.push(objID)

  const _sql = `UPDATE ${tableName} 
SET ${updateString.join(",")} 
WHERE id=?`;
  const result = await executeStatement(_sql, params)
  console.debug("Result: ", result);
  return result;
}

// Converts an assumed date into the format that RDS wants dates in
// Stolen from here: https://stackoverflow.com/questions/10645994/how-to-format-a-utc-date-as-a-yyyy-mm-dd-hhmmss-string-using-nodejs/10717081
function dateToTimeStamp (date : Date | string | number) : string {
  return new Date(date).toISOString().
    replace(/T/, ' ').      // replace T with a space
    replace(/\..+/, '')     // delete the dot and everything after
}
