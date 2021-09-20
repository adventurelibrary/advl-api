import {Creator} from '../../interfaces/IEntity';
import {idgen} from "../common/nanoid";
import {newHandler} from "../common/handlers";
import {
  getCreators,
  getTotalUserCreators,
  getUserCreators,
  insertCreator,
  updateCreator,
  validateCreator
} from "../../lib/creator";
import {evtQueryToAssetSearchOptions, searchAssets} from "../../lib/asset-search";

/**
 * The private route to fetch a creator
 * Used by admins and users who have permission on the creator
 */
export const creator_manage_get = newHandler({
  requireCreatorPermission: true,
}, async ({creator}) => {
  return {
    status: 200,
    body: creator
  }
})

/**
 * The private route to fetch a creator's assets
 * Used by admins and users who have permission on the creator
 * Will return their hidden assets
 */
export const creator_manage_assets = newHandler({
  requireCreatorPermission: true,
}, async ({creator, event}) => {
  const searchOptions = evtQueryToAssetSearchOptions(event.queryStringParameters)
  searchOptions.visibility = 'all'
  searchOptions.upload_status = 'all'
  searchOptions.creator_ids = [creator.id]

  // We default to sorting the most recently uploaded ones
  if (!searchOptions.sort) {
    searchOptions.sort = 'uploaded.raw'
    searchOptions.sort_type = 'desc'
  }
  const searchResult = await searchAssets(searchOptions)

  return {
    status: 200,
    body: {
      creator: creator,
      assets: searchResult
    }
  }
})


// Get the list of creators that this user has permissions with
// Will return ALL of them, no pagination is done
// Checks the creatormembers table, so admins will likely get 0 results
export const creators_manage_get_mine = newHandler({
  requireUser: true,
}, async ({user}) => {
  const rows = await getUserCreators(user)
  const total = await getTotalUserCreators(user)
  return {
    status: 200,
    body: {
      creators: rows,
      total: total
    }
  }
})

export const creator_manage_put = newHandler({
  requireCreatorPermission: true, // You're either an admin, or you're editing your creator
  takesJSON: true
}, async ({creator, json}) => {
  const updates = <Creator>json
  await updateCreator(creator, updates)

  return {
    status: 204
  }
})

/**
 * Creates a new creator
 */
export const creator_manage_post = newHandler({
  requireAdmin: true,
  takesJSON: true
}, async ({json}) => {
  const newCreator = {
    id: idgen(),
    name: json.name,
    slug: json.slug,
    owner_id: json.owner_id,
    description: json.description,
  }
  await validateCreator(newCreator)
  const id = await insertCreator(newCreator)

  return {
    status: 201,
    body: {
      id: id
    }
  }
})

//==========PUBLIC ROUTES============
/**
 * The Public route for fetching a creator
 * TODO: Use slug instead of id on this route
 */
export const creator_get = newHandler({
  requireCreator: true
}, async ({ creator}) => {
  let body : any = {}
  body = BasicCreatorInfo(creator)
  return {
    status: 200,
    body: body
  }
})

/**
 * Get the FULL list of creators
 * The frontend uses this to create the auto-fill list of creators for users
 * to search by
 */
export const creators_get = newHandler({}, async () => {
  const rows = await getCreators({skip: 0, limit: 0})
  return {
    status: 200,
    body: {
      creators: rows,
    }
  }
})

/**
 *
 * @param creator
 * @returns A stripped down version of the creator object for basic front end display
 */
function BasicCreatorInfo(creator:Creator){
  return creator;
}
