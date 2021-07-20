// This should eventually support both Stripe and paypal, so we want to have a provider agnostic payments api to use in our code

import Stripe from 'stripe';
//import { idgen } from './nanoid'; //used for idempotency keys

const stripe = new Stripe(process.env.SECRET, {
  apiVersion: '2020-08-27'
});

export interface PaymentIntentOptions{
  processor: "stripe",
  metadata?: any,
  description?: string,
  statement_descriptor?: string //LIMITED TO 22 Characters
  amount: number //in cents
}

/*
export async const newPaymentIntent(opts: PaymentIntentOptions):Promise<string>{

}
*/