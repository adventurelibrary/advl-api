//Return Tags & Categories
import { APIGatewayProxyHandler } from 'aws-lambda';
import { REQ_Add_Categories, REQ_Add_Tags } from '../../interfaces/ICategorization';
import { dyn } from '../common/database';

export const get_tags: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let tags = await dyn.query({
      TableName: process.env.NAME_CATEGORIZATIONDB,
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": "tag"
      }
    }).promise()

    response.body = JSON.stringify(tags.Items)
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const get_categories: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let tags = await dyn.query({
      TableName: process.env.NAME_CATEGORIZATIONDB,
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": "category"
      }
    }).promise()

    response.body = JSON.stringify(tags.Items)
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const add_tags: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let req:REQ_Add_Tags = JSON.parse(_evt.body);
    let newItems = req.tags.map((tag) => {
      return {
        "PutRequest": {
          "Item": {
            "name": tag,
            "type": "tag"  
          }
        }
      }
    })
      
    let params = {
      RequestItems: {
        [process.env.NAME_CATEGORIZATIONDB] : newItems
      }
    }

    await dyn.batchWrite(params).promise();

    response.body = JSON.stringify({"success": true})
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}

export const add_categories: APIGatewayProxyHandler = async (_evt, _ctx) => {
  let response = {
    statusCode: 500,
    headers: {
      'content-type': "application/json",
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Credential': true
    },
    body: JSON.stringify({error:"Something went wrong!"})
  }

  try{
    let req:REQ_Add_Categories = JSON.parse(_evt.body);
    let newItems = req.categories.map((cat) => {
      return {
        "PutRequest": {
          "Item": {
            "name": cat,
            "type": "category"  
          }
        }
      }
    })
      
    let params = {
      RequestItems: {
        [process.env.NAME_CATEGORIZATIONDB] : newItems
      }
    }

    await dyn.batchWrite(params).promise();

    response.body = JSON.stringify({"success": true})
    return response;

  } catch (E){
    console.error(`ERROR | \n Event: ${_evt} \n Error: ${E}` );
    return response;
  }
}