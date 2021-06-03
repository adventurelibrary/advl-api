import {User} from "../interfaces/IUser";
import {Creator} from "../interfaces/ICreator";
import * as db from "../api/common/postgres";
import {Validation} from "./errors";

export async function getCreatorByID(creatorID: string){
	try {
		const creator = <Creator> await db.getObj(process.env.DB_CREATORS, creatorID);
		return creator;
	} catch(e){
		return undefined;
	}
}

export type GetCreatorOpts = {
	limit?: number
	skip?: number
}

export async function getTotalCreators() {
	const res = <{total: number}[]> await db.query('SELECT COUNT(*) as total FROM creators')
	return res[0].total
}

export async function getCreators(opts : GetCreatorOpts) : Promise<Creator[]> {
	const result = <Creator[]>await db.getObjects(process.env.DB_CREATORS, {
		limit: opts.limit,
		skip: opts.skip,
		orderBy: 'name ASC'
	})

	return result
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
	await validateCreator(creator)

	const write = creatorToDatabaseWrite(creator)
	return await db.updateObj(process.env.DB_CREATORS, creator.id, write)
}

export async function insertCreator(creator:Creator) {
	const write = creatorToDatabaseWrite(creator)
	return await db.insertObj(process.env.DB_CREATORS, write)
}

export async function validateCreator(creator: Creator) {
	const val = new Validation()
	val.validateRequired(creator.name, {
		message: 'Creator name is required',
		field: 'name'
	})
	val.validateRequired(creator.slug, {
		message: 'Creator slug is required',
		field: 'slug'
	})
	val.throwIfErrors()
}
