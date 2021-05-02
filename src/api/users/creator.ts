import { APIGatewayProxyHandler } from "aws-lambda";
import { getCreatorByID, getUserByToken, isAdmin, updateCreator } from "../../lib/user";
import { errorResponse, newResponse } from "../common/response";
import { User } from '../../interfaces/IUser';
import { Creator, REQ_NewCreator, REQ_UpdateCreator } from '../../interfaces/ICreator';
import { idgen } from "../common/nanoid";
import * as db from '../common/postgres';
/**
 * GET returns creator information.
 * POST creates a new CREATOR from a USER (ADMIN)
 * PUT updates the creator (ADMIN or Creator OWNER)
 */

export const creator: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = newResponse();
  try{
    let user: User = await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
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

      let newCreatorInput:REQ_NewCreator = JSON.parse(_evt.body);
      let newCreator:Creator = {
        id: idgen(),
        owner: newCreatorInput.id,
        description: ""
      }

      await db.insertObj(process.env.DB_CREATORS, newCreator);
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

/**
 * 
 * @param creator 
 * @returns A stripped down version of the creator object for basic front end display
 */
function BasicCreatorInfo(creator:Creator){
  return creator;
}