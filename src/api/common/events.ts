import {User} from "../../interfaces/IUser";
import {getUserByToken} from "../../lib/user";
import {APIGatewayProxyEvent} from "aws-lambda";

export async function getEventUser (_evt : APIGatewayProxyEvent) : Promise<User | undefined> {
	if (!_evt.headers.Authorization) {
		return undefined
	}
	return await getUserByToken(_evt.headers.Authorization.split(" ")[1]);
}
