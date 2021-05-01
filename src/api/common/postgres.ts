import {RDSDataService} from 'aws-sdk';
const rds = new RDSDataService({region:'us-east-1'})

export async function insertObj(tableName:string, obj:any){}
export async function getObj(tableName:string, id:string){}
export async function getObjects(tableName:string, query:string){}
export async function updateObj(tableName:string, objID: string, updatedObj:any){}
export async function query(sql:string){}
