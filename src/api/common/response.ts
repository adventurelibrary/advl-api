import {APIError} from "../../lib/errors";

export function newResponse ()  {
	return {
		statusCode: 500,
		headers: {
			'content-type': "application/json",
			'Access-Control-Allow-Origin': process.env.IS_OFFLINE === "true" ? "*" : `https://adventurelibrary.art`,
			'Access-Control-Allow-Credentials': true
		},
		body: JSON.stringify({error:"Something went wrong!"})
	}
}

export function errorResponse (_evt, error, status?: number) {
	const response = newResponse()
	console.error(`ERROR | \n Event: ${_evt} \n Error: ${error}`);
	if (error.stack) {
		console.log('stack', error.stack)
	}
	if (error instanceof APIError) {
		console.log('ERROR is APIError')
		response.body = JSON.stringify({
			error: {
				message: error.message,
				key: error.key,
				details: error.details,
			},
		})
		response.statusCode = error.status || 500
		return response
	}

	// TODO: Change this to like an environment variable, or a user check or something
	if (true) {
		response.body = JSON.stringify({
			error: {
				message: error.toString(),
				details: JSON.stringify(error)
			},
		})
	}
	if (status > 0) {
		response.statusCode = status
	}
	return response;
}
