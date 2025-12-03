/**
 * Export analytics data for business intelligence
 * Run daily to export game statistics
 */

import { createPublicClient, http, parseAbiItem } from "viem"
import { polygon } from "viem/chains"
import { writeFileSync } from "fs"

const GAME_CONTRACT = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`

interface GameAnalytics {
  date: string
  totalGames: number
  totalVolume: string
  totalPayout: string
  houseProfit: string
  uniquePlayers: number
  avgBetSize: string
  totalTokensEmitted: string
  winRate: number
}

async function exportAnalytics(fromBlock: bigint, toBlock: bigint): Promise<GameAnalytics> {
  const client = createPublicClient({
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL),
  })

  const logs = await client.getLogs({
    address: GAME_CONTRACT,
    event: parseAbiItem(
      "event GameSettled(uint256 indexed gameId, address indexed player, uint256 randomSeed, uint256 totalBet, uint256 totalPayout, int256 profit, uint256 tokensEarned)",
    ),
    fromBlock,
    toBlock,
  })

  let totalVolume = 0n
  let totalPayout = 0n
  let totalProfit = 0n
  let totalTokens = 0n
  let wins = 0
  const uniquePlayers = new Set<string>()

  logs.forEach((log: any) => {
    const { player, totalBet, totalPayout: payout, profit, tokensEarned } = log.args

    totalVolume += totalBet
    totalPayout += payout
    totalProfit += profit
    totalTokens += tokensEarned

    if (profit > 0n) wins++
    uniquePlayers.add(player.toLowerCase())
  })

  const analytics: GameAnalytics = {
    date: new Date().toISOString().split("T")[0],
    totalGames: logs.length,
    totalVolume: (Number(totalVolume) / 1e18).toFixed(2),
    totalPayout: (Number(totalPayout) / 1e18).toFixed(2),
    houseProfit: (Number(totalProfit) / 1e18).toFixed(2),
    uniquePlayers: uniquePlayers.size,
    avgBetSize: logs.length > 0 ? (Number(totalVolume) / 1e18 / logs.length).toFixed(4) : "0",
    totalTokensEmitted: (Number(totalTokens) / 1e18).toFixed(2),
    winRate: logs.length > 0 ? (wins / logs.length) * 100 : 0,
  }

  return analytics
}

async function main() {
  console.log("Exporting PolyPlinko analytics...\n")

  const client = createPublicClient({
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL),
  })

  const currentBlock = await client.getBlockNumber()
  const blocksPerDay = BigInt(43200) // ~2 sec per block on Polygon

  // Last 24 hours
  const fromBlock = currentBlock - blocksPerDay
  const toBlock = currentBlock

  const analytics = await exportAnalytics(fromBlock, toBlock)

  console.log(JSON.stringify(analytics, null, 2))

  // Save to file
  const filename = `analytics-${analytics.date}.json`
  writeFileSync(filename, JSON.stringify(analytics, null, 2))

  console.log(`\nAnalytics exported to ${filename}`)
}

main().catch(console.error)
