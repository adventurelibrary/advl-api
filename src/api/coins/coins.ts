import {HandlerResult, newHandler} from '../common/handlers';
import {getPurchaseOptionByCoins, PURCHASE_OPTIONS} from "../../constants/coins";
import {APIError} from "../../lib/errors";
import {CoinPurchaseOption} from "../../interfaces/ICoin";

// Find which purchase option they have selected, by the coins provided
export function getPurchaseOption (json: any) : CoinPurchaseOption {
	const po = getPurchaseOptionByCoins(json.coins)
	if (!po) {
		throw new APIError({
			key: 'invalid_coins',
			status: 400,
			message: 'Invalid number of coins to purchase'
		})
	}
	return po
}

export const coins_options_get = newHandler({
}, async () : Promise<HandlerResult> => {

	return {
		status: 200,
		body: {
			options: PURCHASE_OPTIONS
		}
	}
})
