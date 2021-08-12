//webhook listeners
import { APIGatewayProxyHandler } from "aws-lambda";
import {insertObj, updateObj} from "../common/postgres";
import {stripe} from "../../lib/stripe"
import {getCoinPurchaseByKey} from "../../lib/purchases";
import {addEntityCoins} from "../../lib/coins";

/**
 * Can't use newHandler here because it's built on newResponse, which uses CORS rules
 * The events for this endpoint will come from stripe.com not from adventurelibrary.art
 */
export const event_listener:APIGatewayProxyHandler = async (_evt, _ctx) => {
  const data = JSON.parse(_evt.body)
  console.log("EVENT: \n", data);

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
  console.log('data', data)

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
