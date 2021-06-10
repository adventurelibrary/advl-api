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

test('user:get session of creator', async (t) => {
  const data = await getJSON('/users', {
    userKey: 'CREATOR1'
  })
  t.is(data.username, 'test-creator-1')
  t.is(data.is_creator, true)
  t.is(data.is_admin, false)
  t.pass()
})

test('user:get session of regular user', async (t) => {
  const data = await getJSON('/users', {
    userKey: 'TEST1'
  })
  t.is(data.username, 'test-user-01')
  t.is(data.is_creator, false)
  t.is(data.is_admin, false)
  t.pass()
})

test('user:get session of admin', async (t) => {
  const data = await getJSON('/users', {
    userKey: 'ADMIN1'
  })
  t.is(data.username, 'test-admin-1')
  t.is(data.is_creator, false) //?
  t.is(data.is_admin, true)
  t.pass()
})
