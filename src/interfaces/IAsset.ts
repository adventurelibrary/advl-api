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
  revenue_share: RevenueShare,
  visibility: AssetVisibility,
}

export type AssetVisibility = "HIDDEN" | "PUBLIC"
export type UploadStatus = "PENDING" | "COMPLETE" | "FAILED"

export interface Asset extends UserDefinedAssetInfo {
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
  published_date?: Date
  upload_status: UploadStatus
}

interface RevenueShare {
  [creatorID: string]: number // Number of coins per sale to go to this creator
}

export interface REQ_Query_Assets{
  id?: string,
  query?: string
}

export type AssetSortField = "uploaded.raw" | "published_date.raw" | "unlock_count" | "unlock_price" | "_score" | "name.raw"
export type AssetSortType = "asc" | "desc"

export interface AssetSearchOptions {
  assetIds?: string[]
  sort?: AssetSortField
  sort_direction?: AssetSortType
  from?: number,
  size?: number

  text?: string, // will search name & description
  refresh?: boolean
  visibility?: AssetVisibility[] | 'all'
  upload_status?: 'all' | 'completed'
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
  visibility?: AssetVisibility,
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
