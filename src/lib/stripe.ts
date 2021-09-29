import {CoinPurchase} from "./purchases";
import {addEntityCoins} from "./coins";
import {updateObj} from "../api/common/postgres";

export const stripe = require('stripe')(process.env.STRIPE_API_KEY)

const CURRENCY = 'usd'

export type StripeSession = {
	url: string
}

if (!process.env.STRIPE_API_KEY) {
	throw new Error(`STRIPE_API_KEY is blank. Check your .env.yml, or make sure to use load-yaml-env.ts`)
}

export async function createPaymentSession (cp: CoinPurchase) : Promise<StripeSession> {
	if (!process.env.STRIPE_SUCCESS_URL) {
		throw new Error(`STRIPE_SUCCESS_URL is blank. Check your .env.yml, or make sure to use load-yaml-env.ts`)
	}

	if (!process.env.STRIPE_CANCEL_URL) {
		throw new Error(`STRIPE_CANCEL_URL is blank. Check your .env.yml, or make sure to use load-yaml-env.ts`)
	}

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		client_reference_id: cp.key,
		line_items: [
			{
				price_data: {
					currency: CURRENCY,
					product_data: {
						name: `${cp.coins} Coins`,
					},
					unit_amount: cp.cents,
				},
				quantity: 1,
			},
		],
		mode: 'payment',
		success_url: process.env.STRIPE_SUCCESS_URL,
		cancel_url: process.env.STRIPE_CANCEL_URL,
	});

	return session
}

export async function createPaymentIntent (amount: number) : Promise<{id: string, client_secret: string}> {
	const intent = await stripe.paymentIntents.create({
		amount,
		currency: CURRENCY
	})
	return intent
}

type CheckPaymentIntentResult = 'skipped' | 'complete' | 'error'
export async function checkPendingPaymentIntent (coinPurchase: CoinPurchase) : Promise<CheckPaymentIntentResult> {
	if (coinPurchase.status === 'complete') {
		return 'skipped'
	}

	const stripePaymentIntentId = coinPurchase.key
	let result : CheckPaymentIntentResult
	const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId)

	// If the numbers don't match then something went wrong
	if (coinPurchase.cents !== pi.amount) {
		coinPurchase.status = 'error'
		coinPurchase.note = `Purchase amount ${coinPurchase.cents} did not match Stripe event amount ${pi.amount}`
		result = 'error'
	} else {
		coinPurchase.status = 'complete'

		// Add a record to this user's account of the coins
		await addEntityCoins(coinPurchase.user_id, coinPurchase.coins, {
			purchase_id: coinPurchase.id
		})
		result = 'complete'
	}

	// Save the the coin purchase
	await updateObj(process.env.DB_COIN_PURCHASES, coinPurchase.id, coinPurchase)

	return result
}
