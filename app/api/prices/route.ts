import { type NextRequest, NextResponse } from "next/server"

// Cache prices for 60 seconds
let priceCache: { matic: number; timestamp: number } | null = null
const CACHE_DURATION = 60 * 1000 // 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Check cache
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({ matic: priceCache.matic, cached: true })
    }

    // Fetch fresh price from CoinGecko
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd", {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch price")
    }

    const data = await response.json()
    const maticPrice = data["matic-network"]?.usd || 0

    // Update cache
    priceCache = { matic: maticPrice, timestamp: Date.now() }

    return NextResponse.json({ matic: maticPrice, cached: false })
  } catch (error) {
    console.error("[API] Price fetch error:", error)

    // Return cached price if available, otherwise 0
    if (priceCache) {
      return NextResponse.json({ matic: priceCache.matic, cached: true, stale: true })
    }

    return NextResponse.json({ matic: 0, error: "Failed to fetch price" }, { status: 500 })
  }
}

export const runtime = "edge"
