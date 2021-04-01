export interface REQ_Get_Signature extends UserDefinedAssetInfo{}
export interface RES_Get_Signature{
  params: string, //JSON string that is used in the signature
  signature: string,
  assetID: string
}

interface UserDefinedAssetInfo {
  name: string,
  description: string,
  collectionID: string,
  category: string,
  tags: Tags,
  unlockPrice: number, 
  revenueShare: RevenueShare
}

export interface Asset extends UserDefinedAssetInfo{
  id: string, 
  slug: string,
  sizeInBytes: number,
  uploaded: string, //ISO String
  visibility: "PENDING" | "HIDDEN" | "PUBLIC",
  creatorID: string,
  unlockCount: number,
  fileType: "IMAGE" | "PDF" | "ZIP",
  originalFileExt: string,
  creatorName?: string, //Used when returning it to Front End
  previewLink?: string, //Used when returning to Front End
  thumbnail?: string //Used when returning to Front End
}

interface Tags {
  [tag: string]: number // Weight, heigher is more important
}

interface RevenueShare {
  [creatorID: string]: number // Number of coins per sale to go to this creator
}

export interface REQ_Query_Assets{
  id?: string,
  query?: string
}

export interface REQ_Query {
  id?:string,
  sort?: "uploaded" | "unlockCount" | "unlockPrice" | "_score" | "name"
  sort_type?: "asc" | "desc",
  from?: number,
  size?: number

  text?: string, // will search name & description
  visibility?: "PENDING" | "HIDDEN" | "PUBLIC"
  originalFileExt?: string,
  creatorName?: string,
  collectionID?: string,
  tags?: string[],
  category?: string,
}

export interface REQ_DownloadLink {
  id: string,
  type?: image_file_resolutions // not used for PDF or ZIP files
}
export type image_file_resolutions = "original" | "optimized" | "watermarked" | "thumbnail" 