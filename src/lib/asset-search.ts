import {Asset, AssetSearchOptions, AssetSortField, AssetSortType, Category} from "../interfaces/IAsset"
import {getEventQueryCSV} from "../api/common/events";
import {search} from "../api/common/elastic";
import {transformAsset} from "../api/assets/asset";
import {APIGatewayProxyEventQueryStringParameters} from "aws-lambda";
import {LIMIT_LG} from "../constants/constants";

type AssetSearchResult = {
	total: number,
	assets: Asset[]
	params?: any
}

export function getEventQueryFromAndSize (eventParams: APIGatewayProxyEventQueryStringParameters, defaultSize = 10, maxSize = LIMIT_LG) : {from: number, size: number} {
	let size = defaultSize
	let from = 0

	if (maxSize < defaultSize) {
		maxSize = defaultSize
	}

	if (eventParams) {
		size = parseInt(eventParams.size)
		from = parseInt(eventParams.from)
	}

	if (isNaN(size) || size <= 0) {
		size = defaultSize
	} else if (size > maxSize) {
		size = maxSize // This is so someone doesn't do ?size=1432432 and cause huge lag
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
	const queryObj:AssetSearchOptions = {};
	eventParams = eventParams || {}

	// Certain fields are comma delimited, which we override here
	queryObj.tags = getEventQueryCSV(eventParams, 'tags')
	queryObj.categories = <Category[]>getEventQueryCSV(eventParams, 'categories')
	queryObj.creator_slugs = <string[]>getEventQueryCSV(eventParams, 'creator_slugs')
	queryObj.text = (eventParams.text) || ''

	const {from, size} = getEventQueryFromAndSize(eventParams)

	queryObj.from = from
	queryObj.size = size

	if (eventParams.sort) {
		if (eventParams.sort === 'date') {
			queryObj.sort = 'published_date.raw'
		} else if (eventParams.sort === 'name') {
			queryObj.sort = 'name.raw'
		} else if (eventParams.sort === 'uploaded') {
			queryObj.sort = 'uploaded.raw'
		}	else if (eventParams.sort === 'relevance') {
			queryObj.sort = '_score'
		} else {
			queryObj.sort = <AssetSortField>eventParams.sort
		}

		if (eventParams.sort_direction) {
			queryObj.sort_direction = <AssetSortType>eventParams.sort_direction
		}
	}


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

	/**
	 * By default we only return assets that have completed uploading
	 * For creators we want them to also be able to view pending and failed
	 * assets
	 */
	if (opts.upload_status !== 'all') {
		_query.bool.filter.push({
			match: {
				'upload_status': 'COMPLETE',
			}
		})
	}

	/**
	 * Only return assets from these creators
	 * Creator IDs most likely provided by our backend code, not provided by the client's request
	 */
	if (opts.creator_ids && opts.creator_ids.length > 0) {
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


	/**
	 * Only return assets from these creators
	 * Creator Slugs most likely comes from a client's request
	 */
	if (opts.creator_slugs && opts.creator_slugs.length > 0) {
		const slugFilter = {
			bool: {
				minimum_should_match: 1,
				should: []
			}
		}

		opts.creator_slugs.forEach((slug) => {
			slugFilter.bool.should.push({
				match: {
					creator_slug: slug
				}
			})
		})
		_query.bool.filter.push(slugFilter)
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

	let sortField = opts.sort || '_score'
	let sortDirection = opts.sort_direction || 'desc'
	const sort = [{[sortField]: sortDirection}]

	// Query doesn't include ID
	const params : any = {
		index: process.env.INDEX_ASSETDB,
		body: {
			from: from,
			size: size,
			sort: sort,
			query: _query
		},
	}

	/**
	 * This option makes the results more consistent, but adds more time to the request
	 * We only enable this feature when we're in development mode. We do this so our tests
	 * can pass. Without it, the order of results can be inconsistent.
	 * SO Explanation: https://stackoverflow.com/a/47768779/6131159
	 * Documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html#search-type
	 */
	if (process.env.SLS_STAGE === 'dev') {
		params.search_type = 'dfs_query_then_fetch'
	}

	console.log('params', JSON.stringify(params, null, 2))

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
