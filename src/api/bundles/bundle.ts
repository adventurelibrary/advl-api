//Return Tags & Categories
import { APIGatewayProxyHandler } from 'aws-lambda';
import {errorResponse, newResponse} from "../common/response";
import {User} from "../../interfaces/IUser"

const ErrNotLoggedIn = new Error('You are not logged in')

// TODO: Change this our for a REAL get user thingy
async function getFakeReqUser (_evt) : Promise<User | null> {
	const auth = _evt.headers["Auth"]
	if (!auth) {
		return null
	}
	return {
		id: 'fdsafdasfdas',
		name: 'Fake Hardcoded User',
		isCreator: false,
		joinDate: new Date().toISOString(),
	}
}

export const get_my_bundles: APIGatewayProxyHandler = async (_evt, _ctx) => {
	let response = newResponse()

	try {
		const user = await getFakeReqUser(_evt)
		if (!user) {
			throw ErrNotLoggedIn
		}
		response.statusCode = 200
		response.body = JSON.stringify({
			bundles: [],
			total: 0
		})
		return response;

	} catch (E) {
		return errorResponse(_evt, E)
	}
}
