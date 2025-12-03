import { NextResponse } from "next/server"

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "production",
    contracts: {
      game: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "not set",
      token: process.env.NEXT_PUBLIC_PPL_CONTRACT_ADDRESS || "not set",
    },
  }

  return NextResponse.json(health)
}

export const runtime = "edge"
