import {bulkIndex, clearIndex, search} from "../api/common/elastic";
import {Asset, REQ_Get_Signature, REQ_Query} from "../interfaces/IAsset";
import {GetTag} from "../constants/categorization";
import * as db from '../api/common/postgres';
import {query} from "../api/common/postgres";
import {idgen} from "../api/common/nanoid";
import slugify from "slugify";
import CustomSQLParam from "../api/common/customsqlparam";
import {APIError, Validation} from "./errors";
import {User} from "../interfaces/IUser";

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

export async function getAsset (id: string) : Promise<Asset | undefined> {
	const rows = await query<Asset>(`SELECT a.*, c.name as creator_name
FROM assets a, creators c
WHERE a.creator_id = c.id
AND a.id = :id
	`, {id: id})
	if (!rows || !rows[0]) {
		return undefined
	}
	return mapAssetRow(rows[0])
}

// The data we get back from the DB might not be in a form that we want our javascript
// to work with, so we transfer it here
// For example, string dates need to become dates, JSON fields need to become objects
function mapAssetRow (row: any) : Asset {
	const asset = <Asset>row
	asset.uploaded = new Date(row.uploaded)
	asset.revenue_share = JSON.parse(row.revenue_share)
	return asset
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
	original.size_in_bytes = updates.hasOwnProperty('size_in_bytes') ? updates.size_in_bytes : original.size_in_bytes;
	original.original_file_ext = updates.hasOwnProperty('original_file_ext') ? updates.original_file_ext : original.original_file_ext;

	const sets = assetToDatabaseWrite(original,false)
	console.log("Updated Asset: ", sets)
	await db.updateObj(process.env.DB_ASSETS, original.id, sets)
}

export async function updateAssetAndIndex (original: Asset, updates: any) {
	await updateAsset(original, updates)
	await updateAssetSearchById(original.id)
}

export async function createNewAsset(req:REQ_Get_Signature): Promise<Asset> {
	let newAsset: Asset = {
		id: idgen(),
		slug: slugify(req.name).toLowerCase(),
		size_in_bytes: 0,
		uploaded: new Date(),
		visibility: "PENDING",
		original_file_ext: 'UNKNOWN',
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

	const dbWrite = assetToDatabaseWrite(newAsset, true)
	const id = await db.insertObj(process.env.DB_ASSETS, dbWrite);
	console.log(`PENDING ASSET CREATED\n`, newAsset);
	newAsset.id = id
	return newAsset;
}

export function assetToDatabaseWrite (asset: Asset, isInsert: boolean) : any {
	// We have to pass the parameter to the Data API as a string
	// So we have to change our query to cast it in the db from string
	// to our custom type
	const dbwrite = <any>Object.assign({}, asset)
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

	// Delete any fields that might sneak int
	delete dbwrite.creator_name

	if (!isInsert) {
		delete dbwrite.id
	}

	return dbwrite
}


export async function indexAssetSearch (asset: Asset) {
	// Update ES. This will insert it to ES if it's not on elasticsearch
	await search.index({
		index: process.env.INDEX_ASSETDB,
		id: asset.id,
		body: getAssetSearchBody(asset)
	});
}

// This is the data we want to send to Elastic Search
function getAssetSearchBody (asset: Asset) : any {
	const data = Object.assign({}, asset)
	delete data.revenue_share
	return data
}

export async function updateAssetSearchById (id: string) {
	const asset = await getAsset(id)
	return await indexAssetSearch(asset)
}
/*
export async function indexAssetSearch (asset: Asset) {
	// Update ES
	await search.index({
		index: process.env.INDEX_ASSETDB,
		id: asset.id,
		body: asset
	});
}*/

// This bulk update is based on the example here:
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
export async function indexAssetsSearch (assets: Asset[]) {
	return bulkIndex(process.env.INDEX_ASSETDB, assets, getAssetSearchBody)
}

export async function reindexAssetsSearch (assets: Asset[]) {
	await clearIndex(process.env.INDEX_ASSETDB)
	return bulkIndex(process.env.INDEX_ASSETDB, assets, getAssetSearchBody)
}

export async function resetAssets () {
	const sql = `SELECT a.*, c.name as creator_name
FROM assets a
JOIN creators c 
ON c.id = a.creator_id`
	const assets = await query<Asset>(sql)
	await reindexAssetsSearch(assets)
}

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

export async function verifyUserHasAssetAccess (user: User, assetIds: string[]) {
	if (user.is_admin) {
		return
	}

	console.log('asset ids to check', assetIds)

	// Count how many rows exist where this user is a member of the creator
	// of the asset
	// If there is an asset in here that they aren't a member of the creator of,
	// it won't be totalled up by the COUNT()
	const rows : any[] = await db.query(`
SELECT COUNT(*) as num
FROM assets a, creatormembers cm
WHERE a.creator_id = cm.creator_id
AND cm.user_id = ?
AND a.id IN (?)
	`, [user.id, assetIds])

	console.log('rows', rows)
	// If the number equals the assetIds then this user has access to all of them
	const total = rows[0].num
	if (total == assetIds.length) {
		return
	}

	throw new APIError({
		status: 403,
		key: 'no_asset_access',
		message: 'You do not have permission to access those assets'
	})
}
