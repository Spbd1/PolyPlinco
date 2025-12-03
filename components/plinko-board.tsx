"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import type { RiskLevel } from "@/lib/contracts"
import { computeMultipliers, computeBinomialWeights } from "@/lib/plinko-simulator"
import type { GameEvent } from "@/hooks/use-game-events"
import { soundEffects } from "@/lib/sound-effects"
import { Sparkles } from "lucide-react"

interface PlinkoBoardProps {
  config: {
    rows: number
    balls: number
    risk: RiskLevel
    betPerBall: string
  }
  gameResult?: GameEvent | null
  instantResults?: boolean
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  targetX: number
  currentRow: number
  slot: number
  bouncePhase: number
}

export function PlinkoBoard({ config, gameResult, instantResults = false }: PlinkoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [balls, setBalls] = useState<Ball[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [showBigWinEffect, setShowBigWinEffect] = useState(false)

  useEffect(() => {
    if (!gameResult || !canvasRef.current) return

    console.log("[v0] Starting ball animation with seed:", gameResult.randomSeed)

    const profit = Number.parseFloat(gameResult.profit)
    const isBigWin = profit > Number.parseFloat(gameResult.totalBet) * 2

    if (isBigWin) {
      setShowBigWinEffect(true)
      soundEffects.playBigWin()
      setTimeout(() => setShowBigWinEffect(false), 3000)
    } else if (profit > 0) {
      soundEffects.playMediumWin()
    } else {
      soundEffects.playLoss()
    }

    if (instantResults) {
      setIsAnimating(false)
      setBalls([])
      return
    }

    setIsAnimating(true)

    const newBalls: Ball[] = []
    const rows = config.rows
    const canvas = canvasRef.current
    const width = canvas.width
    const height = canvas.height
    const rowHeight = height / (rows + 3)
    const startY = rowHeight

    const ballsToAnimate = Math.min(config.balls, 100)
    const weights = computeBinomialWeights(rows)

    for (let i = 0; i < ballsToAnimate; i++) {
      const random = Math.floor(Math.random() * 1_000_000)
      let slot = 0
      let cumulative = 0
      for (let k = 0; k <= rows; k++) {
        cumulative += weights[k]
        if (random < cumulative) {
          slot = k
          break
        }
      }

      newBalls.push({
        x: width / 2 + (Math.random() - 0.5) * 20,
        y: startY - Math.random() * 50,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 0.5 + 1.5,
        targetX: ((slot + 0.5) / (rows + 1)) * width,
        currentRow: 0,
        slot,
        bouncePhase: 0,
      })
    }

    setBalls(newBalls)

    setTimeout(() => {
      setIsAnimating(false)
      setBalls([])
    }, 5000)
  }, [gameResult, config.balls, config.rows, instantResults])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const rows = config.rows
      const pinRadius = 4
      const rowHeight = height / (rows + 3)
      const startY = rowHeight

      for (let row = 0; row <= rows; row++) {
        const pinsInRow = row + 1
        const rowWidth = width * 0.7 + (width * 0.25 * row) / rows
        const startX = (width - rowWidth) / 2

        for (let pin = 0; pin < pinsInRow; pin++) {
          const x = startX + (rowWidth / (pinsInRow - 1 || 1)) * pin
          const y = startY + row * rowHeight

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, pinRadius * 3)
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.6)")
          gradient.addColorStop(1, "rgba(168, 85, 247, 0)")
          ctx.fillStyle = gradient
          ctx.fillRect(x - pinRadius * 3, y - pinRadius * 3, pinRadius * 6, pinRadius * 6)

          ctx.fillStyle = "#a855f7"
          ctx.beginPath()
          ctx.arc(x, y, pinRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (isAnimating && balls.length > 0) {
        balls.forEach((ball) => {
          ctx.fillStyle = "#60a5fa"
          ctx.beginPath()
          ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2)
          ctx.fill()

          const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 12)
          gradient.addColorStop(0, "rgba(96, 165, 250, 0.8)")
          gradient.addColorStop(1, "rgba(96, 165, 250, 0)")
          ctx.fillStyle = gradient
          ctx.fillRect(ball.x - 12, ball.y - 12, 24, 24)
        })

        setBalls((prevBalls) =>
          prevBalls.map((ball) => {
            const currentRowY = startY + ball.currentRow * rowHeight
            let newVx = ball.vx
            let newVy = ball.vy
            let newBouncePhase = ball.bouncePhase
            let newCurrentRow = ball.currentRow

            if (ball.y >= currentRowY && ball.currentRow < rows) {
              newVy = -Math.abs(newVy) * 0.6
              newBouncePhase = 1
              newCurrentRow++

              const targetDirection = (ball.targetX - ball.x) / Math.abs(ball.targetX - ball.x || 1)
              newVx = targetDirection * (Math.random() * 1 + 0.5)

              soundEffects.playBallDrop()
            }

            if (newBouncePhase > 0) {
              newBouncePhase -= 0.1
            }

            newVy = newVy + 0.3
            newVx = newVx * 0.98

            return {
              ...ball,
              x: ball.x + newVx,
              y: ball.y + newVy,
              vx: newVx,
              vy: newVy,
              currentRow: newCurrentRow,
              bouncePhase: newBouncePhase,
            }
          }),
        )
      }

      const multipliers = computeMultipliers(rows, config.risk)
      const slotWidth = width / (rows + 1)
      const slotY = startY + (rows + 1) * rowHeight

      for (let slot = 0; slot <= rows; slot++) {
        const x = slotWidth * slot + slotWidth / 2
        const mult = (multipliers[slot] / 10000).toFixed(2)

        ctx.fillStyle = "rgba(30, 41, 59, 0.9)"
        const boxWidth = Math.min(slotWidth - 4, 50)
        ctx.fillRect(x - boxWidth / 2, slotY, boxWidth, 32)

        const multValue = Number.parseFloat(mult)
        let color = "#10b981"
        if (multValue < 0.5) color = "#ef4444"
        else if (multValue < 1.0) color = "#f59e0b"

        ctx.fillStyle = color
        ctx.font = "bold 11px monospace"
        ctx.textAlign = "center"
        ctx.fillText(`${mult}x`, x, slotY + 20)
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [config, isAnimating, balls])

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden">
      {showBigWinEffect && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-6xl font-bold text-yellow-400 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
              BIG WIN!
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {[...Array(5)].map((_, i) => (
                <Sparkles
                  key={i}
                  className="h-8 w-8 text-yellow-300 animate-spin"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <canvas ref={canvasRef} width={800} height={600} className="w-full h-auto rounded-lg bg-slate-950/50" />

        <div className="absolute top-4 left-4 right-4">
          {!gameResult ? (
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-300">
                Configure your game and click <span className="text-purple-400 font-semibold">Play</span> to start
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-purple-700/50">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total Bet:</span>
                  <span className="text-white font-semibold">{gameResult.totalBet} POL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total Payout:</span>
                  <span className="text-white font-semibold">{gameResult.totalPayout} POL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Profit:</span>
                  <span
                    className={`font-bold ${Number.parseFloat(gameResult.profit) >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {Number.parseFloat(gameResult.profit) >= 0 ? "+" : ""}
                    {gameResult.profit} POL
                  </span>
                </div>
                {!gameResult.isDemo && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">PPL Earned:</span>
                    <span className="text-purple-400 font-semibold">{gameResult.tokensEarned} PPL</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
