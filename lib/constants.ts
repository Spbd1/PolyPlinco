export const APP_CONFIG = {
  // Game settings
  MIN_BET_POL: 0.01,
  MIN_ROWS: 8,
  MAX_ROWS: 32,
  MIN_BALLS: 1,
  MAX_BALLS_PAID: 10000, // Updated max balls from 1000 to 10000 per day for paid players
  MAX_BALLS_DEMO: 10,

  // Demo mode
  DEMO_DAILY_LIMIT: 10, // Updated daily limit to 10 balls for free demo players

  // Token
  PPL_SYMBOL: "PPL",
  PPL_NAME: "PolyPlinko Token",
  PPL_MAX_SUPPLY: 1_000_000,
  PPL_MINING_SUPPLY: 900_000,
  PPL_DEV_ALLOCATION: 10_000,
  PPL_LIQUIDITY_ALLOCATION: 90_000,

  // Loss-mining tiers
  MINING_TIERS: 9,
  TIER_SIZE: 100_000,
  TIER_START_PRICE: 0.02, // MATIC
  TIER_END_PRICE: 0.1, // MATIC

  // Post-mining split
  BUYBACK_PERCENTAGE: 70,
  VAULT_PERCENTAGE: 30,

  // Swap
  SWAP_FEE_PERCENTAGE: 5,

  // Game
  HOUSE_EDGE_PERCENTAGE: 10,
  DEV_FEE_PERCENTAGE: 1,

  // Network
  POLYGON_CHAIN_ID: 137,
  AMOY_CHAIN_ID: 80002,

  // UI
  ANIMATION_DURATION_MS: 5000,
  BIG_WIN_THRESHOLD_MULTIPLIER: 2,
} as const

export type RiskLevel = "Low" | "Medium" | "High"

export const RISK_COLORS = {
  Low: "from-green-600 to-emerald-600",
  Medium: "from-yellow-600 to-orange-600",
  High: "from-red-600 to-pink-600",
} as const

export const MULTIPLIER_FORMULAS = {
  Low: { base: 0.8, coefficient: 1.5, power: 2 },
  Medium: { base: 0.5, coefficient: 3.0, power: 2 },
  High: { base: 0.2, coefficient: 6.0, power: 3 },
} as const
