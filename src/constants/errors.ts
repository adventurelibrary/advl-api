import {APIError} from "../lib/errors"

export const ErrNotEnoughCoins = new APIError({
	status: 400,
	key: 'not_enough_coins',
	message: 'Not enough coins'
})

export const ErrAssetAlreadyUnlocked = new APIError({
  status: 400,
  key: 'asset_already_unlocked',
  message: 'You have already unlocked that asset'
})