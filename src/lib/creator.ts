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

export async function isMemberOfCreatorPage(creator_id: string, user_id: string){
	let result = await db.query(`SELECT * FROM ${process.env.DB_CREATORMEMBERS} where creator_id= ? and user_id= ? LIMIT 1`, [creator_id, user_id])
	if(result.length == 0){
		return false;
	} else {
		return true;
	}
}

export async function getTotalCreators() {
	const res = <{total: number}[]> await db.query(`SELECT COUNT(*) as total FROM ${process.env.DB_CREATORS}`)
	return res[0].total
}

export async function getCreators(opts : GetCreatorOpts) : Promise<Creator[]> {
	const result = <Creator[]>await db.getTableObjects(process.env.DB_CREATORS, {
		limit: opts.limit,
		skip: opts.skip,
		orderBy: 'name ASC'
	})

	return result
}


export async function getTotalUserCreators(user: User) {
	const res = <{total: number}[]> await db.query(`
SELECT COUNT(*) as total
FROM creators c, creatormembers cm
WHERE cm.user_id = ?
AND cm.creator_id = c.id`, [user.id])
	return res[0].total
}

export async function getUserCreatorIds(id: string) : Promise<string[]> {
	const results = <{creator_id: string}[]>await db.query(`
SELECT cm.creator_id
FROM creatormembers cm
WHERE cm.user_id = :userId
`, {
		userId: id
	})

	return results.map((row) => {
		return row.creator_id
	})
}
export async function getUserCreators(user: User, opts : GetCreatorOpts) : Promise<Creator[]> {
	const limit = isNaN(opts.limit) || !opts.limit ? 20 : opts.limit
	const skip = isNaN(opts.skip) ? 0 : opts.skip

	const result = <Creator[]>await db.query(`
SELECT c.*
FROM creators c, creatormembers cm
WHERE cm.user_id = :userId
AND cm.creator_id = c.id
ORDER BY :orderBy
LIMIT :limit
OFFSET :skip`, {
		limit: limit,
		skip: skip,
		orderBy: 'name ASC',
		userId: user.id
	})

	return result
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
