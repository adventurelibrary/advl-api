export interface REQ_Get_Signature{
  userName: string,
  fileName: string,
  assetData: any // TODO: Specify what data is required to generate a pre flight
}

export interface RES_Get_Signature{
  params: string, //JSON string that is used in the signature
  signature: string
}