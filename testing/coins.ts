import ava from 'ava';
import { request } from './lib/lib';

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