import {RDSDataService} from 'aws-sdk';
const rds = new RDSDataService({region:'us-east-1'})


export async function insertObj(tableName:string, obj:any){
  try{
    let columns: string[] = []
    let values: any[] = []
    for(let key of Object.keys(obj)){
      columns.push(key);
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

export async function executeStatement (sql: string, params : any[] = []) {
	const parameters = params.map((value: any, idx: number) => {
		if (value === null) {
			return {
				name: 'p' + idx,
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
				key = "stringValue'"
				typeHint = "STRING"
				break;
			case "object":
				if (typeof value.toISOString === 'function') {
					key = "stringValue"
					typeHint = "TIMESTAMP"
					paramValue = value.toISOString() // TODO: Fix date format to what the db wants
				}
				break;
		}

		const param : any = {
			name: 'p' + idx,
			value: {
				[key]: paramValue
			}
		}

		if (typeHint) {
			param.typeHint = typeHint
		}

		return param
	})
	console.log('parameters', parameters)
	console.log('sql', sql)
	const response = await rds.executeStatement({
		resourceArn: process.env.POSTGRES_DB_ARN,
		secretArn: process.env.POSTGRES_SECRET_ARN,
		database: process.env.POSTGRES_DB_NAME,
		sql: sql,
		parameters: parameters,
		includeResultMetadata: true

	}).promise();
	return response
}

export async function query(sql: string, params: any[]) : Promise<object[]> {
	const res = await executeStatement(sql, params)

	return res.records.map((record) => {
		const obj = {}
		// Column data isn't returned with each record, so we build the object ourselves
		res.columnMetadata.forEach((col, idx) => {
			console.log('-------')
			const colName = col.name
			console.log('col name', colName)
			let value : any

			const returnedValue = record[idx]
			console.log('returned value', returnedValue)
			if (returnedValue.isNull) {
				console.log('make it null')
				value = null
			} else {
				// This will turn {stringValue: 'hi'} into 'hi'
				const things = Object.entries(returnedValue)
				console.log('things', things)
				value = things[0][1]
				console.log('value', value)
			}

			obj[colName] = value
		})
		return obj
	})
}

export async function getObj(tableName:string, id:string){
  try{
    let _sql = `SELECT * FROM ${tableName} WHERE id=?`

    const result = await executeStatement(_sql, [id])
		console.debug("GET SQL: ", _sql);
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
    console.debug("GET MANY SQL: ", _sql);
    const result = await executeStatement(_sql)

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
    const updateString:string[] = [];
    const params : any[] = []
    for(let key of Object.keys(updatedObj)){
      updateString.push(`${key} = ?`);
      params.push(updateObj[key])
    }
    params.push(objID)

    let _sql = `UPDATE ${tableName} SET ${updateString.join(",")} WHERE id=?`;
    const result = await executeStatement(_sql, params)
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
export async function query2(sql:string){
  try{
		const result = await executeStatement(sql)


    if(result.records){
      let records = [];
      for(let record of result.records){
        records.push(valuesArray(record));
      }
      return records;
    } else {
      return result;
    }
  } catch (e) {
    throw e;
  }
}

export async function getColumnNames(tableName:string){
  try{
  	const sql = `SELECT json_object_keys(to_json((SELECT t FROM public.${tableName} t LIMIT 1)))`
    const columnResult = await executeStatement(sql)

    let columnNames:string[] = []
    for(let columnNameArr of columnResult.records[0]){
      columnNames.push(columnNameArr[0]['stringValue']);
    }

    return columnNames;
  }catch(e){
    throw e;
  }
}

/**
 * Normalizes an RDS record to into a array of values
 * @param rdsValues
 * @returns
 */
export function valuesArray(rdsValues:any[]): any[]{
  let values:any[] = [];
  for(let valueObj of rdsValues){
    values.push(Object.values(valueObj)[0]);
  };
  return values;
}


/**
 * Converts lists of column names and normalized value array (from valuesArray()) into an object
 * @param columNames
 * @param values
 * @returns
 */
export function stitchObject(columNames:string[], values:any[]){
  let obj:any = {}

  for(let i=0; i<columNames.length; i++){
    obj[columNames[i]] = values[i]
  };

  return obj;
}
