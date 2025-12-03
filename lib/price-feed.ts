"use client"

import { useEffect, useState } from "react"

interface PriceFeed {
  matic: number
  ppl: number // Calculated from AMM reserves
}

export function usePriceFeed() {
  const [prices, setPrices] = useState<PriceFeed>({ matic: 0, ppl: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch MATIC/USD price from CoinGecko
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd",
        )
        const data = await response.json()
        const maticPrice = data["matic-network"]?.usd || 0

        setPrices((prev) => ({ ...prev, matic: maticPrice }))
      } catch (error) {
        console.error("[v0] Failed to fetch MATIC price:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrices()

    // Refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  return { prices, isLoading }
}

// Calculate PPL price from AMM reserves
export function calculatePPLPrice(reserveMatic: bigint, reserveToken: bigint): number {
  if (reserveToken === 0n) return 0

  // Price of 1 PPL in MATIC
  const priceInMatic = Number(reserveMatic) / Number(reserveToken)
  return priceInMatic
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
