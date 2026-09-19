import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const networkId = process.env.NEXT_PUBLIC_NETWORK_ID
  const rpcUrl = networkId === "1337" ? process.env.NEXT_PUBLIC_RPC_URL : process.env.POLYGON_RPC_URL
  const configured = Boolean(
    networkId &&
    (process.env.APP_ENV !== "production" || ["137", "80002"].includes(networkId)) &&
    /^0x[a-fA-F0-9]{40}$/.test(process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "") &&
    !/^0x0{40}$/i.test(process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "") &&
    /^0x[a-fA-F0-9]{40}$/.test(process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS || "") &&
    !/^0x0{40}$/i.test(process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS || "") &&
    Boolean(rpcUrl)
  )
  let rpcReady = false
  if (configured) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1_000)
      const response = await fetch(rpcUrl!, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(timeout)
      const body = await response.json() as { result?: string }
      rpcReady = response.ok && body.result?.toLowerCase() === `0x${Number(networkId).toString(16)}`
    } catch {
      rpcReady = false
    }
  }
  const ready = configured && rpcReady
  const readinessRequested = new URL(request.url).searchParams.get("ready") === "1"
  const health = {
    status: "healthy",
    liveness: "ok",
    readiness: ready ? "ready" : configured ? "rpc_unavailable" : "configuration_incomplete",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "production",
    contracts: {
      game: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "not set",
      token: process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS || "not set",
    },
  }

  return NextResponse.json(health, { status: readinessRequested && !ready ? 503 : 200 })
}

export const runtime = "nodejs"
