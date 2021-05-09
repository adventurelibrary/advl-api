import test from 'ava'
import {signInUser} from "./lib/cognito";
import {users} from "./lib/fixtures"
import {getJSON} from "./lib/lib";
const {TEST1} = users

test('signup: getting session from logged in user should get their data', async (t) => {
  const jwt = await signInUser(TEST1.username, TEST1.password)
  if (!jwt) {
    t.fail(`JWT is blank`)
  }
  const data = await getJSON('/users', {
    headers: {
      'Authorization': 'JWT ' + jwt
    }
  })
  if (!data.username) {
    t.fail(`Getting user returns no username`)
    t.log(`JSON: ${JSON.stringify(data)}`)
  }
  t.pass()
})

// TODO: Delete the user from the db first, ensure that it gets created. That test should be serial.


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
