import {search} from "../api/common/elastic";
import {Asset, REQ_Get_Signature, REQ_Query} from "../interfaces/IAsset";
import {GetTag} from "../constants/categorization";
import * as db from '../api/common/postgres';
import {getObj} from "../api/common/postgres";
import {idgen} from "../api/common/nanoid";
import slugify from "slugify";
import CustomSQLParam from "../api/common/customsqlparam";
import {Validation} from "./errors";

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

// Returns an asset from ElasticSearch
export async function searchAsset (id: string) : Promise<Asset> {
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

export async function getAsset (id: string) : Promise<Asset> {
	return <Asset> await getObj(process.env.DB_ASSETS, id)
}

export async function updateAsset (original:Asset, updates: any) {
	//validate stuff
	//TODO Validate Tags actually exist
	//TODO Validate that RevenueShare creatorIDs actually exist
	//TODO Validate Category actually exists
	//TODO Validate Visibility exists
	//TODO Validate Collection ID
	//TODO Validate unlock_price is positive

	original.visibility = updates.hasOwnProperty('visibility') ? updates.visibility : original.visibility;
	original.name = updates.hasOwnProperty('name') ? updates.name : original.name;
	original.description = updates.hasOwnProperty('description') ? updates.description : original.description;
	//original.collectionID = updates.hasOwnProperty('collectionID') ? updates.collectionID : original.collectionID;
	original.category = updates.hasOwnProperty('category') ? updates.category : original.category;
	original.tags = updates.hasOwnProperty('tags') ? updates.tags : original.tags;
	original.unlock_price = updates.hasOwnProperty('unlock_price') ? updates.unlock_price : original.unlock_price;
	original.revenue_share = updates.hasOwnProperty('revenue_share') ? updates.revenue_share : original.revenue_share;

	const sets = assetToDatabaseWrite(original)
	console.log("Updated Asset: ", sets)
	await db.updateObj(process.env.DB_ASSETS, original.id, sets)

	await updateAssetSearch(original)
}

export async function createNewAsset(req:REQ_Get_Signature): Promise<Asset> {
	let newAsset: Asset = {
		id: idgen(),
		slug: slugify(req.name).toLowerCase(),
		size_in_bytes: 0,
		uploaded: new Date(),
		visibility: "PENDING",
		original_file_ext: 'UNKOWN',
		filetype: "IMAGE",
		creator_id: req.creator_id,
		unlock_count: 0,
		name: req.name,
		description: req.description,
		category: req.category,
		tags: req.tags,
		unlock_price: req.unlock_price,
		revenue_share: req.revenue_share
	}


	const dbWrite = assetToDatabaseWrite(newAsset)
	await db.insertObj(process.env.DB_ASSETS, dbWrite);
	console.log(`PENDING ASSET CREATED\n`, newAsset);
	return newAsset;
}

export function assetToDatabaseWrite (asset: Asset) : any {
	// We have to pass the parameter to the Data API as a string
	// So we have to change our query to cast it in the db from string
	// to our custom type
	const dbwrite = <any>asset
	dbwrite.visibility = new CustomSQLParam({
		value: asset.visibility,
		castTo: 'visibility'
	})

	dbwrite.filetype = new CustomSQLParam({
		value: asset.filetype,
		castTo: 'filetype'
	})

	dbwrite.category = new CustomSQLParam({
		value: asset.category,
		castTo: 'category'
	})

	// TODO: Protected against SQL injection
	dbwrite.tags = new CustomSQLParam({
		value: '{' + asset.tags.map(t => '"' + t + '"').join(',') + '}',
		castTo: 'TEXT[]',
	})
	return dbwrite
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


	const result = await search.bulk({
		refresh: true,
		body
	})

	if (result.body.errors) {
		throw new Error(`Search index returned errors` + JSON.stringify(result.body.items))
	}

	return result
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

export function validateAsset (asset: Asset) {
	const val = new Validation()
	val.validateRequired(asset.name, {
		message: 'Name is required',
		field: 'name'
	})
	val.validateRequired(asset.creator_id, {
		message: 'Please select a creator',
		field: 'creator_id'
	})
	val.validateRequired(asset.category, {
		message: 'Please select a category',
		field: 'category'
	})
	val.throwIfErrors()
}
