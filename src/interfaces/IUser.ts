export interface User {
  id: string,
  username: string,
  email: string,
  type: UserType,
  notification_preferences: NotificationPreferences,
  last_seen: string,
  joinDate: string,
}

type UserType = "USER" | "MODERATOR" | "ADMIN" //Permissions 

interface NotificationPreferences {
  
}

export interface UserToken {
  sub: string,
  event_id: string,
  token_user: string,
  scope: string,
  auth_time: number,
  iss: string,
  exp: number, 
  iat: number,
  jti: string,
  client_id: string,
  username: string,
  email: string,
  email_verified: boolean
}