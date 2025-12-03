import { createWalletClient, http } from "viem"
import { polygon } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { GAME_CONTRACT_ABI } from "../lib/contracts"

const GAME_CONTRACT = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`

async function emergencyPause() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

  const client = createWalletClient({
    account,
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL),
  })

  console.log("🚨 EMERGENCY: Pausing game contract...")

  const hash = await client.writeContract({
    address: GAME_CONTRACT,
    abi: GAME_CONTRACT_ABI,
    functionName: "pauseGame",
  })

  console.log(`✅ Pause transaction sent: ${hash}`)
  console.log("⏳ Waiting for confirmation...")

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash })

  if (receipt.status === "success") {
    console.log("✅ Game successfully paused!")
  } else {
    console.error("❌ Pause transaction failed!")
  }
}

emergencyPause().catch(console.error)
