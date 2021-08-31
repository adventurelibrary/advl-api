import {HandlerResult, newHandler} from '../common/handlers';
import {createPaymentSession} from "../../lib/stripe";
import {getPurchaseOptionByCoins, PURCHASE_OPTIONS} from "../../constants/coins";
import {APIError} from "../../lib/errors";
import {createNewCoinPurchase} from "../../lib/purchases";

export const coins_purchase = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) : Promise<HandlerResult> => {

	// Find which purchase option they have selected, by the coins provided
	const po = getPurchaseOptionByCoins(json.coins)
	if (!po) {
		throw new APIError({
			key: 'invalid_coins',
			status: 400,
			message: 'Invalid number of coins to purchase'
		})
	}

	// Create a record in our db that we will use to check against the webhook response
	// from stripe
	const purchase = await createNewCoinPurchase('stripe', user, po)

	// Use Stripe's API to create checkout session, which gives us the URL that the user
	// should be redirected to to finish their purchase
	const sess = await createPaymentSession(purchase)

	return {
		status: 200,
		body: {
			url: sess.url
		}
	}
})

export const coins_options_get = newHandler({
}, async () : Promise<HandlerResult> => {

	return {
		status: 200,
		body: {
			options: PURCHASE_OPTIONS
		}
	}
})