export interface REQ_Get_Signature extends UserDefinedAssetInfo{}
export interface RES_Get_Signature{
  params: string, //JSON string that is used in the signature
  signature: string,
  assetID: string
}

export type Category = 'map' | 'character' | 'scene' | 'token'

interface UserDefinedAssetInfo {
  name: string,
  description: string,
  category: Category,
  creator_id: string,
  tags: string[],
  unlock_price: number,
  revenue_share: RevenueShare
}

export type visibility_types = "PENDING" | "HIDDEN" | "PUBLIC"

export interface Asset extends UserDefinedAssetInfo{
  id: string,

  creator_id: string,
  creator_name?: string, //Used when returning it to Front End
  creator_slug?: string // From a left join. Sent to EC for searching
  deleted?: boolean
  filetype: "IMAGE" | "PDF" | "ZIP",
  original_file_ext: string,
  previewLink?: string, //Used when returning to Front End
  size_in_bytes: number,
  slug: string,
  thumbnail?: string //Used when returning to Front End
  unlock_count: number,
  unlocked?: boolean, // Set on an asset we get from the db for a logged in user
  uploaded: Date,
  visibility: visibility_types,
}

interface RevenueShare {
  [creatorID: string]: number // Number of coins per sale to go to this creator
}

export interface REQ_Query_Assets{
  id?: string,
  query?: string
}

export interface AssetSearchOptions {
  assetIds?: string[]
  sort?: "uploaded.raw" | "unlock_count" | "unlock_price" | "_score" | "name"
  sort_type?: "asc" | "desc",
  from?: number,
  size?: number

  text?: string, // will search name & description
  visibility?: visibility_types[] | 'all'
  tags?: string[],
  categories?: Category[],
  creator_ids?: string[]
  creator_slugs?: string[]
}

export interface REQ_DownloadLink {
  id: string,
  type?: image_file_resolutions // not used for PDF or ZIP files
}
export type image_file_resolutions = "original" | "optimized" | "watermarked" | "thumbnail"

export interface REQ_Update {
  id: string,
  visibility?: visibility_types,
  name: string,
  description: string,
  collectionID: string,
  category: string,
  tags: string[],
  unlock_price: number,
  revenue_share: RevenueShare
}

export interface AssetUnlock {
  id: number
  user_id: string
  asset_id: string
  date_created: Date
  note: string
}
