import {CoinPurchaseOption} from "../interfaces/ICoin";

export const PURCHASE_OPTIONS : CoinPurchaseOption[] = [
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

export function getPurchaseOptionByCoins (coins: number) {
	for (let i = 0; i < PURCHASE_OPTIONS.length; i++) {
		const po = PURCHASE_OPTIONS[i]
		if (po.coins === coins) {
			return po
		}
	}

	return undefined
}
