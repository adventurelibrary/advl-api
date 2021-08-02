export interface Entity {
  id: string,
  type: "CREATOR" | "USER" | "ADMIN"
}

export interface User {
  id: string, //FK to Entity
  is_admin: boolean
  username: string,
  email: string,
  notification_preferences: NotificationPreferences,
  last_seen: Date,
  join_date: Date,
}

interface NotificationPreferences {

}

export interface UserToken {
  sub: string,
  aud: string,
  email_verified: boolean,
  event_id: string,
  token_use: string,
  auth_time: number,
  iss: string,
  'cognito:username': string,
  exp: number,
  iat: number,
  email: string
}

export interface Creator {
  id: string, //FK to Entity
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
