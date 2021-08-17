import {Asset, AssetSearchOptions, Category} from "../interfaces/IAsset"
import {getEventQueryCSV} from "../api/common/events";
import {search} from "../api/common/elastic";
import {transformAsset} from "../api/assets/asset";
import {APIGatewayProxyEventQueryStringParameters} from "aws-lambda";

type AssetSearchResult = {
	total: number,
	assets: Asset[]
	params?: any
}

export function getEventQueryFromSize (eventParams: APIGatewayProxyEventQueryStringParameters) : {from: number, size: number} {
	let size = 10
	let from = 0

	if (eventParams) {
		size = parseInt(eventParams.size)
		from = parseInt(eventParams.from)
	}

	if (isNaN(size) || size <= 0) {
		size = 10
	} else if (size > 50) {
		size = 50 // This is so someone doesn't do ?size=1432432 and cause huge lag
	}

	if (isNaN(from) || from <= 0) {
		from = 0
	}
	return {
		from,
		size
	}
}

/**
 * Converts the query string parameters that serverless has, into our custom type: AssetSearchOptions
 * This function will allow accept certain query parameters, and will ignore some other
 * This is so a user can't append ?visibility=all to see everything
 * Extra fields for AssetSearchOptions can be set on a per-route basis
  * */
export function evtQueryToAssetSearchOptions (eventParams: APIGatewayProxyEventQueryStringParameters) : AssetSearchOptions {
	console.log(eventParams);
	const queryObj:AssetSearchOptions = {};

	// Certain fields are comma delimited, which we override here
	queryObj.tags = getEventQueryCSV(eventParams, 'tags')
	queryObj.categories = <Category[]>getEventQueryCSV(eventParams, 'categories')

	const {from, size} = getEventQueryFromSize(eventParams)

	queryObj.from = from
	queryObj.size = size

	return queryObj
}

/**
 * Searches ElasticSearch for a page of assets.
 * @param opts
 */
export async function searchAssets (opts: AssetSearchOptions) : Promise<AssetSearchResult> {
	let from = opts.from ? opts.from : 0
	let size = opts.size ? opts.size : 10

	const text = opts.text
	let _query : any = {
		"bool": {
			"must": [{
				"match": {
					"deleted": false
				}
			}],
			"filter": [
				{
					"match": {
						"visibility" : "PUBLIC"
					}
				}
			]
		}
	}

	// We sometimes search for a specific set of assets
	// This can be done from the "Get My Unlocked Assets" route, where we get the user's
	// first X unlocked assets by date unlocked, and just search for those
	if (opts.assetIds && opts.assetIds.length) {
		_query.bool.must.push({
			ids: {
				values: opts.assetIds
			}
		})
	}

	if (opts.visibility == 'all') {
		_query.bool.filter = [];
	}

	if (opts.creator_ids && opts.creator_ids) {
		const creatorFilter = {
			bool: {
				minimum_should_match: 1,
				should: []
			}
		}

		opts.creator_ids.forEach((id) => {
			creatorFilter.bool.should.push({
				match: {
					creator_id: id
				}
			})
		})
		_query.bool.filter.push(creatorFilter)
	}


	// Performs a text search on 'name' and 'description' and sorts by score
	// Fuzzy search means that "froze" will match "Frozen" and "kings" will match "King"
	if (text) {
		_query.bool.must.push({
			"dis_max": {
				"tie_breaker": 0.7,
				"queries": [
					{
						"fuzzy": {
							'name': text
						}
					},
					{
						"fuzzy": {
							'description': text
						}
					}
				]
			}
		})
	}

	// Asset must match ALL provided tags
	// This the equivalent of ' AND 'Archer' IN asset.tags AND 'Barbarian' IN asset.tags
	if (opts.tags && opts.tags.length) {
		opts.tags.forEach((tag) => {
			_query.bool.must.push({
				"match": {
					"tags": tag
				}
			})
		})
	}

	// Asset must match ONE of the provided categories
	// This is the equivalent of " AND category IN ('maps', 'scenes')"
	if (opts.categories && opts.categories.length) {
		_query.bool.must.push({
			"terms": {
				"category": opts.categories
			}
		})
	}


	// Query doesn't include ID
	const params = {
		index: process.env.INDEX_ASSETDB,
		body: {
			from: from,
			size: size,
			sort: opts.sort ?
				[{
					[opts.sort] : opts.sort_type
				}]
				:
				[{
					"_score": "desc"
				}],
			query: _query
		}
	}
	//console.log('params', JSON.stringify(params, null, 2))
	let ecResult = await search.search(params)

	// This transform will pretty up any data we need to pretty up, such as the
	// image URLs needing to be properly set up with Transloadit
	const assets : Asset[] = ecResult.body.hits.hits.map((doc:any) => {
		doc._source = transformAsset(doc._source)
		return doc._source
	})

	return {
		total: ecResult.body.hits.total.value,
		assets: assets
	}
}
