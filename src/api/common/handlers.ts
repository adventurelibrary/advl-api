import {
  APIGatewayEventDefaultAuthorizerContext,
  APIGatewayProxyEventBase,
  APIGatewayProxyHandler,
  Context
} from "aws-lambda";
import {Asset} from "../../interfaces/IAsset";
import {errorResponse, newResponse} from "./response";
import {getAsset} from "../../lib/assets";
import {User} from "../../interfaces/IUser";
import {getEventUser} from "./events";

// This context we build ourselves and pass to our handlers
// It contains the basic event and context provided by serverless
// It also adds in optional data that our handlers often use
export type HandlerContext = {
  event : APIGatewayProxyEventBase<APIGatewayEventDefaultAuthorizerContext>
  lambdaContext: Context
  user?: User
  asset?: Asset
}

// These options are used when creating a new handler to determine what oft-repeated
// tasks we should perform, and what data we should try to insert into the HandlerContext
// so that your handler has access to it
export type HandlerOpts = {
  includeUser?: boolean
  requireUser?: boolean
  includeAsset?: boolean
  requireAsset?: boolean
}

// A very simple response for our handlers to give us
export type HandlerResult = {
  status: number
  body?: any
}

export type Handler = (ctx : HandlerContext) => Promise<HandlerResult>

// We use this function create new handlers to pass to lambda
// We wrap the handler function in extra functionality and data fetching, based on the options
// provided
// This wrapper is meant to make writing handlers for specific routes easier
export function newHandler (opts  : HandlerOpts, handler : Handler) : APIGatewayProxyHandler {
  return async (_evt, _ctx)  => {
    const ctx : HandlerContext = {
      lambdaContext: _ctx,
      event: _evt,
    }

    let res : any = newResponse()
    try {
      // For routes that want access to the currently logged in user
      if (opts.includeUser || opts.requireUser) {
        const user = await getEventUser(_evt)
        if (!user && opts.requireUser) {
          throw new Error(`Route requires you to be logged in`)
        }
      }

      // These routes assume that the asset id is provided as :asset_id
      // in the api.yml file
      if (opts.includeAsset || opts.requireAsset) {
        const asset = await getAsset(_evt.pathParameters.assetId)
        if (!asset && opts.requireAsset) {
          return errorResponse(_evt, new Error('Could not find asset'), 404)
        }
        ctx.asset = asset
      }

      const handleResult = await handler(ctx)
      res.statusCode = handleResult.status
      res.body = JSON.stringify(handleResult.body)
    } catch (ex) {
      console.log('err has been caughted')
      return errorResponse(_evt, ex)
    }
    return res
  }
}
