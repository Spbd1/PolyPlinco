import { type NextRequest, NextResponse } from "next/server"
import { createPublicClient, http } from "viem"
import { serverChain, serverRpcUrl } from "@/lib/server-chain"
import { GAME_CONTRACT_ABI } from "@/lib/contracts"
import { requireConfiguredAddress } from "@/lib/contracts"

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`
const GAME_LOOKUP_ABI = [{
  type: "function", name: "games", stateMutability: "view",
  inputs: [{ name: "id", type: "uint256" }],
  outputs: [
    { name: "player", type: "address" },
    { name: "config", type: "tuple", components: [
      { name: "rows", type: "uint8" }, { name: "balls", type: "uint16" },
      { name: "risk", type: "uint8" }, { name: "betPerBall", type: "uint256" },
    ] },
    { name: "totalBet", type: "uint256" }, { name: "totalPayout", type: "uint256" },
    { name: "requestId", type: "uint64" }, { name: "randomSeed", type: "uint256" },
    { name: "settled", type: "bool" }, { name: "createdAt", type: "uint40" },
  ],
}] as const

const publicClient = serverRpcUrl ? createPublicClient({ chain: serverChain, transport: http(serverRpcUrl) }) : null

export async function GET(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId: rawGameId } = await params

    if (!publicClient) return NextResponse.json({ error: "Blockchain RPC is not configured" }, { status: 503 })
    const gameAddress = requireConfiguredAddress(GAME_CONTRACT_ADDRESS, "PolyPlinko game")

    // Fetch game details from contract
    if (!/^\d{1,78}$/.test(rawGameId)) {
      return NextResponse.json({ error: "Invalid game id" }, { status: 400 })
    }
    const gameId = BigInt(rawGameId)
    const game = await publicClient.readContract({
      address: gameAddress,
      abi: GAME_LOOKUP_ABI,
      functionName: "games",
      args: [gameId],
    })
    if (game[0] === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const serializableGame = JSON.parse(JSON.stringify(game, (_, value) => typeof value === "bigint" ? value.toString() : value))
    return NextResponse.json({ game: serializableGame })
  } catch (error) {
    console.error("[API] Game fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch game" }, { status: 503 })
  }
}

export const runtime = "nodejs"
