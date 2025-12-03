"use client"

import { useAccount, useBalance } from "wagmi"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { formatEther } from "viem"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Trophy, Target } from "lucide-react"
import Link from "next/link"
import { useUserStats } from "@/hooks/use-user-stats"
import { useTokenBalance } from "@/hooks/use-token-contract"
import { usePriceFeed, formatUSD, calculatePPLPrice } from "@/lib/price-feed"
import { useReadContract } from "wagmi"
import { POLY_PLINKO_GAME_ADDRESS, GAME_ABI } from "@/lib/contracts"
import { formatDistanceToNow } from "date-fns"

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { stats, isLoading: statsLoading, events } = useUserStats()
  const { balance: pplBalance } = useTokenBalance()
  const { prices } = usePriceFeed()

  const { data: balanceData } = useBalance({
    address: address,
    query: {
      enabled: !!address,
    },
  })

  const { data: reserveMatic } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "reserveMatic",
  })

  const { data: reserveToken } = useReadContract({
    address: POLY_PLINKO_GAME_ADDRESS as `0x${string}`,
    abi: GAME_ABI,
    functionName: "reserveToken",
  })

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/")
    }
  }, [isConnected, router])

  if (!isConnected || !address) {
    return null
  }

  const maticBalance = balanceData ? Number.parseFloat(formatEther(balanceData.value)) : 0
  const pplBalanceNum = Number.parseFloat(pplBalance)

  // Calculate USD values
  const maticUSD = maticBalance * prices.matic
  const pplPriceInMatic = calculatePPLPrice(reserveMatic || 0n, reserveToken || 0n)
  const pplPriceInUSD = pplPriceInMatic * prices.matic
  const pplUSD = pplBalanceNum * pplPriceInUSD
  const totalUSD = maticUSD + pplUSD

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push("/")} className="text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Game
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Player Profile
              </h1>
              <p className="text-slate-400 font-mono">{address}</p>
            </div>
            <Link
              href={`https://polygonscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
            >
              View on PolygonScan
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-700/50">
            <p className="text-sm text-purple-300 mb-2">MATIC Balance</p>
            <p className="text-3xl font-bold text-white mb-1">{maticBalance.toFixed(4)} MATIC</p>
            <p className="text-sm text-slate-400">{formatUSD(maticUSD)}</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50">
            <p className="text-sm text-blue-300 mb-2">PPL Balance</p>
            <p className="text-3xl font-bold text-white mb-1">{pplBalanceNum.toFixed(2)} PPL</p>
            <p className="text-sm text-slate-400">{formatUSD(pplUSD)}</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border-cyan-700/50">
            <p className="text-sm text-cyan-300 mb-2">Total Value</p>
            <p className="text-3xl font-bold text-white mb-1">{formatUSD(totalUSD)}</p>
            <p className="text-sm text-slate-400">Combined USD Value</p>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-900/30">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm text-slate-400">Total Games</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalGames}</p>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-sm text-slate-400">Wins</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.winCount}</p>
            <p className="text-xs text-green-400 mt-1">Win Rate: {stats.winRate.toFixed(1)}%</p>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-900/30">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm text-slate-400">Losses</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.lossCount}</p>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-900/30">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-sm text-slate-400">Total Profit</p>
            </div>
            <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {stats.totalProfit >= 0 ? "+" : ""}
              {stats.totalProfit.toFixed(4)} MATIC
            </p>
            <p className="text-xs text-slate-400 mt-1">{formatUSD(stats.totalProfit * prices.matic)}</p>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Wagering Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Wagered:</span>
                <span className="text-white font-semibold">{stats.totalWagered.toFixed(4)} MATIC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Payout:</span>
                <span className="text-white font-semibold">{stats.totalPayout.toFixed(4)} MATIC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Biggest Win:</span>
                <span className="text-green-400 font-semibold">+{stats.biggestWin.toFixed(4)} MATIC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Biggest Loss:</span>
                <span className="text-red-400 font-semibold">-{stats.biggestLoss.toFixed(4)} MATIC</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Loss-Mining Rewards</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total PPL Earned:</span>
                <span className="text-purple-400 font-semibold">{stats.totalTokensEarned.toFixed(2)} PPL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Value:</span>
                <span className="text-white font-semibold">{formatUSD(stats.totalTokensEarned * pplPriceInUSD)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PPL Price:</span>
                <span className="text-white font-semibold">{pplPriceInMatic.toFixed(6)} MATIC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PPL Price (USD):</span>
                <span className="text-white font-semibold">{formatUSD(pplPriceInUSD)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Game History */}
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4">Game History</h3>

          {statsLoading ? (
            <p className="text-slate-500 text-center py-8">Loading game history...</p>
          ) : events.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No games played yet</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 20).map((game) => {
                const profit = Number.parseFloat(game.profit)
                const isProfit = profit >= 0

                return (
                  <div
                    key={game.gameId}
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Game ID</p>
                          <p className="text-white font-mono">#{game.gameId}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Time</p>
                          <p className="text-white">
                            {formatDistanceToNow(game.timestamp * 1000, { addSuffix: true })}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Bet</p>
                          <p className="text-white">{Number.parseFloat(game.totalBet).toFixed(4)} MATIC</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Profit/Loss</p>
                          <p className={isProfit ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                            {isProfit ? "+" : ""}
                            {profit.toFixed(4)} MATIC
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">PPL Earned</p>
                          <p className="text-purple-400 font-semibold">
                            {Number.parseFloat(game.tokensEarned).toFixed(2)} PPL
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`https://polygonscan.com/tx/${game.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-2 text-sm"
                      >
                        Proof
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
