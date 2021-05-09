import {AuthenticationDetails, CognitoUser, CognitoUserPool} from "amazon-cognito-identity-js";

export const COGNITO_CLIENT_ID = process.env.TEST_COGNITO_CLIENT_ID || '19h0kbrgt3lmp72k2d1q41h4se'
export const COGNITO_USER_POOL_ID = process.env.TEST_COGNITO_USER_POOL_ID || 'us-east-1_O29QsJhTM'

const userpool = new CognitoUserPool({
  ClientId: COGNITO_CLIENT_ID,
  UserPoolId:COGNITO_USER_POOL_ID
})

// Attempts to log in with a username and password, returning their JWT
// as a string
// The cache is so that if multiple tests need to authenticate a user, it won't
// make a bunch of requests to Cognito
const jwtCache : Record<string, string> = {}
export async function signInUser(username : string, password : string, useCache = true) :Promise<string> {
  if (useCache && jwtCache[username]) {
    return Promise.resolve(jwtCache[username])
  }

  const cUser = new CognitoUser({
    Username: username,
    Pool: userpool
  })

  return new Promise((resolve, reject) => {
    const AuthData = new AuthenticationDetails({
      //Username: user.getUsername(),
      Username: username,
      Password: password
    })

    cUser.authenticateUser(AuthData, {
      onSuccess: (success) => {
        console.log("Success:", success)
        //after logged in, send the user jwt to server
        const jwt = success.getIdToken().getJwtToken();
        jwtCache[username] = jwt
        resolve(jwt);
      },
      onFailure: (error) => {
        console.error(error)
        reject(error)
      }
    })
  })
}
