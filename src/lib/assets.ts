import {bulkIndex, clearIndex, search} from "../api/common/elastic";
import {Asset, AssetUnlock, REQ_Get_Signature, AssetSearchOptions} from "../interfaces/IAsset";
import {GetTag} from "../constants/categorization";
import * as db from '../api/common/postgres';
import {deleteObj, getObjects, getWritePool, query} from "../api/common/postgres";
import {idgen} from "../api/common/nanoid";
import slugify from "slugify";
import {Validation} from "./errors";
import {ErrAssetNotFound, ErrAssetNotUnlocked, ErrNoAssetPermission} from "../constants/errors"
import {User} from "../interfaces/IEntity";
import { isAdmin } from "./user";

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
export function validateAssetQuery(req : AssetSearchOptions) {
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
		if (e && e.meta && e.meta.statusCode === 404) {
			throw ErrAssetNotFound
		}
		throw e
	}
}


export async function getAsset (id: string) : Promise<Asset | undefined> {
	const _sql = `SELECT a.*, c.name as creator_name, c.slug as creator_slug
	FROM ${process.env.DB_ASSETS} a, ${process.env.DB_CREATORS} c
	WHERE a.creator_id = c.id
	AND a.id = $1
	AND a.deleted = false
	`

	const rows:Asset[] = await query(_sql, [id])
	if (!rows || !rows[0]) {
		return undefined
	}
	return rows[0];
}

export async function updateAsset (original:Asset, updates: any) {
	//validate stuff
	//TODO Validate Tags actually exist
	//TODO Validate that RevenueShare creatorIDs actually exist
	//TODO Validate Category actually exists
	//TODO Validate Visibility exists
	//TODO Validate Collection ID
	//TODO Validate unlock_price is positive

	original.category = updates.hasOwnProperty('category') ? updates.category : original.category;
	original.deleted = updates.hasOwnProperty('deleted') ? updates.deleted : original.deleted;
	original.description = updates.hasOwnProperty('description') ? updates.description : original.description;
	original.name = updates.hasOwnProperty('name') ? updates.name : original.name;
	original.original_file_ext = updates.hasOwnProperty('original_file_ext') ? updates.original_file_ext : original.original_file_ext;
	original.revenue_share = updates.hasOwnProperty('revenue_share') ? updates.revenue_share : original.revenue_share;
	original.size_in_bytes = updates.hasOwnProperty('size_in_bytes') ? updates.size_in_bytes : original.size_in_bytes;
	original.tags = updates.hasOwnProperty('tags') ? updates.tags : original.tags;
	original.unlock_price = updates.hasOwnProperty('unlock_price') ? updates.unlock_price : original.unlock_price;
	original.visibility = updates.hasOwnProperty('visibility') ? updates.visibility : original.visibility;

	await db.updateObj(process.env.DB_ASSETS, original.id, original)
}

export async function updateAssetAndIndex (original: Asset, updates: any) {
	await updateAsset(original, updates)
	await updateAssetSearchById(original.id)
}

export async function createNewAsset(req:REQ_Get_Signature): Promise<Asset> {
	let newAsset: Asset = {
		id: idgen(),
		category: req.category,
		creator_id: req.creator_id,
		deleted: false,
		description: req.description,
		filetype: "IMAGE",
		name: req.name,
		original_file_ext: 'UNKNOWN',
		revenue_share: req.revenue_share,
		size_in_bytes: 0,
		slug: slugify(req.name).toLowerCase(),
		tags: req.tags,
		unlock_count: 0,
		unlock_price: req.unlock_price,
		uploaded: new Date(),
		visibility: "PENDING",
	}

	await db.insertObj(process.env.DB_ASSETS, newAsset);
	console.log(`PENDING ASSET CREATED\n`, newAsset);
	return newAsset;
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
	const sql = `SELECT a.*, c.name as creator_name, c.slug as creator_slug
		FROM ${process.env.DB_ASSETS} a
		JOIN ${process.env.DB_CREATORS} c 
		ON c.id = a.creator_id
		WHERE a.deleted = false`
	const assets:Asset[] = await query(sql, [])
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

type DeleteAssetResult = 'deleted' | 'hidden'
// Attempts to hard delete an asset
// This is when a creator is attempting to delete an asset
// It will do either a hard or soft delete, depending on if anyone has bought it
// If it has been purchased, it will just mark the asset as deleted so it won't show up
// in any new searches
// If it has not been purchases it will be purged from our db, and from ElasticSearch, and its files
// will be deleted
export async function deleteAsset (asset: Asset) : Promise<DeleteAssetResult> {
	const bought = await assetHasPurchases(asset.id)
	if (bought) {
		await updateAsset(asset, {deleted: true})
		return 'hidden'
	}
	await deleteAssetFromSearch(asset.id)
	await deleteObj(process.env.DB_ASSETS, asset.id)
	// TODO: delete the files from transloadit
	return 'deleted'
}

export async function deleteAssetFromSearch (assetId: string) {
	await search.delete({
		index: process.env.INDEX_ASSETDB,
		id: assetId,
	});
}

// Just returns whether one user has ever purchased this asset
// This is done so we can refuse to hard delete an asset
export async function assetHasPurchases (assetId: string) : Promise<boolean> {
	console.log('Checking if ' + assetId + ' has any purchases')
	return new Promise((res) => {
		// We don't allow purchases yet, so this will always return false
		res(false)
	})
}

export async function verifyUserHasUnlockedAsset (userId: string, assetId: string) {
	const ul = await getUserAssetUnlock(userId, assetId)
	if (!ul) {
		throw ErrAssetNotUnlocked
	}
}

// Will throw an error if the user doesn't not have write access to this asset
export async function verifyUserHasAssetAccess (user: User, assetId: string) {
	return await verifyUserHasAssetsAccess(user, [assetId])
}

/**
 * Confirms that the user has write access to ALL the asset IDs passed in
 * Either they're an admin, or they are a member of each of the asset's creators
 * @param user
 * @param assetIds
 */
export async function verifyUserHasAssetsAccess (user: User, assetIds: string[]) {
	if (!user) {
		throw ErrNoAssetPermission
	}

	if (isAdmin(user)) {
		return;
	}

	// Count how many rows exist where this user is a member of the creator
	// of the asset
	// If there is an asset in here that they aren't a member of the creator of,
	// it won't be totalled up by the COUNT()
	const rows : any[] = await db.query(`
		SELECT COUNT(*) as num
		FROM ${process.env.DB_ASSETS} a, ${process.env.DB_CREATORMEMBERS} cm
		WHERE a.creator_id = cm.creator_id
		AND cm.user_id = $1
		AND a.id = ANY ($2)
  `, [user.id, assetIds])

	// If the number equals the assetIds then this user has access to all of them
	const total = rows[0].num
	if (total == assetIds.length) {
		return
	}

	throw ErrNoAssetPermission
}

/**
 * Will take in an array of Assets and will return a copy of the array
 * Where each asset will have `unlocked` boolean set appropriately,
 * based on whether the passed in user has unlocked that asset
 * User can be undefined for when the request has no logged in user
 *
 * We do this as one query after getting the data from ElasticSearch
 * so that EC doesn't have any user-specific information. Doing it
 * as one query for all assets instead of one query per asset is
 * done cause it's faster.
 *
 * @param assets
 * @param user
 */
export async function setAssetsUnlockedForUser(assets: Asset[], user: User | undefined) : Promise<Asset[]> {
	// If you aren't logged in, then none are unlocked
	if (!user) {
		return assets.map((asset) => {
			asset.unlocked = false
			return asset
		})
	}

	// We query the database for any unlocks the user has for these provided assets
	const ids = assets.map(asset => asset.id)
	const unlocks = await getUserUnlocksForAssetIds(user.id, ids)

	// Return a new copy where each asset's `unlock` boolean is set based on whether
	// the asset_id exists in the list of unlocks we just queryed for
	return assets.map((asset) => {
		const unlocked = unlocks.findIndex(u => u.asset_id == asset.id) >= 0
		asset.unlocked = unlocked
		return asset
	})
}

// Does the same as the function above, but does it on a single asset
export async function setAssetUnlockedForUser(asset: Asset, user: User | undefined) : Promise<Asset> {
	const modified = await setAssetsUnlockedForUser([asset], user)
	return modified[0]
}

export async function getUserUnlocksForAssetIds (userId: string, assetIds: string[]) : Promise<AssetUnlock[]> {
	const res = <AssetUnlock[]>await query(`SELECT * FROM ${process.env.DB_ASSET_UNLOCKS} WHERE user_id = $1 AND asset_id = ANY($2)`, [userId, assetIds])
	return res
}

export async function getUserAssetUnlocks (userId: string, skip: number, limit: number) : Promise<AssetUnlock[]> {
	const res = <AssetUnlock[]>await getObjects(`SELECT * FROM ${process.env.DB_ASSET_UNLOCKS} WHERE user_id = $1`, [userId], skip, limit, 'created_date DESC')
	return res
}

export async function getUserAssetUnlock (userId: string, assetId: string) : Promise<AssetUnlock | undefined> {
	const res = await getUserUnlocksForAssetIds(userId, [assetId])
	return res[0]
}

/**
 * This will insert a new unlock for the given user for the asset
 * The user will have their total coins adjusted
 */
export async function userPurchaseAssetUnlock (userId, asset: Asset) {
	const client = await getWritePool().connect()

	try {
		await client.query('BEGIN')
		const res = await client.query(`INSERT INTO ${process.env.DB_ASSET_UNLOCKS} (user_id, asset_id, coins_spent) 
			VALUES ($1, $2, $3) RETURNING id;`, [userId, asset.id, asset.unlock_price])
		const unlockId = res.rows[0].id

		const insertCoinSQL = `INSERT INTO ${process.env.DB_ENTITY_COINS} (entity_id, num_coins, unlock_id)
			VALUES ($1, $2, $3)`
		await client.query(insertCoinSQL, [userId, asset.unlock_price * -1, unlockId])

		// TODO: Calculate the split for Adventure Library and the Creator, and insert those
		// entries into entity_coins as well

		await client.query('COMMIT')
	} catch (e) {
		await client.query('ROLLBACK')
		throw e
	} finally {
		client.release()
	}
}
