import './load-yaml-env'
import fs from 'fs';
import {query} from "./src/api/common/postgres";
import {resetBundles} from "./src/lib/bundle";
import {resetAssets} from "./src/lib/assets";
import neatCsv from 'neat-csv';

async function run () {
	return;
	// Rebuild the database and its chema
	const schema = fs.readFileSync('./src/resources/postgres.sql', 'utf8');
	await query(schema)

	// Insert the seed data
	const seed = fs.readFileSync('./testing/seed/seed.sql', 'utf8');
	await query(seed)

	// Clear and re-index in elastic search
	await resetBundles()
	await resetAssets()
}
run()
/*

// This takes our .env.yaml file contents and hacks it into the process.env
// so that our connection clients will be able to get the connection info (usernames, codes, etc)


*/


async function rebuild() {
	//Rebuild the schema setup for the postgres database
	const schema = fs.readFileSync('./src/resources/postgres.sql', 'utf8');
	await query(schema);

	//Read the CSV files and insert seed data
	let postgresSeedFolderPath = './testing/seed/postgres-staging-7-28-2021';
	let fileNames = fs.readdirSync(postgresSeedFolderPath)
	console.log(fileNames);
	for(let fileName of fileNames){
		let data = fs.readFileSync(`${postgresSeedFolderPath}/${fileName}`, 'utf8');
		let rows = await neatCsv(data);
		console.log(`Processing: ${fileName}`);
		let sql = `INSERT INTO ${fileName.split(".")[0]} (${Object.keys(rows[0]).join(',')}) VALUES \n`
		for(let row of rows){
			let valsql = '('
			for(let value of Object.values(row)){
					valsql += `"${value}",`
			}	
			valsql = valsql.slice(0,valsql.length-1);
			valsql += ')\n';
			sql += valsql;
		}
		console.log(sql);
		await query(sql);
	}
}
rebuild();