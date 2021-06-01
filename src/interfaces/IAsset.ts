export interface REQ_Get_Signature extends UserDefinedAssetInfo{}
export interface RES_Get_Signature{
  params: string, //JSON string that is used in the signature
  signature: string,
  assetID: string
}

export type category = 'map' | 'character' | 'scene' | 'token'

interface UserDefinedAssetInfo {
  name: string,
  description: string,
  category: category,
  creator_id: string,
  tags: string[],
  unlock_price: number,
  revenue_share: RevenueShare
}

export type visibility_types = "PENDING" | "HIDDEN" | "PUBLIC"

export interface Asset extends UserDefinedAssetInfo{
  id: string,
  slug: string,
  size_in_bytes: number,
  uploaded: Date,
  visibility: visibility_types,
  unlock_count: number,
  filetype: "IMAGE" | "PDF" | "ZIP",
  original_file_ext: string,
  creator_id: string,
  creator_name?: string, //Used when returning it to Front End
  previewLink?: string, //Used when returning to Front End
  thumbnail?: string //Used when returning to Front End
}

interface RevenueShare {
  [creatorID: string]: number // Number of coins per sale to go to this creator
}

export interface REQ_Query_Assets{
  id?: string,
  query?: string
}

export interface REQ_Query {
  id? :string,
  ids? : string[],
  sort?: "uploaded" | "unlock_count" | "unlock_price" | "_score" | "name"
  sort_type?: "asc" | "desc",
  from?: number,
  size?: number

  text?: string, // will search name & description
  visibility?: visibility_types[] | 'all'
  original_file_ext?: string,
  creator_name?: string, // Can come from join queries
  collectionID?: string,
  tags?: string[],
  categories?: category[],
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
