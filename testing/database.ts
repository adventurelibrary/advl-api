import {RDSDataService} from 'aws-sdk';

const rds = new RDSDataService({region:'us-east-1'})

main();

async function main(){
  try{
    const result = await rds.executeStatement({
      resourceArn: "arn:aws:rds:us-east-1:575357632480:cluster:advl-test-db-2",
      secretArn: "arn:aws:secretsmanager:us-east-1:575357632480:secret:rds-db-credentials/cluster-CSIWAG2LX6VEWLR23DWNHFJ5VU/advl-EA98Jl",
      sql: "select * from information_schema.schemata",
      database: "adventurelibrary"
    }).promise();
    console.log(JSON.stringify(result));  
  } catch (e){
    console.error(e);
  }
}
