export interface Bundle {
  bundle_id: string, // Unique
  name: string,
  description: string,
  creator_id: string // FK to Creators, nullable
  user_id: string //FK to Users, nullable
}

export interface BundleAsset {
  bundle_id: string, // Not Unique
  asset_id: string, //FK to Assets
  rank: number
}