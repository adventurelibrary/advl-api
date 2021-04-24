export interface User {
  id: string, // "subject-identifier" aka user ID
  username: string,
  isCreator: boolean,
  joinDate: string,
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
  username: string
}

export interface UserNotFoundError{
  error: "User not found",
  token: UserToken
}