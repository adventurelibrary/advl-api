import {CoinPurchaseOption} from "../interfaces/ICoin";
import {User} from "../interfaces/IEntity";
import {idgen} from "../api/common/nanoid";
import {getObjects, insertObj, query} from "../api/common/postgres";

type CoinPurchaseStatus = 'pending' | 'complete' | 'error'
type PurchaseProvider = 'stripe' // | 'paypal'

export type CoinPurchase = {
	id?: number
	coins: number
	cents: number
	key: string,
	note: string,
	provider: PurchaseProvider
	status: CoinPurchaseStatus
	user_id: string
}

// Inserts a new coin purchase into our database that signifies someone's intent to buy coins from us
// It creates a record that we will use in the future to give them coins, IF they finish the checkout process
export async function createNewCoinPurchase(provider: PurchaseProvider, user: User, po: CoinPurchaseOption) : Promise<CoinPurchase> {
	const key = idgen()
	const purchase : CoinPurchase = {
		user_id: user.id,
		note: '',
		coins: po.coins,
		cents: po.cents,
		status: 'pending',
		provider: provider,
		key: key
	}

	const id = await insertObj(process.env.DB_COIN_PURCHASES, purchase)
	purchase.id = <number>id
	return purchase
}

// The key is a code we generate to identify the checkout session being used by Stripe
// We create a key and pass it to Stripe, and when the user makes a purchase Stripe
// will send us a webhook event
// That webhook evnt has the key in the client_reference_id field, and we use that to determine
// which payment to update
export async function getCoinPurchaseByKey(key: string) : Promise<CoinPurchase | undefined> {
	const rows = await query(`SELECT * FROM ${process.env.DB_COIN_PURCHASES} WHERE key = $1`, [key])
	if (!rows || !rows[0]) {
		return undefined
	}
	const first = rows[0]
	return first
}

type GetUserPurchasesOpts = {
	skip?: number,
	limit?: number,
	statuses?: CoinPurchaseStatus[]
}

export async function getUserPurchases (userId: string, opts: GetUserPurchasesOpts) : Promise<CoinPurchase[]> {
	const params : any[] = [userId]
	let sql = `SELECT * FROM ${process.env.DB_COIN_PURCHASES} WHERE user_id = $1`
	if (opts.statuses && opts.statuses.length) {
		sql += ` AND status = ANY ($2)`
		params.push(opts.statuses)
	}
	const res = <CoinPurchase[]>await getObjects(sql, params, opts.skip, opts.limit, 'succeeded_date DESC')
	return res
}

export async function getTotalUserPurchases (userId: string, opts: GetUserPurchasesOpts) : Promise<number> {
	const params : any[] = [userId]
	let sql = `SELECT COUNT(*) as total
	FROM ${process.env.DB_COIN_PURCHASES} WHERE user_id = $1`
	if (opts.statuses && opts.statuses.length) {
		sql += ` AND status = ANY ($2)`
		params.push(opts.statuses)
	}
	const rows = await query(sql, params)
	return parseInt(rows[0].total)
}


export async function getUserCompletePurchases (userId: string, skip: number, limit: number) {
	return await getUserPurchases(userId, {
		skip,
		limit,
		statuses: ['complete']
	})
}

export async function getUserTotalCompletePurchases (userId: string) {
	return await getTotalUserPurchases(userId, {
		statuses: ['complete']
	})
}
