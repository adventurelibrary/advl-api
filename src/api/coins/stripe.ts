//webhook listeners
import {APIGatewayProxyHandler} from "aws-lambda";
import {insertObj, updateObj} from "../common/postgres";
import {checkPendingPaymentIntent, createPaymentIntent, createPaymentSession, stripe} from "../../lib/stripe"
import {createNewCoinPurchase, getCoinPurchaseByKey} from "../../lib/purchases";
import {addEntityCoins, getEntityNumCoins} from "../../lib/coins";
import {HandlerResult, newHandler} from "../common/handlers";
import {ErrCoinPurchaseNotFound} from "../../constants/errors";
import {getPurchaseOption} from "./coins";

/**
 * Can't use newHandler here because it's built on newResponse, which uses CORS rules
 * The events for this endpoint will come from stripe.com not from adventurelibrary.art
 */
export const event_listener:APIGatewayProxyHandler = async (_evt, _ctx) => {
  const data = JSON.parse(_evt.body)
  console.log("EVENT: \n", data);

  console.log(_evt.headers);
  const sig = _evt.headers['Stripe-Signature']

  let event;
  try {
    event = stripe.webhooks.constructEvent(_evt.body, sig, process.env.STRIPE_WEBHOOK_SIGNING_SECRET);
  }
  catch (err) {
    console.log('ERROR VERIFYING STRIPE WEBHOOK', err)
    return {
      statusCode: 500,
      body: 'Could not verify webhook'
    }
  }

  const webhook = {
    payload: event,
    provider: 'stripe'
  }

  await insertObj('purchase_webhooks', webhook)

  const type = data.type

  if (type === 'checkout.session.completed') {
    return await handleCheckoutSessionCompleted(data)
  }

  return {
    statusCode: 200,
    body: ""
  }
}

// Handles the webhook when it is for a successfully completed payment
// We want to update the payment to complete, and give the user their coins
export async function handleCheckoutSessionCompleted (stripeEvent: any) {
  const data = stripeEvent.data
  const key = data.object.client_reference_id
  const purchase = await getCoinPurchaseByKey(key)

  if (!purchase) {
    throw new Error('Could not find coin purchase with key: ' + key)
  }

  // If the numbers don't match then something went wrong
  if (purchase.cents !== data.object.amount_total) {
    purchase.status = 'error'
    purchase.note = `Purchase amount ${purchase.cents} did not match Stripe event amount ${data.object.amount_total}`
  } else {
    purchase.status = 'complete'

    // Add a record to this user's account of the coins
    await addEntityCoins(purchase.user_id, purchase.coins, {
      purchase_id: purchase.id
    })
  }

  // Save the event regardless of what happens
  await updateObj(process.env.DB_COIN_PURCHASES, purchase.id, purchase)

  return {
    statusCode: 200,
    body: 'Success'
  }
}

// Use in external purchasing to create Stripe Checkout URL
// to redirect the user to
export const stripe_create_checkout = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) : Promise<HandlerResult> => {

  const po = getPurchaseOption(json)

  // Create a record in our db that we will use to check against the webhook response
  // from stripe
  const purchase = await createNewCoinPurchase('stripe', user, po)

  // Use Stripe's API to create checkout session, which gives us the URL that the user
  // should be redirected to to finish their purchase
  const sess = await createPaymentSession(purchase)

  return {
    status: 200,
    body: {
      url: sess.url
    }
  }
})

// Create a Stripe Client Secret that can be used with Stripe SDK on the frontend
// to create a checkout form directly on our site
export const stripe_create_intent = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) : Promise<HandlerResult> => {

  const po = getPurchaseOption(json)

  // Use Stripe's API to create a Stripe PaymentIntent. This comes with a client_secret
  // variable
  const intent = await createPaymentIntent(po.cents)

  // Create a record in our db that we will use to check against the webhook response
  // from stripe
  await createNewCoinPurchase('stripe', user, po, intent.id)

  return {
    status: 200,
    body: {
      client_secret: intent.client_secret
    }
  }
})

/**
 * Given a Stripe PaymentIntent, it will find that payment and attempt to give the user coins
 * based on it.
 * This happens when the frontend makes a payment through Stripe's SDK and gets back a success from Stripe
 * Our frontend gets that PaymentIntent and asks our server here to give the user their coins
 */
export const stripe_confirm_intent = newHandler({
  requireUser: true,
  takesJSON: true
}, async ({json, user}) : Promise<HandlerResult> => {
  const stripePIId = json.paymentIntentId
  const coinPurchase = await getCoinPurchaseByKey(stripePIId)

  // We throw this error if we can't find it OR if the user is wrong
  // Throwing a 404 when user is wrong so that we don't reveal that the id
  // is correct
  if (!coinPurchase || coinPurchase.user_id != user.id) {
    throw ErrCoinPurchaseNotFound
  }

  const result = await checkPendingPaymentIntent(coinPurchase)
  const coins = await getEntityNumCoins(user.id)

  return {
    status: 200,
    body: {
      coins,
      result,
      purchase: {
        ...coinPurchase
      },
    }
  }
})

