export interface REQ_Get_Signature extends UserDefinedAssetInfo{}
export interface RES_Get_Signature{
  params: string, //JSON string that is used in the signature
  signature: string
}

interface UserDefinedAssetInfo {
  name: string,
  description: string,
  collectionID: string,
  categoryID: string,
  tagIDs: Tags,
  unlockPrice: number, 
  revenueShare: RevenueShare
}

export interface Asset extends UserDefinedAssetInfo{
  id: string, 
  slug: string,
  size: number,
  uploaded: Date,
  status: "PENDING" | "HIDDEN" | "PUBLIC",
  fileType: "IMAGE" | "PDF" | "ZIP",
  creatorID: string,
  unlockCount: number,
}

interface Tags {
  [tag: string]: number // Weight, heigher is more important
}

interface RevenueShare {
  [creatorID: string]: number // Number of coins per sale to go to this creator
}