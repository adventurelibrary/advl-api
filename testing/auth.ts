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
  t.is(data.is_creator, false)
  t.is(data.is_admin, true)
  t.is(data.num_coins, 0)
  t.pass()
})

test('user-register-validate:pass existing email and username', async (t) => {
  const data = await getJSON('/users/registervalidate/', {
    email: 'vindexus+admin@gmail.com', 
    username: 'test-user-01'
  })
  t.is(data.email, 1)
  t.is(data.username, 1)
  t.pass()
})

test('user-register-validate:pass existing email no username', async (t) => {
  const data = await getJSON('/users/registervalidate/', {
    email: 'vindexus+admin@gmail.com', 
    username: ''
  })
  t.is(data.email, 1)
  t.is(data.username, 0)
  t.pass()
})

test('user-register-validate:pass existing username no email', async (t) => {
  const data = await getJSON('/users/registervalidate/', {
    email: '', 
    username: 'test-user-01'
  })
  t.is(data.email, 0)
  t.is(data.username, 1)
  t.pass()
})

test('user-register-validate:pass available email and username', async (t) => {
  const data = await getJSON('/users/registervalidate/', {
    email: 'vindexus+admin@gmail.com2', 
    username: 'test-user-01-2'
  })
  t.is(data.email, 0)
  t.is(data.username, 0)
  t.pass()
})
