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
