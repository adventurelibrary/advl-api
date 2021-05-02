import {RDSDataService} from 'aws-sdk';

const rds = new RDSDataService({region:'us-east-1'})

main();

async function main(){
  try{
    //let newUserSql = `INSERT INTO Users2(id, username, email, notification_preferences, last_seen, join_date) VALUES('123', 'spacemandev', 'spacemandev@test.com', '{}', '${new Date().toISOString()}', '${new Date().toISOString()}')`
    //resposne: {"generatedFields":[],"numberOfRecordsUpdated":1}
    
    //let getUserSql = `SELECT * FROM Users2 WHERE id='123'`
    //response: {"numberOfRecordsUpdated":0,"records":[[{"stringValue":"123"},{"stringValue":"spacemandev"},{"stringValue":"spacemandev@test.com"},{"stringValue":"{}"},{"stringValue":"2021-05-02 21:30:52.349"},{"stringValue":"2021-05-02 21:30:52.349"}]]}

    let getColumnsSql = `SELECT json_object_keys(to_json((SELECT t FROM public.Users2 t LIMIT 1)))`
    //response: {"numberOfRecordsUpdated":0,"records":[[{"stringValue":"id"}],[{"stringValue":"username"}],[{"stringValue":"email"}],[{"stringValue":"notification_preferences"}],[{"stringValue":"last_seen"}],[{"stringValue":"join_date"}]]}
    
    const result = await rds.executeStatement({
      resourceArn: "arn:aws:rds:us-east-1:575357632480:cluster:advl-test-db-2",
      secretArn: "arn:aws:secretsmanager:us-east-1:575357632480:secret:rds-db-credentials/cluster-CSIWAG2LX6VEWLR23DWNHFJ5VU/advl-EA98Jl",
      sql: getColumnsSql,
      database: "adventurelibrary"
    }).promise();
    console.log(JSON.stringify(result));  
  } catch (e){
    console.error(e);
  }
}
