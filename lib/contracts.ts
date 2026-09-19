const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const configuredGameAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || ZERO_ADDRESS
const configuredTokenAddress = process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS || ZERO_ADDRESS
const configuredNetworkId = process.env.NEXT_PUBLIC_NETWORK_ID
const paidModeFlag = process.env.NEXT_PUBLIC_PAID_MODE_ENABLED !== "false"
const isProduction = process.env.NODE_ENV === "production" && process.env.APP_ENV === "production"

export const POLY_PLINKO_GAME_ADDRESS = configuredGameAddress
export const POLY_PLINKO_TOKEN_ADDRESS = configuredTokenAddress
export const PAID_MODE_ENABLED = paidModeFlag

export function isConfiguredAddress(address: string): boolean {
  return paidModeFlag && /^0x[a-fA-F0-9]{40}$/.test(address) && !/^0x0{40}$/i.test(address)
}

if (isProduction && (
  !configuredNetworkId || !["137", "80002"].includes(configuredNetworkId) ||
  !isConfiguredAddress(configuredGameAddress) || !isConfiguredAddress(configuredTokenAddress)
)) {
  throw new Error("Production blockchain configuration is incomplete or points to a non-public chain")
}

export function requireConfiguredAddress(address: string, name: string): `0x${string}` {
  if (!isConfiguredAddress(address)) {
    throw new Error(`${name} is not configured with a deployed contract address`)
  }
  return address as `0x${string}`
}

export const POLYGON_CHAIN_ID = 137
export const POLYGON_AMOY_CHAIN_ID = 80002
export const EXPECTED_CHAIN_ID = Number(configuredNetworkId || (process.env.APP_ENV === "public-readonly" ? 0 : 1337))

export function requireExpectedChain(chainId: number | undefined): void {
  if (chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Wrong network. Connect to chain ${EXPECTED_CHAIN_ID} before submitting a transaction.`)
  }
}

export const GAME_ABI = [
  "function playPlinko((uint8 rows, uint16 balls, uint8 risk, uint256 betPerBall) config) payable",
  "function swapExactMaticForTokens(uint256 minTokensOut) payable",
  "function swapExactTokensForMatic(uint256 tokenAmountIn, uint256 minMaticOut)",
  "function buybackAndBurn()",
  "function getPlayerGames(address player) view returns (uint256[])",
  "function getLossMiningTierInfo() view returns (uint256 tier, uint256 pricePerToken, uint256 tokensLeftInTier)",
  "function getSwapQuoteMaticToTokens(uint256 maticIn) view returns (uint256)",
  "function getSwapQuoteTokensToMatic(uint256 tokensIn) view returns (uint256)",
  "function games(uint256) view returns (address player, (uint8 rows, uint16 balls, uint8 risk, uint256 betPerBall) config, uint256 totalBet, uint256 totalPayout, uint64 requestId, uint256 randomSeed, bool settled, uint40 createdAt)",
  "function houseBankroll() view returns (uint256)",
  "function miningEmitted() view returns (uint256)",
  "function reserveMatic() view returns (uint256)",
  "function reserveToken() view returns (uint256)",
  "function totalTokensBurned() view returns (uint256)",
  "function getAvailableBankroll() view returns (uint256)",
  "event GameRequested(uint256 indexed gameId, address indexed player, uint64 requestId, uint256 totalBet, uint8 rows, uint16 balls, uint8 risk)",
  "event GameSettled(uint256 indexed gameId, address indexed player, uint256 randomSeed, uint256 totalBet, uint256 totalPayout, int256 profit, uint256 tokensEarned)",
] as const

export const TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
] as const

export const GAME_CONTRACT_ABI = GAME_ABI
export const TOKEN_CONTRACT_ABI = TOKEN_ABI

export enum RiskLevel {
  Low = 0,
  Medium = 1,
  High = 2,
}

export interface GameConfig {
  rows: number
  balls: number
  risk: RiskLevel
  betPerBall: bigint
}

export interface GameResult {
  gameId: bigint
  player: string
  randomSeed: bigint
  totalBet: bigint
  totalPayout: bigint
  profit: bigint
  tokensEarned: bigint
}
