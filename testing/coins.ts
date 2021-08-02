import ava from 'ava';
import {objHasValues, request, testResStatus} from './lib/lib';

// STRIPE
// Buy Coin Pack
ava('coins: buy a coinpack for a user', async (t) => {
  let res = await (await request('coins/purchase', {
    userKey: 'TEST1',
    method: 'POST',
    body: {
      provider: "stripe",
      product_id: '001',
    }
  })).json()

  console.log("Coin Purchase Response: ", res);
  t.fail();
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
    price: 500,
  })
  if (err) {
    t.fail(err)
  }

  err = objHasValues(options[1], {
    coins: 1000,
    price: 1000,
  })
  if (err) {
    t.fail(err)
  }

  err = objHasValues(options[2], {
    coins: 2500,
    price: 2500,
  })
  if (err) {
    t.fail(err)
  }
})
