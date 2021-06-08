import { Asset } from "./IAsset";

export interface Bundle {
  id: string, // Unique
  name: string,
  description: string,
  public: boolean,
  creator_id: string // FK to Creators, nullable
  user_id: string //FK to Users, nullable
  creator_name?: string
  username?: string
}

export interface BundleAsset {
  id: string, // Not Unique
  asset_id: string, //FK to Assets
  time_added: Date
}

export interface REQ_Bundle_Create {
  name: string,
  public: boolean,
  description: string,
  creator_id?: string,
  added_assets?: string[]
}

export interface REQ_Bundle_Update {
  creator_id?:string //only required if the original creator was a creator,
  name?: string,
  description?: string,
  public?: boolean,
  removed_assets?: string[],
  added_assets?: string[]
}

export interface GetBundle extends Bundle{
  assets: Asset[]
}
