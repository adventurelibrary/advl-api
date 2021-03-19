import {DocumentClient} from 'aws-sdk/clients/dynamodb';

/// ENV \\\
const local_dyn_endpoint = "http://localhost:8000"
///////////

export let dyn: DocumentClient;
if(process.env.IS_OFFLINE == 'true') {
  dyn = new DocumentClient({
    region: 'localhost',
    endpoint: local_dyn_endpoint 
  })
} else {
  //runs in lambda environment
  //will automatically pull in the dynamodb in the aws account
  dyn = new DocumentClient(); 
}