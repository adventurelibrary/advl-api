export function newResponse ()  {
	return {
		statusCode: 500,
		headers: {
			'content-type': "application/json",
			'Access-Control-Allow-Origin': "*",
			'Access-Control-Allow-Credential': true
		},
		body: JSON.stringify({error:"Something went wrong!"})
	}
}
