import {Asset} from "../interfaces/IAsset"


export type AssetSearchParams = {
	text?: string
	id?: string
	ids?: string[]
}

type AssetSearchResponse = {
	total: number,
	assets: Asset[]
}

export async function searchAssets (params: AssetSearchParams) : Promise<AssetSearchResponse> {

}