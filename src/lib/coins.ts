import {insertObj, query} from "../api/common/postgres";

/**
 * Inserts a new row into the user's ledger giving them a new credit balance
 * @param entityId - User or Creator to add/subtract coins from
 * @param coins
 * @param note
 */
export async function addEntityCoins(entityId: string, coins: number, meta?: Record<string, any>) {
	const insert = {
		entity_id: entityId,
		num_coins: coins,
		...meta
	}
	return await insertObj(process.env.DB_ENTITY_COINS, insert)
}

/**
 * Returns the sum of positive and negative entries of coins for an entity, to give their current balance
 * @param entityId - User or Creator's id
 * @return number */
export async function getEntityNumCoins (entityId: string) : Promise<number> {
	const res = await query(`SELECT COALESCE(SUM(num_coins), 0) as num FROM ${process.env.DB_ENTITY_COINS} WHERE entity_id = $1`, [entityId])
	const num = parseInt(res[0].num)
	return num || 0
}
