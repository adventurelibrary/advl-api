import {CoinPurchase} from "./purchases";

export const stripe = require('stripe')(process.env.STRIPE_API_KEY)

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
					currency: 'usd',
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
