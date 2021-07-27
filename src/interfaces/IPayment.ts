export interface REQ_Purchase {
  processor: 'stripe' | 'paypal',
  discount_code?: string,
  type: "coins" | "membership" | "subscription"
  product_id: string //coin pack id, membership pack id, or if subscription, creator_id-level
}

//Purchase of Coins
export interface CoinTransaction {

}

//Subscription to Creator
export interface SubscriptionTransaction {

}

//Membership to the ADVL Site
export interface MembershipTransaction {

}