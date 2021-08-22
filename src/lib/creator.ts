import {Entity, User, Creator} from "../interfaces/IEntity";
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

export async function isMemberOfCreatorPage(creator_id: string, user_id: string) : Promise<boolean> {
	let result = await db.query(`SELECT * FROM ${process.env.DB_CREATORMEMBERS} where creator_id = $1 and user_id= $2 LIMIT 1`, [creator_id, user_id])
	if(result.length == 0){
		return false;
	} else {
		return true;
	}
}

export async function getTotalCreators() {
	const res = <{total: any}[]> await db.query(`SELECT COUNT(*) as total FROM ${process.env.DB_CREATORS}`)
	return parseInt(res[0].total)
}

export async function getCreators(opts : GetCreatorOpts) : Promise<Creator[]> {
	const result = <Creator[]>await db.getObjects(
		`SELECT * FROM ${process.env.DB_CREATORS}`,
		[],
		opts.skip,
		opts.limit,
		'name ASC')
	return result
}


export async function getTotalUserCreators(user: User) {
	const res = await db.query(`
	SELECT COUNT(*) as total	
	FROM ${process.env.DB_CREATORS} c, ${process.env.DB_CREATORMEMBERS} cm
	WHERE cm.user_id = $1
	AND cm.creator_id = c.id`, [user.id])
	return parseInt(res[0].total)
}

export async function getUserCreatorIds(id: string) : Promise<string[]> {
	const results = await db.query(`
		SELECT cm.creator_id
		FROM ${process.env.DB_CREATORMEMBERS} cm
		WHERE cm.user_id = $1`,
		[id]
	)

	return results.map((row) => {
		return row.creator_id
	})
}


export async function getUserCreators (user: User) : Promise<Creator[]> {
	const result:Creator[] = <Creator[]> await db.getObjects(
		`
		SELECT c.*
		FROM ${process.env.DB_CREATORS} c, ${process.env.DB_CREATORMEMBERS} cm
		WHERE cm.user_id = $1
		AND cm.creator_id = c.id
		`,
		[user.id],
		0,
		0,
		'name ASC'
	)
	return result
}

export async function updateCreator (creator:Creator, updates:any) {
	creator.name = updates.hasOwnProperty('name') ? updates.name : creator.name
	creator.description = updates.hasOwnProperty('description') ? updates.description : creator.description
	creator.owner_id = updates.hasOwnProperty('owner_id') ? updates.owner_id : creator.owner_id
	await validateCreator(creator)

	return await db.updateObj(process.env.DB_CREATORS, creator.id, creator)
}

export async function insertCreator(creator:Creator) {
	const newEntity:Entity = {
		id: creator.id,
		type: "CREATOR"
	}
	await db.insertObj(process.env.DB_ENTITIES, newEntity);
	return await db.insertObj(process.env.DB_CREATORS, creator);
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
