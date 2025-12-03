import { type NextRequest, NextResponse } from "next/server"
import { createPublicClient, http } from "viem"
import { polygon } from "viem/chains"
import { GAME_CONTRACT_ABI } from "@/lib/contracts"

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"),
})

export async function GET(request: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const gameId = BigInt(params.gameId)

    // Fetch game details from contract
    const game = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: "getGame",
      args: [gameId],
    })

    return NextResponse.json({ game })
  } catch (error) {
    console.error("[API] Game fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch game" }, { status: 500 })
  }
}

export const runtime = "nodejs"
