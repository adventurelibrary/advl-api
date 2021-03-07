import * as upload from './upload';


export const testURL = "http://localhost:3000/v1/"

main();

async function main(){
  //Test Runner
  await upload.test_fetch_preflight();

}

