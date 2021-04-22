import {CognitoUserPool, CognitoUser, AuthenticationDetails} from 'amazon-cognito-identity-js';
import fetch from 'node-fetch';
import {testURL} from './constants';
//import {CognitoUserAttribute} from 'amazon-cognito-identity-js';
//import {idgen} from '../src/api/common/nanoid';

let userpool = new CognitoUserPool({
  ClientId: '19h0kbrgt3lmp72k2d1q41h4se',
  UserPoolId: 'us-east-1_O29QsJhTM'
})

user();
export async function user(){
  try{
    //let user: CognitoUser = (await signupuser())['user'];
    let jwt = await signinuser(new CognitoUser({
      Username: 'test-user-01',
      Pool: userpool
    }));
    console.log(jwt);
    
    //send to ADVL server
    await fetch(testURL+'user', {
      method: 'get',
      headers: {
        "Authentication": <string>jwt
      }
    })

  } catch (e) {
    console.error(e);
  }
}

async function signinuser(user: CognitoUser){
  return new Promise((resolve, reject) => {
    const AuthData = new AuthenticationDetails({
      //Username: user.getUsername(),
      Username: 'test-user-01',
      Password: 'test-password'
    })
    
    user.authenticateUser(AuthData, {
      onSuccess: (success) => {
        console.log("Success:", success)
        //after logged in, send the user jwt to server
        const jwt = success.getAccessToken().getJwtToken();
        resolve(jwt);
      },
      onFailure: (error) => {
        console.error(error)
        reject(error)
      }
    })
  })
}

/*
async function signupuser(){
  return new Promise((resolve, reject) => {
    let username = idgen();
    try{
      userpool.signUp(
        username,
        'test-password',
        [new CognitoUserAttribute({
          Name: 'email',
          Value: username+'@adventurelibrary.art'
        })],
        [],
        (err, response) => {
          if(err){reject(err)}
          console.log(response);
          resolve(response)
        }
      )
    } catch(e) {
      console.error(e);
      reject(e);
    }
  })
}  

*/