export interface User {
  id: string,
  is_admin: boolean,
  username: string,
  email: string,
  notification_preferences: NotificationPreferences,
  last_seen: Date,
  join_date: Date,
}

//type UserType = "USER" | "MODERATOR" | "ADMIN" //Permissions

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
