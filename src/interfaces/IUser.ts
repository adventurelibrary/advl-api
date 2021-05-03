export interface User {
  id: string,
  username: string,
  email: string,
  notification_preferences: NotificationPreferences,
  last_seen: string,
  join_date: string,
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