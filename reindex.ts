import './load-yaml-env'
import {reindexAllAssets} from "./src/lib/assets";

if (!process.env.IS_OFFLINE) {
	console.log('Must run in offline mode so you dont connect to live ElasticSearch')
	process.exit(1)
}

async function run () {
	if (process.env.STAGE != 'dev' || true) {
		console.log('')
		console.log(`WARNING: Running in stage "\x1b[35m${process.env.STAGE}\x1b[0m" !!!`)
		console.log('You are about to \x1b[33m WIPE ELASTICSEARCH\x1b[0m and refill it')
		console.log(`You have 5s to cancel if you need to...`)
		console.log('')
		await new Promise((res) => {
			setTimeout(() => {
				res()
			}, 5000)
		})
	}

	// Clear and re-index in elastic search
	//await reindexAllBundles()
	await reindexAllAssets()
	process.exit(0)
}
run()
