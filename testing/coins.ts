import '../load-yaml-env'
import ava from 'ava';
import {objHasValues, request, testResStatus} from './lib/lib';
import {query} from "../src/api/common/postgres";
import {users} from "../testing/lib/fixtures"
import {handleCheckoutSessionCompleted} from "../src/api/coins/stripe";
import {getCoinPurchaseByKey} from "../src/lib/purchases";
import {getEntityNumCoins} from "../src/lib/coins";

// STRIPE
// Buy Coin Pack
ava.serial('coins: buy a coinpack for a user', async (t) => {
  let idsToDelete = []
  for (let i = 1; i <= 2; i++) {
    let res = await request('coins/purchase', {
      userKey: 'CREATOR1',
      method: 'POST',
      body: {
        coins: 500
      }
    })

    const status = res.status
    t.is(status, 200)

    const body = await res.json()

    const location = body.url
    t.truthy(location.length > 10, 'Location header should exist')
    t.truthy(location.indexOf('stripe.com') >= 0, 'Location should be to stripe.com')

    const rows = await query(`SELECT * FROM ${process.env.DB_COIN_PURCHASES} ORDER BY created_date DESC`)
    const purchase = rows[0]
    t.is(purchase.user_id, users.CREATOR1.id)
    t.is(purchase.coins, 500)
    t.truthy(purchase.key.length > 0)

    // Fake the webhook event from stripe
    // We skip doing an http request to our server because it will fail when it attempts to verify
    // that this webhook originated at Stripe
    try {
      const fakeWebhook = {
        data: {
          object: {
            client_reference_id: purchase.key,
            amount_total: 500
          }
        }
      }
      await handleCheckoutSessionCompleted(fakeWebhook)
    } catch (ex) {
      t.fail(ex.toString())
    }

    // Check that the coin purchase has been
    const purchaseAfter = await getCoinPurchaseByKey(purchase.key)

    t.is(purchaseAfter.id, purchase.id)
    t.not(purchaseAfter.status, purchase.status)
    t.is(purchaseAfter.status, 'complete')
    idsToDelete.push(purchase.id)
  }


  // Check that the user's num_coins has been updated
  const num = await getEntityNumCoins(users.CREATOR1.id)
  t.is(num, 1000) // 0 in our test data, +1000 from these purchases

  // Data clean. Remove the coins and the purchase.
  await query(`DELETE FROM ${process.env.DB_ENTITY_COINS} WHERE purchase_id = $1 OR purchase_id = $2`, idsToDelete)

  await query(`DELETE FROM ${process.env.DB_COIN_PURCHASES} WHERE id = $1 OR id = $2`, idsToDelete)


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
