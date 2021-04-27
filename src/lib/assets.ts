import {search} from "../api/common/elastic";
import {Asset} from "../interfaces/IAsset";
import {dyn} from "../api/common/database";

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

	original.visibility = updates.visibility ? updates.visibility : original.visibility;
	original.name = updates.name ? updates.name : original.name;
	original.description = updates.description ? updates.description : original.description;
	original.collectionID = updates.collectionID ? updates.collectionID : original.collectionID;
	original.category = updates.category ? updates.category : original.category;
	original.tags = updates.tags ? updates.tags : original.tags;
	original.unlockPrice = updates.unlockPrice ? updates.unlockPrice : original.unlockPrice;
	original.revenueShare = updates.revenueShare ? updates.revenueShare : original.revenueShare;

	console.log("Updated Asset: ", original)
	// Update Dyn
	await dyn.update({
		TableName: process.env.NAME_ASSETDB,
		Key: {
			id: original.id,
			uploaded: original.uploaded
		},
		UpdateExpression: "set visibility = :v, #name = :n, description = :d, collectionID = :cID, category = :cat, tags = :t, unlockPrice = :uP",
		ExpressionAttributeNames: {
			"#name": "name"
		},
		ExpressionAttributeValues: {
			":v": original.visibility,
			":n": original.name,
			":d": original.description,
			":cID": original.collectionID,
			":cat": original.category,
			":t": original.tags,
			":uP": original.unlockPrice
		}
	}).promise();

	updateAssetSearch(original)
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
