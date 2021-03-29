import { categorization } from './categorization';
import {test_fetch_preflight} from './upload';


main();

async function main(){
  //Test Runner
  await test_fetch_preflight();
  await categorization();
}

