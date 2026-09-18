import { createPublicClient, http, parseAbiItem } from "viem"
import { polygon } from "viem/chains"

const GAME_CONTRACT = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`
const TOKEN_CONTRACT = process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS as `0x${string}`

const client = createPublicClient({
  chain: polygon,
  transport: http(process.env.POLYGON_RPC_URL),
})

async function monitorContract() {
  console.log("🔍 Monitoring PolyPlinko Contracts...")

  // Check contract balance
  const balance = await client.getBalance({ address: GAME_CONTRACT })
  console.log(`\n💰 Contract Balance: ${(Number(balance) / 1e18).toFixed(2)} MATIC`)

  if (Number(balance) < 100n * 10n ** 18n) {
    console.warn("⚠️  WARNING: Contract balance low! Consider adding funds.")
  }

  // Fetch recent games
  const gameLogs = await client.getLogs({
    address: GAME_CONTRACT,
    event: parseAbiItem(
      "event GameSettled(uint256 indexed gameId, address indexed player, uint256 randomSeed, uint256 totalBet, uint256 totalPayout, int256 profit, uint256 tokensEarned)",
    ),
    fromBlock: "latest",
    toBlock: "latest",
  })

  console.log(`\n🎮 Recent Games: ${gameLogs.length}`)

  // Check for unusual patterns
  let totalBet = 0n
  let totalPayout = 0n
  let suspiciousGames = 0

  gameLogs.forEach((log: any) => {
    totalBet += log.args.totalBet
    totalPayout += log.args.totalPayout

    // Flag games with very high bets
    if (log.args.totalBet > 100n * 10n ** 18n) {
      suspiciousGames++
      console.log(`⚠️  Large bet detected: ${(Number(log.args.totalBet) / 1e18).toFixed(2)} MATIC`)
    }
  })

  const houseEdge = totalBet > 0n ? ((totalBet - totalPayout) * 100n) / totalBet : 0n
  console.log(`\n📊 House Edge: ${houseEdge}%`)
  console.log(`⚠️  Suspicious Games: ${suspiciousGames}`)

  // Monitor alerts
  if (suspiciousGames > 5) {
    console.error("🚨 ALERT: Multiple suspicious games detected! Review immediately.")
  }

  console.log("\n✅ Monitoring complete")
}

monitorContract().catch(console.error)
