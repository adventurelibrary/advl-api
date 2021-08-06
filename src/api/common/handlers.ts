import {
  APIGatewayEventDefaultAuthorizerContext,
  APIGatewayProxyEventBase,
  APIGatewayProxyHandler,
  Context
} from "aws-lambda";
import {Asset} from "../../interfaces/IAsset";
import {errorResponse, newResponse} from "./response";
import {ErrAssetNotFound, getAsset, verifyUserHasAssetAccess} from "../../lib/assets";
import {User, Creator} from "../../interfaces/IEntity";
import {getEventUser} from "./events";
import {getCreatorByID, isMemberOfCreatorPage} from "../../lib/creator";
import { Bundle } from "../../interfaces/IBundle";
import { getBundleByID } from "../../lib/bundle";
import { clientRelease } from "./postgres";
import { isAdmin } from "../../lib/user";

// This context we build ourselves and pass to our handlers
// It contains the basic event and context provided by serverless
// It also adds in optional data that our handlers often use
export type HandlerContext = {
  event : APIGatewayProxyEventBase<APIGatewayEventDefaultAuthorizerContext>
  lambdaContext: Context
  json?: any, // JSON.parse on the body goes into this
  user?: User
  asset?: Asset
  creator?: Creator
  bundle?: Bundle
  query: Record<string, string>
}

// These options are used when creating a new handler to determine what oft-repeated
// tasks we should perform, and what data we should try to insert into the HandlerContext
// so that your handler has access to it
// Hint: include means it will try to find it, require means it will 404 if it doesn't find it
export type HandlerOpts = {
  takesJSON?: boolean

  // TODO: Support for DB vs ElastiSearch inclusion
  includeAsset?: boolean
  requireAsset?: boolean
  requireAssetPermission?: boolean

  includeUser?: boolean
  requireUser?: boolean
  requireAdmin?: boolean

  includeCreator?: boolean
  requireCreator?: boolean
  requireCreatorPermission?: boolean

  requireBundle?: boolean
  requireBundlePermission?: boolean
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
    if (opts.requireAdmin) {
      opts.requireUser = true
    }

    if (opts.requireAssetPermission) {
      opts.requireUser = true
      opts.requireAsset = true
    }

    if (opts.requireCreatorPermission) {
      opts.requireCreator = true
      opts.requireUser = true
    }

    if (opts.requireBundlePermission) {
      opts.requireUser = true
      opts.requireBundle = true
    }

    const query : Record<string, string> = {}
    if (_evt.queryStringParameters) {
      for(let key of Object.keys(_evt.queryStringParameters)){
        query[key] = _evt.queryStringParameters[key]
      }
    }

    const ctx : HandlerContext = {
      lambdaContext: _ctx,
      event: _evt,
      query: query
    }

    if (opts.takesJSON) {
      try {
        ctx.json = JSON.parse(_evt.body)
      } catch (ex) {
        console.log('Error parsing body JSON')
        throw ex
      }
    }

    let res : any = newResponse()
    try {
      // For routes that want access to the currently logged in user
      if (opts.includeUser || opts.requireUser) {
        let user : User | undefined
        try {
          user = await getEventUser(_evt)
        } catch (ex) {
          console.log('Error getting event user', ex)
        }
        if (!user && opts.requireUser) {
          return errorResponse(_evt, `Route requires you to be logged in`, 401)
        }

        if (opts.requireAdmin && !isAdmin(user)) {
          return errorResponse(_evt, `Route requires you to be an admin`, 403)
        }

        ctx.user = user
      }

      // These routes assume that the asset id is provided as :assetID
      // in the api.yml file
      if (opts.includeAsset || opts.requireAsset) {
        const asset = await getAsset(_evt.pathParameters.assetID)
        if (!asset && opts.requireAsset) {
          throw ErrAssetNotFound
        }
        ctx.asset = asset

        // If this option is on for this route, then the user needs to be a member of
        // the asset's creator's creatormembers table
        if (opts.requireAssetPermission) {
          await verifyUserHasAssetAccess(ctx.user, ctx.asset.id)
        }
      }


      // These routes assume that the creator id is provided as :creatorId
      // in the api.yml file
      if (opts.includeCreator || opts.requireCreator) {
        const creator = await getCreatorByID(_evt.pathParameters.creatorID)
        if (!creator && opts.requireCreator) {
          return errorResponse(_evt, new Error('Could not find creator'), 404)
        }

        ctx.creator = creator

        if (opts.requireCreatorPermission) {
          console.log('require creator perm')
          let hasPerm = false
          if (isAdmin(ctx.user)) {
            hasPerm = true
          } else if (ctx.user) {
            hasPerm = await isMemberOfCreatorPage(ctx.creator.id, ctx.user.id)
          }
          if (!hasPerm) {
            return errorResponse(_evt, new Error('You do not have permission'), 403)
          }
        }
      }

      if (opts.requireBundle) {
        const bundle = await getBundleByID(_evt.pathParameters.bundleID)
        if(!bundle){
          return errorResponse(_evt, new Error("Could not find bundle"), 404)
        }

        if (opts.requireBundlePermission) {
          //If bundles' creator id is the same as the current user id, then we're good
          let hasPermission = bundle.entity_id == ctx.user.id
          //check if the bundle creator id belongs to a creator the user controls
          if (!hasPermission) {
            hasPermission = await isMemberOfCreatorPage(bundle.entity_id, ctx.user.id)
          }
          if (!hasPermission) {
            return errorResponse(_evt, new Error('Not your bundle'), 403)
          }
        }

        ctx.bundle = bundle
      }

      // This is where you custom route handler actually gets called
      // It will get a full context object to work with
      // It should return status and body, or throw an error
      const handleResult = await handler(ctx)
      res.statusCode = handleResult.status
      if (res.statusCode !== 204 && res.statusCode != 302) {
        res.body = JSON.stringify(handleResult.body)
      }
    } catch (ex) {
      clientRelease();
      return errorResponse(_evt, ex)
    }
    clientRelease();
    return res
  }
}
