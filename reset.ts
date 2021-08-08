import './load-yaml-env'
import fs from 'fs';
import {query} from "./src/api/common/postgres";
import {resetBundles} from "./src/lib/bundle";
import {resetAssets} from "./src/lib/assets";

if (!process.env.IS_OFFLINE) {
	console.log('Must run in offline mode so you dont connect to live ElasticSearch')
	process.exit(1)
}

async function run () {
	// Rebuild the database and its chema
	const schema = fs.readFileSync('./src/resources/postgres.sql', 'utf8');
	await query(schema)

	// Insert the seed data
	const seed = fs.readFileSync('./src/resources/seed.sql', 'utf8');
	await query(seed)

	// Clear and re-index in elastic search
	await resetBundles()
	await resetAssets()
	process.exit(0)
}
run()
/*

// This takes our .env.yaml file contents and hacks it into the process.env
// so that our connection clients will be able to get the connection info (usernames, codes, etc)


*/
