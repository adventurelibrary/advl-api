import {User} from "../interfaces/IUser";
import {Creator} from "../interfaces/ICreator";
import * as db from "../api/common/postgres";


export async function getCreatorByID(creatorID: string){
	try {
		const creator = <Creator> await db.getObj(process.env.DB_CREATORS, creatorID);
		return creator;
	} catch(e){
		return undefined;
	}
}


// Async so that later this can do a DB query to check permissions
// Something like SELECT EXISTS(SELECT id FROM creator_users WHERE user_id = ? AND creator_id = ?))
export async function userHasCreatorPermission (user: User, creator: Creator) : Promise<boolean> {
	if (!user) {
		return false
	}
	return user.is_admin || creator.owner_id == user.id
}


export function creatorToDatabaseWrite (creator: Creator) : any {
	const dbwrite = <any>creator
	// falsy owner should just be saved as null
	if (!creator.owner_id) {
		dbwrite.owner_id = null
	}

	return dbwrite
}

export async function updateCreator (creator:Creator, updates:any) {
	creator.name = updates.hasOwnProperty('name') ? updates.name : creator.name
	creator.description = updates.hasOwnProperty('description') ? updates.description : creator.description
	creator.owner_id = updates.hasOwnProperty('owner_id') ? updates.owner_id : creator.owner_id

	const write = creatorToDatabaseWrite(creator)
	return await db.updateObj(process.env.DB_CREATORS, creator.id, write)
}

export async function insertCreator(creator:Creator) {
	const write = creatorToDatabaseWrite(creator)
	return await db.insertObj(process.env.DB_CREATORS, write)
}
