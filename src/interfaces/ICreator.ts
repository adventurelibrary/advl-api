export interface Creator {
  id: string,
  owner_id: string,
  name: string
  description: string
}

export interface UserCreatorRelation {
  creatorID: string,
  userID: string
}

export interface REQ_NewCreator{
  id: string //id of the owner of this creator page
}

export interface REQ_UpdateCreator {
  description?: string
}
