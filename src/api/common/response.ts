export function newResponse ()  {
	return {
		statusCode: 500,
		headers: {
			'content-type': "application/json",
			'Access-Control-Allow-Origin': "*",
			'Access-Control-Allow-Credentials': true
		},
		body: JSON.stringify({error:"Something went wrong!"})
	}
}

export function errorResponse (_evt, error, status?: number) {
	const response = newResponse()
	console.error(`ERROR | \n Event: ${_evt} \n Error: ${error}`);
	// TODO: Change this to like an environment variable, or a user check or something
	if (true) {
		response.body = JSON.stringify({
			error: error.toString(),
			details: JSON.stringify(error)
		})
	}
	if (status > 0) {
		response.statusCode = status
	}
	return response;
}
