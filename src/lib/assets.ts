import {search} from "../api/common/elastic";
import {Asset, REQ_Query} from "../interfaces/IAsset";
import {GetTag} from "../constants/categorization";
import * as db from '../api/common/postgres';

export function validateTags(tags : string[]) {
	if (!tags) {
		return
	}
	for(let i = 0; i < tags.length; i++) {
		const given = tags[i]
		const tag = GetTag(given)
		if (!tag) {
			throw new Error(`Could not find tag or tag alias "${given}`)
		}
	}
}

//@ts-ignore
export function validateAssetQuery(req : REQ_Query) {
	// TODO: Maybe reimplement the tags validation
	//validateTags(req.tags)
}

export async function getAsset (id: string) : Promise<Asset> {
	try{
		const doc = await search.get({
			index: process.env.INDEX_ASSETDB,
			id: id
		})
		return doc.body._source
	} catch (e) {
		throw new Error(`${id} doesn't exist in Index`);
	}
}

export async function updateAsset (updates: any, original:Asset) {
	//validate stuff
	//TODO Validate Tags actually exist
	//TODO Validate that RevenueShare creatorIDs actually exist
	//TODO Validate Category actually exists
	//TODO Validate Visibility exists
	//TODO Validate Collection ID
	//TODO Validate unlockPrice is positive

	const sets : any = {}
	sets.visibility = updates.hasOwnProperty('visibility') ? updates.visibility : original.visibility;
	sets.name = updates.hasOwnProperty('name') ? updates.name : original.name;
	sets.description = updates.hasOwnProperty('description') ? updates.description : original.description;
	sets.collectionID = updates.hasOwnProperty('collectionID') ? updates.collectionID : original.collectionID;
	sets.category = updates.hasOwnProperty('category') ? updates.category : original.category;
	sets.tags = updates.hasOwnProperty('tags') ? updates.tags : original.tags;
	sets.unlockPrice = updates.hasOwnProperty('unlockPrice') ? updates.unlockPrice : original.unlockPrice;
	sets.revenueShare = updates.hasOwnProperty('revenueShare') ? updates.revenueShare : original.revenueShare;

	console.log("Updated Asset: ", sets)
	await db.updateObj(process.env.DB_ASSETS, original.id, sets)

	await updateAssetSearch(original)
}

export async function updateAssetSearch (asset: Asset) {
	// Update ES
	await search.update({
		index: process.env.INDEX_ASSETDB,
		id: asset.id,
		body: {
			doc: asset
		}
	});
}

export async function indexAssetSearch (asset: Asset) {
	// Update ES
	await search.index({
		index: process.env.INDEX_ASSETDB,
		id: asset.id,
		body: asset
	});
}

// This bulk update is based on the example here:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
export async function indexAssetsSearch (assets: Asset[]) {
	const body = assets.flatMap((doc) => {
		return [{
			index: {
				_index: process.env.INDEX_ASSETDB
			}
		}, doc]
	})


	await search.bulk({
		refresh: true,
		body
	})
}

/*
// This will search our dynamo db for ALL assets and sync each one
// to elastic search
// This is useful for development to reset elastic search before running
// route tests
export async function syncAllAssets () : Promise<any[]> {
	let params : any = {
		TableName: process.env.NAME_ASSETDB
	};

	let items;
	const assets : Asset[] = []

	do {
		items = await dyn.scan(params).promise();
		items.Items.forEach((item) => {
			console.log('Adding asset ' + item.name)
			assets.push(item)
		});
		params.ExclusiveStartKey = items.LastEvaluatedKey;
	} while (typeof items.LastEvaluatedKey != "undefined");

	await indexAssetsSearch(assets)

	return assets
}
*/
