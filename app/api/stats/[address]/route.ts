import { type NextRequest, NextResponse } from "next/server"
import { createPublicClient, http, parseAbiItem } from "viem"
import { polygon } from "viem/chains"

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`

// Create viem client for server-side blockchain queries
const publicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"),
})

// Cache player stats for 30 seconds
const statsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 1000

export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
  try {
    const address = params.address

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 })
    }

    // Check cache
    const cached = statsCache.get(address)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ ...cached.data, cached: true })
    }

    // Fetch GameSettled events for this player
    const logs = await publicClient.getLogs({
      address: GAME_CONTRACT_ADDRESS,
      event: parseAbiItem(
        "event GameSettled(uint256 indexed gameId, address indexed player, uint256 totalBet, uint256 totalPayout, uint256 tokensEarned, int256 profit)",
      ),
      args: {
        player: address as `0x${string}`,
      },
      fromBlock: "earliest",
      toBlock: "latest",
    })

    // Calculate stats
    const totalGames = logs.length
    let totalWagered = 0n
    let totalPayout = 0n
    let totalProfit = 0n
    let totalTokensEarned = 0n
    let winCount = 0
    let lossCount = 0
    let biggestWin = 0n
    let biggestLoss = 0n

    logs.forEach((log: any) => {
      const { totalBet, totalPayout: payout, tokensEarned, profit } = log.args

      totalWagered += totalBet
      totalPayout += payout
      totalProfit += profit
      totalTokensEarned += tokensEarned

      if (profit > 0n) {
        winCount++
        if (profit > biggestWin) biggestWin = profit
      } else if (profit < 0n) {
        lossCount++
        const loss = -profit
        if (loss > biggestLoss) biggestLoss = loss
      }
    })

    const winRate = totalGames > 0 ? (winCount / totalGames) * 100 : 0

    const stats = {
      totalGames,
      totalWagered: totalWagered.toString(),
      totalPayout: totalPayout.toString(),
      totalProfit: totalProfit.toString(),
      totalTokensEarned: totalTokensEarned.toString(),
      winCount,
      lossCount,
      biggestWin: biggestWin.toString(),
      biggestLoss: biggestLoss.toString(),
      winRate: winRate.toFixed(2),
    }

    // Update cache
    statsCache.set(address, { data: stats, timestamp: Date.now() })

    return NextResponse.json({ ...stats, cached: false })
  } catch (error) {
    console.error("[API] Stats fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

export const runtime = "nodejs"
