import { Creator } from '../../interfaces/ICreator';
import { idgen } from "../common/nanoid";
import {newHandler} from "../common/handlers";
import {getCreatorByID, insertCreator, updateCreator, userHasCreatorPermission} from "../../lib/creator";

export const creator_get = newHandler({
  requireCreator: true,
  includeUser: true,
}, async ({user, creator}) => {
  let body : any = {}
  const hasPerm = await userHasCreatorPermission(user, creator)
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

export const creator_put = newHandler({
  requireCreatorPermission: true
}, async ({creator, json}) => {
  await updateCreator(creator, json)

  // Grab from the db instead of using the updated object, to account for things
  // like joins
  const updated = await getCreatorByID(creator.id)
  return {
    status: 200,
    body: updated
  }
})

export const creator_post = newHandler({
  requireAdmin: true
}, async ({json}) => {
  const newCreator = {
    id: idgen(),
    name: json.name,
    owner_id: json.owner_id,
    description: json.description,
  }
  const id = await insertCreator(newCreator)

  return {
    status: 204,
    body: {
      id: id
    }
  }
})
/*


/!**
 * GET returns creator information.
 * POST creates a new CREATOR from a USER (ADMIN)
 * PUT updates the creator (ADMIN or Creator OWNER)
 *!/
export const creator: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();
  try{
    let user: User = await getEventUser(_evt);
    let creator = await getCreatorByID(_evt.pathParameters.creatorID)
    if(_evt.httpMethod == "GET"){
      if(creator == undefined) {
        throw new Error ("Creator undefined");
      }
      //if no one is logged in return just the basic info about the creator
      if(!user && creator.owner != user.id && !isAdmin(user.id)){
        response.statusCode = 200;
        response.body = JSON.stringify(BasicCreatorInfo(creator));
        return response;
      }

      //if the creator owner or an admin is querying send the full info for the creator
      if(creator.owner == user.id || isAdmin(user.id)){
        response.statusCode = 200;
        response.body = JSON.stringify(creator)
        return response;
      }

    } else if (_evt.httpMethod == "POST") {
      if(creator != undefined){
        throw new Error("A creator already exists for this user");
      }

      if(!isAdmin(user.id)){
        throw new Error("Only admins can make new creators")
      }

    } else if (_evt.httpMethod == "PUT") {
      if(creator.owner != user.id && !isAdmin(user.id)){
        throw new Error("Creators can only be updated by their owner or an Admin")
      }

      response.statusCode = 200;
      response.body = JSON.stringify(updateCreator(creator, <REQ_UpdateCreator>JSON.parse(_evt.body)));
    }
    return response;
  } catch(e) {
    return errorResponse(_evt, e);
  }
}
*/

/**
 *
 * @param creator
 * @returns A stripped down version of the creator object for basic front end display
 */
function BasicCreatorInfo(creator:Creator){
  return creator;
}
