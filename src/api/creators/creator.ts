import { Creator } from '../../interfaces/ICreator';
import { idgen } from "../common/nanoid";
import {newHandler} from "../common/handlers";
import {
  getCreators, getTotalCreators, getTotalUserCreators, getUserCreators,
  insertCreator, isMemberOfCreatorPage,
  updateCreator,
  validateCreator
} from "../../lib/creator";

export const creator_get = newHandler({
  requireCreator: true,
  includeUser: true,
}, async ({user, creator}) => {
  let body : any = {}
  let hasPerm = false
  if (user) {
    hasPerm = await isMemberOfCreatorPage(creator.id, user.id)
  }
  if (hasPerm) {
    body = creator
  } else {
    body = BasicCreatorInfo(creator)
  }
  return {
    status: 200,
    body: body
  }
})

export const creators_get = newHandler({
  requireAdmin: true,
}, async ({query}) => {
  const rows = await getCreators({
    limit: parseInt(query.limit),
    skip: parseInt(query.skip)
  })
  const total = await getTotalCreators()
  return {
    status: 200,
    body: {
      creators: rows,
      total: total
    }
  }
})

// Get the list of creators that this user has permissions with
export const creators_get_mine = newHandler({
  requireUser: true,
}, async ({query, user}) => {
  const rows = await getUserCreators(user, {
    limit: parseInt(query.limit),
    skip: parseInt(query.skip)
  })
  const total = await getTotalUserCreators(user)
  return {
    status: 200,
    body: {
      creators: rows,
      total: total
    }
  }
})

export const creator_put = newHandler({
  requireCreatorPermission: true, // You're either an admin, or you're editing your creator
  takesJSON: true
}, async ({creator, json}) => {
  const updates = <Creator>json
  await updateCreator(creator, updates)

  return {
    status: 204
  }
})

export const creator_post = newHandler({
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

/**
 *
 * @param creator
 * @returns A stripped down version of the creator object for basic front end display
 */
function BasicCreatorInfo(creator:Creator){
  return creator;
}
