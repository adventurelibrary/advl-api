export interface REQ_Get_Signature{
  user: string,
  file: string,
  asset_data: any // TODO: Specify what data is required to generate a pre flight
}

export interface RES_Get_Signature{
  template: string, //JSON String for a Template
  signature: string
}