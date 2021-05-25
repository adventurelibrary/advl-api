export interface Crate{
  crate_id: string,
  name: string,
  description: string,
  creator_id: string //FK to Creators
  discount_percent: number // this % is applied to the total price of assets in the crate that you don't already own if you buy them all together as crate
}

export interface CrateAsset {
  crate_id: string,
  asset_id: string // FK to Assets
  rank: number
}