import {newHandler} from '../common/handlers';
import {CoinPurchaseOption} from "../../interfaces/ICoin";

const options : CoinPurchaseOption[] = [
	{
		coins: 500,
		cents: 500,
	}
]


export const coins_purchase = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) => {
	console.log("USER: ", user);
	console.log("JSON: ", json);

	return {
		status: 200,

	}
})

export const coins_options_get = newHandler({
}, async () => {

	return {
		status: 200,
		body: {
			options
		}
	}
})
