import { APIGatewayProxyHandler } from "aws-lambda"
import { errorResponse, newResponse } from "../common/response"
import * as db from '../common/postgres';
import { User, Creator } from "../../interfaces/IEntity";
import { idgen } from "../common/nanoid";
import slugify from "slugify";

export const debug_newcreator: APIGatewayProxyHandler = async (_evt, _ctx) => {
  try{
    let response = newResponse();
    const body = JSON.parse(_evt.body);
    const user:User = <User> (await db.query(`SELECT * FROM users WHERE username='${body.username}' LIMIT 1`, [], false))[0];
    //console.log(user);
    if(!user){throw new Error("User by that name not found!");}

    
    let newCreator:Creator = {
      id: idgen(),
      owner_id: user.id,
      name: body.creatorname,
      slug: slugify(body.creatorname).toLowerCase(),
      description: body.creatordescription
    }

    //creators table
    await db.insertObj(process.env.DB_CREATORS, newCreator);
    //creator members table
    await db.insertObj(process.env.DB_CREATORMEMBERS, {
      creator_id: newCreator.id,
      user_id: user.id
    })
    response.statusCode = 200;
    response.body = JSON.stringify(newCreator);
    db.clientRelease();
    return response;
  } catch (e) {
    db.clientRelease();
    return errorResponse(_evt, e)
  }
}