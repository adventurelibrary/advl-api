import { fstat } from "fs";

import * as fs from 'fs';
import * as fetch from 'node-fetch';

test('Fetch upload preflight from server', () => {
  //Read file from disk
  let map = fs.readFileSync('./upload_test/Mountain_Dig_Site.png');
  console.log("Map File: ", map);

  //Send metadata along with file to server for preflight
  
});

