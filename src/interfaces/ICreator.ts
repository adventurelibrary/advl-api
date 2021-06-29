export interface Creator {
  id: string,
  owner_id: string,
  name: string
  slug: string
  description: string
}

export interface UserCreatorRelation {
  creator_id: string,
  user_id: string
}

export interface REQ_NewCreator{
  id: string //id of the owner of this creator page
}

export interface REQ_UpdateCreator {
  description?: string
}
