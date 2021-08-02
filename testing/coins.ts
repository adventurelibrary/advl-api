import ava from 'ava';
import {objHasValues, request, testResStatus} from './lib/lib';

// STRIPE
// Buy Coin Pack
ava('coins: buy a coinpack for a user', async (t) => {
  let res = await request('coins/purchase', {
    userKey: 'TEST1',
  })

  const status = res.status
  t.is(status, 200)

  const body = await res.json()

  const location = body.url
  t.truthy(location.length > 10, 'Location header should exist')
  t.truthy(location.indexOf('stripe.com') >= 0, 'Location should be to stripe.com')
  t.pass()
})

// USER
// Check Account Balance
// Purchase Asset

ava('coins:get list of possible purchases', async (t) => {
  let res = await request('coins/options')
  let err = await testResStatus(res, 200)
  if (err) {
    t.fail(err)
  }

  const json = await res.json()
  const options = json.options
  t.is(options.length, 3)
  err = objHasValues(options[0], {
    coins: 500,
    cents: 500,
  })
  if (err) {
    t.fail(err)
  }

  err = objHasValues(options[1], {
    coins: 1000,
    cents: 1000,
  })
  if (err) {
    t.fail(err)
  }

  err = objHasValues(options[2], {
    coins: 2500,
    cents: 2500,
  })
  if (err) {
    t.fail(err)
  }
  t.pass()
})
