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

export const ErrAssetNotUnlocked = new APIError({
	status: 400,
	key: 'asset_not_unlocked',
	message: 'You have not unlocked that asset'
})


export const ErrDownloadTypeMissing = new APIError({
	status: 400,
	key: 'download_type_missing',
	message: 'Download type not provided'
})

export const ErrNoAssetPermission = new APIError({
	status: 403,
	key: 'no_asset_access',
	message: 'You do not have permission to access those assets'
})

export const ErrAssetNotFound = new APIError({
	status: 404,
	key: 'asset_not_found',
	message: 'Could not find that asset'
})

export const ErrCoinPurchaseNotFound = new APIError({
	status: 404,
	key: 'coin_purchase_not_found',
	message: 'Could not find a Coin Purchase'
})
