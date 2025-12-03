/**
 * Health Check Script for Production Monitoring
 * Run this periodically to ensure all systems are operational
 */

import { createPublicClient, http, formatEther } from "viem"
import { polygon } from "viem/chains"

const GAME_CONTRACT = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`
const ALERT_EMAIL = process.env.ALERT_EMAIL || "admin@polyplinko.com"

interface HealthStatus {
  timestamp: number
  contractBalance: string
  lockedBankroll: string
  availableBankroll: string
  reserveMatic: string
  reserveToken: string
  vaultMatic: string
  healthy: boolean
  warnings: string[]
  errors: string[]
}

async function performHealthCheck(): Promise<HealthStatus> {
  const client = createPublicClient({
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL),
  })

  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Read contract state
    const [houseBankroll, lockedBankroll, reserveMatic, reserveToken, vaultMatic] = await Promise.all([
      client.readContract({
        address: GAME_CONTRACT,
        abi: [
          {
            name: "houseBankroll",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "houseBankroll",
      }),
      client.readContract({
        address: GAME_CONTRACT,
        abi: [
          {
            name: "lockedBankroll",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "lockedBankroll",
      }),
      client.readContract({
        address: GAME_CONTRACT,
        abi: [
          {
            name: "reserveMatic",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "reserveMatic",
      }),
      client.readContract({
        address: GAME_CONTRACT,
        abi: [
          {
            name: "reserveToken",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "reserveToken",
      }),
      client.readContract({
        address: GAME_CONTRACT,
        abi: [
          { name: "vaultMatic", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
        ],
        functionName: "vaultMatic",
      }),
    ])

    const availableBankroll = houseBankroll > lockedBankroll ? houseBankroll - lockedBankroll : 0n

    // Check for critical issues
    if (availableBankroll < BigInt(50 * 1e18)) {
      errors.push("Available bankroll critically low (< 50 MATIC)")
    } else if (availableBankroll < BigInt(100 * 1e18)) {
      warnings.push("Available bankroll low (< 100 MATIC)")
    }

    // Check locked ratio
    const lockedRatio = houseBankroll > 0n ? Number((lockedBankroll * 100n) / houseBankroll) : 0

    if (lockedRatio > 80) {
      warnings.push(`High locked bankroll ratio: ${lockedRatio.toFixed(2)}%`)
    }

    // Check AMM liquidity
    if (reserveMatic < BigInt(10 * 1e18)) {
      warnings.push("AMM MATIC reserve low (< 10 MATIC)")
    }

    if (reserveToken < BigInt(1000 * 1e18)) {
      warnings.push("AMM token reserve low (< 1000 PPL)")
    }

    // Check vault balance
    if (vaultMatic > BigInt(5000 * 1e18)) {
      warnings.push("Vault balance high (> 5000 MATIC), consider buyback")
    }

    const status: HealthStatus = {
      timestamp: Date.now(),
      contractBalance: formatEther(houseBankroll),
      lockedBankroll: formatEther(lockedBankroll),
      availableBankroll: formatEther(availableBankroll),
      reserveMatic: formatEther(reserveMatic),
      reserveToken: formatEther(reserveToken),
      vaultMatic: formatEther(vaultMatic),
      healthy: errors.length === 0,
      warnings,
      errors,
    }

    return status
  } catch (error) {
    errors.push(`Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`)

    return {
      timestamp: Date.now(),
      contractBalance: "0",
      lockedBankroll: "0",
      availableBankroll: "0",
      reserveMatic: "0",
      reserveToken: "0",
      vaultMatic: "0",
      healthy: false,
      warnings,
      errors,
    }
  }
}

async function sendAlert(status: HealthStatus): Promise<void> {
  const message = `
PolyPlinko Health Check Alert

Status: ${status.healthy ? "✅ HEALTHY" : "❌ UNHEALTHY"}
Timestamp: ${new Date(status.timestamp).toISOString()}

Contract Metrics:
- House Bankroll: ${status.contractBalance} MATIC
- Locked: ${status.lockedBankroll} MATIC
- Available: ${status.availableBankroll} MATIC
- AMM MATIC: ${status.reserveMatic} MATIC
- AMM Tokens: ${status.reserveToken} PPL
- Vault: ${status.vaultMatic} MATIC

${status.errors.length > 0 ? `\nERRORS:\n${status.errors.join("\n")}` : ""}
${status.warnings.length > 0 ? `\nWARNINGS:\n${status.warnings.join("\n")}` : ""}
  `.trim()

  console.log(message)

  // In production, send email or Slack notification
  // Example using nodemailer:
  // await sendEmail(ALERT_EMAIL, 'PolyPlinko Health Alert', message)
}

// Main execution
async function main() {
  console.log("Running PolyPlinko health check...\n")

  const status = await performHealthCheck()

  console.log(JSON.stringify(status, null, 2))

  if (!status.healthy || status.warnings.length > 0) {
    await sendAlert(status)
  }

  process.exit(status.healthy ? 0 : 1)
}

main().catch(console.error)
