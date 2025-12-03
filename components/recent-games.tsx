"use client"

import { Card } from "@/components/ui/card"
import { useGameEvents } from "@/hooks/use-game-events"
import { formatDistanceToNow } from "date-fns"

export function RecentGames() {
  const { events, isLoading } = useGameEvents(10)

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-4">Recent Games</h2>

      {isLoading ? (
        <p className="text-slate-500 text-center py-8">Loading games...</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No games played yet</p>
      ) : (
        <div className="space-y-2">
          {events.map((game) => {
            const profit = Number.parseFloat(game.profit)
            const isProfit = profit >= 0

            return (
              <div
                key={game.gameId}
                className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Time</p>
                    <p className="text-white">{formatDistanceToNow(game.timestamp * 1000, { addSuffix: true })}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Bet</p>
                    <p className="text-white">{Number.parseFloat(game.totalBet).toFixed(4)} MATIC</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Profit</p>
                    <p className={isProfit ? "text-green-400" : "text-red-400"}>
                      {isProfit ? "+" : ""}
                      {Number.parseFloat(game.profit).toFixed(4)} MATIC
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">PPL Earned</p>
                    <p className="text-purple-400">{Number.parseFloat(game.tokensEarned).toFixed(2)} PPL</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
