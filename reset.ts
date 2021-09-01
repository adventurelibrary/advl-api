import './load-yaml-env'
import {reindexAllBundles} from "./src/lib/bundle";
import {reindexAllAssets} from "./src/lib/assets";
import fs from 'fs'
import {query} from './src/api/common/postgres'

if (!process.env.IS_OFFLINE) {
	console.log('Must run in offline mode so you dont connect to live ElasticSearch')
	process.exit(1)
}

async function run () {
	if (process.env.STAGE != 'dev') {
		console.log(`WARNING: Running in stage "\x1b[35m${process.env.STAGE}" !!! You have 5s to cancel if you need to.`)
		console.log('You are about to \x1b[31m" WIPE THE DATABASE\x1b[0m')
		await new Promise((res) => {
			setTimeout(() => {
				res()
			}, 5000)
		})
	}

	// Rebuild the database and its chema
	const schema = fs.readFileSync('./src/resources/postgres.sql', 'utf8');
	await query(schema)

	// Insert the seed data
	const seed = fs.readFileSync('./src/resources/seed.sql', 'utf8');
	await query(seed)

	// Clear and re-index in elastic search
	await reindexAllBundles()
	await reindexAllAssets()
	process.exit(0)
}
run()
