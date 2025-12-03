"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useGameEvents } from "./use-game-events"

export interface UserStats {
  totalGames: number
  totalWagered: number
  totalPayout: number
  totalProfit: number
  totalTokensEarned: number
  winCount: number
  lossCount: number
  biggestWin: number
  biggestLoss: number
  winRate: number
}

export function useUserStats() {
  const { address } = useAccount()
  const { events, isLoading } = useGameEvents(1000) // Fetch more games for stats
  const [stats, setStats] = useState<UserStats>({
    totalGames: 0,
    totalWagered: 0,
    totalPayout: 0,
    totalProfit: 0,
    totalTokensEarned: 0,
    winCount: 0,
    lossCount: 0,
    biggestWin: 0,
    biggestLoss: 0,
    winRate: 0,
  })

  useEffect(() => {
    if (!events.length) return

    let totalWagered = 0
    let totalPayout = 0
    let totalProfit = 0
    let totalTokensEarned = 0
    let winCount = 0
    let lossCount = 0
    let biggestWin = 0
    let biggestLoss = 0

    events.forEach((event) => {
      const bet = Number.parseFloat(event.totalBet)
      const payout = Number.parseFloat(event.totalPayout)
      const profit = Number.parseFloat(event.profit)
      const tokens = Number.parseFloat(event.tokensEarned)

      totalWagered += bet
      totalPayout += payout
      totalProfit += profit
      totalTokensEarned += tokens

      if (profit > 0) {
        winCount++
        if (profit > biggestWin) biggestWin = profit
      } else if (profit < 0) {
        lossCount++
        if (Math.abs(profit) > biggestLoss) biggestLoss = Math.abs(profit)
      }
    })

    const winRate = events.length > 0 ? (winCount / events.length) * 100 : 0

    setStats({
      totalGames: events.length,
      totalWagered,
      totalPayout,
      totalProfit,
      totalTokensEarned,
      winCount,
      lossCount,
      biggestWin,
      biggestLoss,
      winRate,
    })
  }, [events])

  return { stats, isLoading, events }
}
