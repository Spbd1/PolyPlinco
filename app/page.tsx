"use client"

import { useState } from "react"
import { PlinkoBoard } from "@/components/plinko-board"
import { GameControls } from "@/components/game-controls"
import { RecentGames } from "@/components/recent-games"
import { Header } from "@/components/header"
import { TokenPanel } from "@/components/token-panel"
import { Footer } from "@/components/footer"
import { RiskLevel } from "@/lib/contracts"
import { useWatchGameSettled } from "@/hooks/use-game-events"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"game" | "token">("game")
  const [gameConfig, setGameConfig] = useState({
    rows: 16,
    balls: 10,
    risk: RiskLevel.Medium,
    betPerBall: "0.01", // Default to minimum 0.01 POL
  })
  const [currentGameResult, setCurrentGameResult] = useState<any>(null)
  const [instantResults, setInstantResults] = useState(false)

  useWatchGameSettled((event) => {
    console.log("[v0] Game settled:", event)
    setCurrentGameResult(event)

    const profit = Number.parseFloat(event.profit)
    const isWin = profit > 0

    toast({
      title: isWin ? "You Won!" : "Game Complete",
      description: `Profit: ${profit.toFixed(4)} POL | PPL Earned: ${Number.parseFloat(event.tokensEarned).toFixed(2)}`,
      variant: isWin ? "default" : "destructive",
    })
  })

  const handleDemoGame = (result: any) => {
    setCurrentGameResult(result)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-6 flex-grow">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("game")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "game"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50"
                : "bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            Play Plinko
          </button>
          <button
            onClick={() => setActiveTab("token")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "token"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50"
                : "bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            Token & DeFi
          </button>
        </div>

        {activeTab === "game" ? (
          <div className="grid lg:grid-cols-[400px_1fr] gap-6">
            <div className="space-y-6">
              <GameControls
                config={gameConfig}
                onConfigChange={setGameConfig}
                onGameStart={() => setCurrentGameResult(null)}
                onDemoGame={handleDemoGame}
                instantResults={instantResults}
                onInstantResultsChange={setInstantResults}
              />
            </div>

            <div className="flex flex-col gap-6">
              <PlinkoBoard config={gameConfig} gameResult={currentGameResult} instantResults={instantResults} />
              <RecentGames />
            </div>
          </div>
        ) : (
          <TokenPanel />
        )}
      </main>

      <Footer />
    </div>
  )
}
