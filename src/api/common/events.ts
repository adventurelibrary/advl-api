import {User} from "../../interfaces/IEntity";
import {getUserByToken} from "../../lib/user";
import {APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters} from "aws-lambda";

export async function getEventUser (_evt : APIGatewayProxyEvent) : Promise<User | undefined> {
	if (!_evt.headers.Authorization) {
		return undefined
	}
	return await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
}

// If a param is given like ?tags=archer,woods this will turn that into an array of ['archer', 'woods']
// If no param exists in the query then an empty array is returned
export function getEventQueryCSV (params: APIGatewayProxyEventQueryStringParameters, key: string) : string[] {
	if (params && params[key]) {
		return params[key].indexOf(',') > 0 ? params[key].split(',') : [params[key]]
	}
	return []
}
