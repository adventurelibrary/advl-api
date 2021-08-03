import {CoinPurchaseOption} from "../interfaces/ICoin";
import {User} from "../interfaces/IEntity";
import {idgen} from "../api/common/nanoid";
import {insertObj, query} from "../api/common/postgres";

type CoinPurchaseStatus = 'pending' | 'complete' | 'error'
type PurchaseProvider = 'stripe' // | 'paypal'

export type CoinPurchase = {
	id: number
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
		id: 0,
		user_id: user.id,
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

export async function completeCoinPurchase ()
