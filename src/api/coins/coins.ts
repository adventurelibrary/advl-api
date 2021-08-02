import {HandlerResult, newHandler} from '../common/handlers';
import {CoinPurchaseOption} from "../../interfaces/ICoin";

const purchaseOptions : CoinPurchaseOption[] = [
	{
		coins: 500,
		cents: 500,
	},
	{
		coins: 1000,
		cents: 1000
	},
	{
		coins: 2500,
		cents: 2500,
	}
]


export const coins_purchase = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) : Promise<HandlerResult> => {
	console.log("USER: ", user);
	console.log("JSON: ", json);

	return {
		status: 200,
		body: {
			url: 'https://stripe.com/checkout/testing/not/real/data'
		}
	}
})

export const coins_options_get = newHandler({
}, async () : Promise<HandlerResult> => {

	return {
		status: 200,
		body: {
			options: purchaseOptions
		}
	}
})
