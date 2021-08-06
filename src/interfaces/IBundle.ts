import { Asset } from "./IAsset";

export interface Bundle {
  id: string, // Unique
  name: string,
  description: string,
  public: boolean,
  entity_id: string // FK to Entities
  creator_name?: string
  username?: string
  cover_thumbnail?: string // From a join and from B2.GetURL
  cover_asset_id?: string
  cover_creator_id?: string
  cover_original_file_ext?: string
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
