"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { PAID_MODE_ENABLED, RiskLevel } from "@/lib/contracts"
import { useAccount, useConnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { parseEther, formatEther } from "viem"
import { usePlayPlinko } from "@/hooks/use-game-contract"
import { useToast } from "@/hooks/use-toast"
import { useGameStats } from "@/hooks/use-game-contract"
import {
  canPlayDemo,
  addDemoPlay,
  getRemainingDemoPlays,
  canPlayPaid,
  addPaidPlay,
  getRemainingPaidPlays,
} from "@/lib/demo-mode"
import { computeMaxMultiplier } from "@/lib/plinko-simulator"
import { Volume2, VolumeX, Zap, AlertTriangle } from "lucide-react"
import { soundEffects } from "@/lib/sound-effects"

interface GameControlsProps {
  config: {
    rows: number
    balls: number
    risk: RiskLevel
    betPerBall: string
  }
  onConfigChange: (config: any) => void
  onGameStart?: () => void
  onDemoGame?: (result: any) => void
  onDemoAction?: (balls: number, originX?: number) => void
  interactiveDropRequest?: { nonce: number; originX: number }
  demoMode?: boolean
  onDemoModeChange?: (value: boolean) => void
  instantResults?: boolean
  onInstantResultsChange?: (value: boolean) => void
  interactiveDropEnabled?: boolean
  onInteractiveDropChange?: (value: boolean) => void
}

export function GameControls({
  config,
  onConfigChange,
  onGameStart,
  onDemoGame,
  onDemoAction,
  interactiveDropRequest,
  demoMode = false,
  onDemoModeChange,
  instantResults = false,
  onInstantResultsChange,
  interactiveDropEnabled = false,
  onInteractiveDropChange,
}: GameControlsProps) {
  const { isConnected, address } = useAccount()
  const { connect } = useConnect()
  const { toast } = useToast()
  const { playPlinko, isPending, isConfirming } = usePlayPlinko()
  const { availableBankroll } = useGameStats()

  const [isConnecting, setIsConnecting] = useState(false)
  const [remainingDemoPlays, setRemainingDemoPlays] = useState(10)
  const [remainingPaidPlays, setRemainingPaidPlays] = useState(256)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [interactiveDropAcknowledged, setInteractiveDropAcknowledged] = useState(false)

  useEffect(() => {
    setRemainingDemoPlays(getRemainingDemoPlays())
    if (address) {
      setRemainingPaidPlays(getRemainingPaidPlays(address))
    }
  }, [address])

  useEffect(() => {
    soundEffects.setEnabled(soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    setInteractiveDropAcknowledged(window.localStorage.getItem("polyplinko:interactive-drop-confirmed") === "true")
  }, [])

  const maxMultiplier = computeMaxMultiplier(config.rows, config.risk)
  const totalBet = demoMode ? 0 : Number.parseFloat(config.betPerBall) * config.balls
  const maxWin = demoMode ? 0 : totalBet * maxMultiplier

  const availableBankrollNumber = typeof availableBankroll === "bigint" ? Number(formatEther(availableBankroll)) : 0
  const exceedsBankroll = !demoMode && maxWin > availableBankrollNumber

  const startDemo = (ballCount: number, originX?: number) => {
    if (!canPlayDemo(ballCount)) {
      toast({
        title: "Demo Limit Reached",
        description: `You have ${remainingDemoPlays} demo balls remaining today.`,
        variant: "destructive",
      })
      return
    }

    addDemoPlay(ballCount)
    setRemainingDemoPlays(getRemainingDemoPlays())
    onDemoAction?.(ballCount, originX)
    onGameStart?.()

    const demoResult = {
      player: "0xDemo",
      gameId: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      totalBet: "0",
      totalPayout: "0",
      profit: "0",
      tokensEarned: "0",
      randomSeed: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      isDemo: true,
    }

    window.setTimeout(() => {
      onDemoGame?.(demoResult)
      toast({
        title: ballCount === 1 ? "Ball landed" : "Demo round complete",
        description: `${getRemainingDemoPlays()} demo balls remaining today.`,
      })
    }, 140)
  }

  useEffect(() => {
    if (interactiveDropRequest && interactiveDropRequest.nonce > 0) {
      startDemo(1, interactiveDropRequest.originX)
    }
    // The request nonce is intentionally the only trigger. startDemo is a
    // stable event-like action and including it would retrigger the drop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactiveDropRequest?.nonce])

  const handleInteractiveDropChange = (checked: boolean) => {
    if (!checked) {
      onInteractiveDropChange?.(false)
      return
    }
    if (!interactiveDropAcknowledged) {
      const confirmed = window.confirm("Interactive Drop is a DEMO-only control. Clicking the board will release free practice balls and cannot affect paid-game outcomes. Enable it?")
      if (!confirmed) return
      window.localStorage.setItem("polyplinko:interactive-drop-confirmed", "true")
      setInteractiveDropAcknowledged(true)
    }
    onInteractiveDropChange?.(true)
  }

  const handlePlay = async () => {
    if (!demoMode && exceedsBankroll) {
      toast({
        title: "Bet Too Large",
        description: `We apologize, but your maximum potential win (${maxWin.toFixed(4)} POL) exceeds our current available bankroll (${availableBankrollNumber.toFixed(4)} POL). Please lower your bet amount or number of balls. Thank you for your understanding!`,
        variant: "destructive",
      })
      return
    }

    if (demoMode) {
      startDemo(config.balls)
      return
    }

    if (!demoMode && isConnected && address) {
      if (!canPlayPaid(address, config.balls)) {
        toast({
          title: "Daily Limit Reached",
          description: `You can only play ${remainingPaidPlays} more balls today. Limit resets at midnight.`,
          variant: "destructive",
        })
        return
      }
    }

    if (!isConnected) {
      setIsConnecting(true)
      try {
        await connect({ connector: injected() })
      } catch (err) {
        toast({
          title: "Connection Failed",
          description: "Failed to connect wallet. Please try again.",
          variant: "destructive",
        })
        setIsConnecting(false)
        return
      }
      setIsConnecting(false)
    }

    try {
      const betPerBall = parseEther(config.betPerBall)

      if (address) {
        addPaidPlay(address, config.balls)
        setRemainingPaidPlays(getRemainingPaidPlays(address))
      }

      await playPlinko({
        rows: config.rows,
        balls: config.balls,
        risk: config.risk,
        betPerBall,
      })

      onGameStart?.()

      toast({
        title: "Game Started!",
        description: instantResults ? "Results will appear instantly" : "Watch the balls drop...",
      })
    } catch (err) {
      console.error("[v0] Play error:", err)
    }
  }

  const getButtonText = () => {
    if (demoMode) return "Play Demo Round"
    if (!PAID_MODE_ENABLED) return "Paid Mode Unavailable"
    if (isConnecting) return "Connecting Wallet..."
    if (isPending) return "Sending Transaction..."
    if (isConfirming) return "Waiting for Result..."
    return "Play"
  }

  const isDisabled =
    isConnecting || isPending || isConfirming || (!demoMode && !PAID_MODE_ENABLED) || (demoMode && !canPlayDemo(config.balls)) || exceedsBankroll

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Game Controls</h2>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-purple-400" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-500" />
            )}
          </button>
        </div>

        <Card className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-purple-300 font-semibold">Instant Results</Label>
                  <span className="rounded-full bg-purple-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">{instantResults ? "On" : "Animated"}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {instantResults ? "Skip animation, show results immediately" : "Watch balls drop with animation"}
                </p>
              </div>
            </div>
            <Switch checked={instantResults} onCheckedChange={(checked) => onInstantResultsChange?.(checked)} />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-cyan-300 font-semibold">Demo Mode (Free)</Label>
                <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">{demoMode ? "On" : "Off"}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {demoMode ? `${remainingDemoPlays} balls remaining today` : "Test without connecting wallet"}
              </p>
            </div>
            <Switch data-testid="demo-mode-switch" checked={demoMode} onCheckedChange={onDemoModeChange} />
          </div>
        </Card>

        {demoMode && (
          <Card className="p-4 bg-gradient-to-r from-indigo-900/20 to-cyan-900/20 border-indigo-400/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-indigo-200 font-semibold">Interactive Drop</Label>
                  <span className="rounded-full bg-indigo-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200">{interactiveDropEnabled ? "On" : "Off"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Click the upper board to release one free demo ball from that position.</p>
              </div>
              <Switch data-testid="interactive-drop-switch" checked={interactiveDropEnabled} onCheckedChange={handleInteractiveDropChange} />
            </div>
          </Card>
        )}

        {!demoMode && isConnected && (
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Daily Balls Remaining:</span>
              <span className="text-purple-400 font-semibold">{remainingPaidPlays.toLocaleString()} / 256</span>
            </div>
          </div>
        )}

        {!demoMode && (
          <div className="space-y-2">
            <Label className="text-slate-300">Bet Amount (POL)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={config.betPerBall}
              onChange={(e) => {
                const value = e.target.value
                if (Number.parseFloat(value) < 0.01 && value !== "") {
                  onConfigChange({ ...config, betPerBall: "0.01" })
                } else {
                  onConfigChange({ ...config, betPerBall: value })
                }
              }}
              className="bg-slate-800/50 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">Per ball (minimum 0.01 POL)</p>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-slate-300">Risk Level</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { level: RiskLevel.Low, label: "Low", color: "from-green-600 to-emerald-600" },
              { level: RiskLevel.Medium, label: "Medium", color: "from-yellow-600 to-orange-600" },
              { level: RiskLevel.High, label: "High", color: "from-red-600 to-pink-600" },
            ].map(({ level, label, color }) => (
              <button
                key={level}
                onClick={() => onConfigChange({ ...config, risk: level })}
                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                  config.risk === level
                    ? `bg-gradient-to-r ${color} text-white shadow-lg ring-2 ring-white/20`
                    : "bg-slate-800/50 text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="text-slate-300">Rows</Label>
            <span className="text-white font-semibold">{config.rows}</span>
          </div>
          <Slider
            value={[config.rows]}
            onValueChange={([rows]) => onConfigChange({ ...config, rows })}
            min={8}
            max={32}
            step={1}
            className="py-4"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="text-slate-300">Number of Balls</Label>
            <span className="text-white font-semibold">{config.balls.toLocaleString()}</span>
          </div>
          <Slider
            value={[config.balls]}
            onValueChange={([balls]) => {
              if (demoMode && balls > remainingDemoPlays) {
                onConfigChange({ ...config, balls: remainingDemoPlays })
              } else if (!demoMode && isConnected && address && balls > remainingPaidPlays) {
                onConfigChange({ ...config, balls: remainingPaidPlays })
              } else {
                onConfigChange({ ...config, balls })
              }
            }}
            min={1}
            max={demoMode ? Math.min(64, remainingDemoPlays) : Math.min(256, remainingPaidPlays)}
            step={demoMode ? 1 : config.balls < 100 ? 1 : config.balls < 1000 ? 10 : 100}
            className="py-4"
          />
          <p className="text-xs text-slate-500">
            {demoMode ? "Free demo: up to 64 balls per round · 100 balls/day" : "Paid: up to 256 balls/game"}
          </p>
        </div>

        {!demoMode && (
          <>
            {!PAID_MODE_ENABLED && (
              <Card className="p-4 bg-slate-800/40 border-slate-700/60">
                <p className="text-sm font-semibold text-slate-300">Paid mode is disabled</p>
                <p className="mt-1 text-xs text-slate-500">This deployment is configured for no-money demo access only.</p>
              </Card>
            )}
            {exceedsBankroll && (
              <Card className="p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-700/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-red-300 font-semibold mb-1">Insufficient Bankroll</p>
                    <p className="text-red-200/80">
                      Your max potential win ({maxWin.toFixed(4)} POL) exceeds our available funds (
                      {availableBankrollNumber.toFixed(4)} POL). Please reduce your bet or number of balls.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 shadow-inner shadow-black/10">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Bet:</span>
                <span className="text-white font-semibold">{totalBet.toFixed(4)} POL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Multiplier:</span>
                <span className="text-cyan-400 font-semibold">{maxMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Potential Win:</span>
                <span className={`font-semibold ${exceedsBankroll ? "text-red-400" : "text-green-400"}`}>
                  {maxWin.toFixed(4)} POL
                </span>
              </div>
              {availableBankrollNumber > 0 && (
                <div className="flex justify-between text-xs pt-2 border-t border-slate-700/50">
                  <span className="text-slate-500">Available Bankroll:</span>
                  <span className="text-slate-400">{availableBankrollNumber.toFixed(4)} POL</span>
                </div>
              )}
            </div>
          </>
        )}

        {demoMode && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              data-testid="drop-one-ball"
              variant="outline"
              onClick={() => startDemo(1)}
              disabled={!canPlayDemo(1)}
              className="h-11 border-cyan-500/30 bg-cyan-500/5 text-cyan-200 hover:bg-cyan-500/15 hover:text-white"
            >
              Drop One Ball
            </Button>
            <div className="flex items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/50 px-2 text-center text-[11px] text-slate-500">
              {remainingDemoPlays} demo balls left
            </div>
          </div>
        )}

        <Button
          data-testid={demoMode ? "play-demo-round" : "play-paid-game"}
          onClick={handlePlay}
          disabled={isDisabled}
          className={`w-full h-14 text-lg font-bold transition-all ${
            demoMode
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60"
              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDisabled && !demoMode && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {getButtonText()}
        </Button>

        {!isConnected && !demoMode && (
          <p className="text-xs text-center text-slate-500">Wallet will connect when you click Play</p>
        )}
      </div>
    </Card>
  )
}
