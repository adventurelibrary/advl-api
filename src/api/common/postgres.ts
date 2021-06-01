import {RDSDataService} from 'aws-sdk';
import {FieldList, Metadata, SqlParameter as AWSSqlParameter} from "aws-sdk/clients/rdsdataservice";
import CustomSQLParam from "./customsqlparam";
const rds = new RDSDataService({region:'us-east-1'})

type QueryParams = any[] | Record<string, any>

type SqlParameter = AWSSqlParameter & {
  castTo?: string // This is needed for our custom enums, so the query becomes "SET enum_field = :p1::custom_type"
}

// Each key in the obj will be inserted as a column
export async function insertObj(tableName:string, obj:any) : Promise<string> {
  let columns: string[] = []
  let values: any[] = []
  for(let key of Object.keys(obj)){
    columns.push(key);
    values.push(obj[key])
  }
  const qmarks = values.map(_ => '?')

  let _sql = `INSERT INTO ${tableName}(${columns.join(",")}) VALUES (${qmarks.join(",")}) RETURNING id`;
  const result = await executeStatement(_sql, values)
  return result.records[0][0].stringValue;
}

// Takes in an array of parameters that are meant to be put into an SQL query
// For a query like SELECT * FROM table WHERE id = :p1
// you would give this function a value like ['at32h3i8agagw']
// For a query like UPDATE table SET last_updated = :p0, name = :p1 WHERE id = :p2
// you would give it an array like [new Date(), 'Fresh Name', 82]
// This function presumes that parameter names in the SQL query will be in the same order
// as the array of parameters given here
export function paramsListToSqlParams (params : any[]) : SqlParameter[] {
  return params.map((value: any, idx: number) => {
    const name = 'p' + idx
    return paramToSqlParam(value, name)
  })
}

// This function works the same as the list one just above, but it takes in key:value pairs
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
  if (value === null || value === undefined) {
    return {
      name: name,
      value: {
        isNull: true
      }
    }
  }

  if (value instanceof CustomSQLParam) {
    return <SqlParameter>{
      name: name,
      value: {
        [value.valueType]: value.value
      },
      typeHint: value.typeHint,
      castTo: value.castTo
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
  console.debug('===execute====')
  console.debug('SQL:', sql)
  console.debug('PARAMS BEFORE:', params)

  if (!process.env.POSTGRES_DB_ARN) {
    throw new Error('env variable POSTGRES_DB_ARN is blank, check your api.yml file for what is loading in')
  }
  if (!process.env.POSTGRES_SECRET_ARN) {
    throw new Error('env variable POSTGRES_SECRET_ARN is blank, check your api.yml file for what is loading in')
  }
  if (!process.env.POSTGRES_DB_NAME) {
    throw new Error('env variable POSTGRES_DB_NAME is blank, check your api.yml file for what is loading in')
  }

  // We accept both an array list of params and key:value object
  // This will convert both into the list that rds needs
  let sqlParams : SqlParameter[] = []
  let usingMapParams = false
  try {
    if (Array.isArray((params))) {
      sqlParams = paramsListToSqlParams(params)
    } else {
      usingMapParams = true
      sqlParams = paramsMapToSqlParams(params)
    }
  } catch (ex) {
    throw ex
  }


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
      const paramIdx = i - 1
      newSql += ':p' + (paramIdx)

      // Some parameters need to be cast in the db from the type we give
      // to Data API into a type that the db recognizes
      // For example: changing visibility_type of an Asset from string into an enum
      const param = sqlParams[paramIdx]
      if (!param) {
        throw new Error(`Param at idx ${paramIdx} is undefined`)
      }
      if (param.castTo) {
        newSql += '::' + param.castTo
      }

      newSql +=  parts[i]
    }
    sql = newSql
  }

  if (questionParams && usingMapParams) {
    throw new Error(`You can't run a query with ? parameter placeholders and a non-array params. Params need to be array if using ?`)
  }

  // This strips out any extra fields that we're using before we send to RDS
  // Otherwise it will complain about unknown keys
  const sanitized = sanitizeSQLParams(sqlParams)
  //console.debug('SANITIZED PARAMS:', sanitized)

  let response
  try {
    response = await rds.executeStatement({
      resourceArn: process.env.POSTGRES_DB_ARN,
      secretArn: process.env.POSTGRES_SECRET_ARN,
      database: process.env.POSTGRES_DB_NAME,
      sql: sql,
      parameters: sanitized,
      includeResultMetadata: true
    }).promise();
  } catch (ex) {
    throw ex
  }
  //console.log('success execute', response)
  return response
}

// Our SQL parameters have extra fields (like castTo) that we need to build our
// queries properly
// The RDS Data API complains about these though, so we need to strip them out
function sanitizeSQLParams (params: SqlParameter[]) : AWSSqlParameter[] {
  return params.map((p) => {
    return {
      name: p.name,
      typeHint: p.typeHint,
      value: p.value
    }
  })
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
    } else if (returnedValue.arrayValue) {
      // This will turn {arrayValue: {stringValue: ['hi']}} into {stringValue: ['hi']}
      const things = Object.entries(returnedValue)
      const arrayValue = things[0][1]

      const values = Object.entries(arrayValue)
      value = values[0][1]
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

  if (!res.records) {
    return []
  }

  return res.records.map(mapFromColumns(res.columnMetadata))
}

// Returns a single object from a table
export async function getObj (tableName:string, id:string) {
  const sql = `SELECT * FROM ${tableName} WHERE id = :id LIMIT 1`
  const rows = await query(sql, {id: id})
  return rows[0]
}

export type GetObjectsOpts = {
  limit: number,
  skip: number,
}

export async function getObjects (tableName:string, {
  limit,
  skip
} : GetObjectsOpts) {
  const params : QueryParams = {}
  let sql = `SELECT * FROM ${tableName} `

  if (limit) {
    sql += ` LIMIT :limit `
    params.limit = limit
  }

  if (skip) {
    sql += `
  OFFSET :skip`
    params.skip = skip
  }

  const rows = await query(sql, params)
  return rows
}


export async function updateObj(tableName:string, objID: string, updates : Record<string, any>){
  const updateString:string[] = [];
  const params : any[] = []
  for(let key of Object.keys(updates)){
    updateString.push(`${key} = ?`);
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
