export interface CoinTransaction{
  sub: string, // user-id
  type: "SPEND" | "FUND" | "CASH-OUT",
  status: "PENDING" | "CONFIRMED",
  timestamp: string,
  amount: number
}