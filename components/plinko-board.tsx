"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import type { RiskLevel } from "@/lib/contracts"
import { computeBinomialWeights, computeMultipliers, getFinalSlot, getPathDuration, getPathPosition, simulateBallPath, type BallPathPoint } from "@/lib/plinko-simulator"
import type { GameEvent } from "@/hooks/use-game-events"
import { soundEffects } from "@/lib/sound-effects"
import { Activity, CircleDot, Sparkles, Trophy, Wifi } from "lucide-react"

interface PlinkoBoardProps {
  config: { rows: number; balls: number; risk: RiskLevel; betPerBall: string }
  gameResult?: GameEvent | null
  instantResults?: boolean
  playNonce?: number
  demoMode?: boolean
  demoBallCount?: number
  interactiveDropEnabled?: boolean
  demoDropOriginX?: number | null
  onInteractiveDrop?: (originX: number) => void
}

type BoardPhase = "ready" | "pending" | "animating" | "result"
type Point = BallPathPoint
// Keep high-ball games readable: animate a representative sample, while the
// on-chain result and the landing summary still account for every ball.
const MAX_VISUAL_BALLS = 24
const RELEASE_DELAY_MS = 105

function pathProgressAtPoint(path: Point[], pointIndex: number): number {
  const total = getPathDuration(path)
  if (total <= 0) return 1
  const elapsed = path.slice(1, pointIndex + 1).reduce((sum, point) => sum + (point.duration ?? 0), 0)
  return elapsed / total
}

function multiplierColor(multiplier: number) {
  if (multiplier >= 2) return "#fbbf24"
  if (multiplier >= 1) return "#34d399"
  if (multiplier >= 0.5) return "#a78bfa"
  return "#fb7185"
}

export function PlinkoBoard({ config, gameResult, instantResults = false, playNonce = 0, demoMode = false, demoBallCount = config.balls, interactiveDropEnabled = false, demoDropOriginX = null, onInteractiveDrop }: PlinkoBoardProps) {
  const [phase, setPhase] = useState<BoardPhase>("ready")
  const [landedSlots, setLandedSlots] = useState<number[]>([])
  const [showBigWinEffect, setShowBigWinEffect] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const playedContactsRef = useRef<Set<string>>(new Set())
  const landingTimeoutRef = useRef<number | undefined>(undefined)
  const ballLayerRef = useRef<SVGGElement | null>(null)
  const activePegRef = useRef<SVGGElement | null>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const activeBallCount = demoMode ? demoBallCount : config.balls
  const visibleBallCount = Math.min(activeBallCount, activeBallCount > MAX_VISUAL_BALLS ? MAX_VISUAL_BALLS : activeBallCount)
  const isSummarized = activeBallCount > visibleBallCount
  const multipliers = useMemo(() => computeMultipliers(config.rows, config.risk), [config.rows, config.risk])
  const weights = useMemo(() => computeBinomialWeights(config.rows), [config.rows])
  const seed = gameResult ? BigInt(gameResult.randomSeed) : BigInt(Math.max(1, playNonce))
  const gameId = gameResult?.gameId || String(Math.max(1, playNonce))

  const paths = useMemo(
    () => Array.from({ length: visibleBallCount }, (_, index) => simulateBallPath(seed, gameId, index, config.rows, index === 0 && demoDropOriginX !== null ? demoDropOriginX : 50 + ((index * 13) % 7) - 3)),
    [config.rows, demoDropOriginX, gameId, seed, visibleBallCount],
  )
  const motionScale = reducedMotion ? 0.5 : 1
  const pathDurations = useMemo(() => paths.map((path) => getPathDuration(path) * motionScale), [motionScale, paths])
  const longestPathDuration = Math.max(0, ...pathDurations)
  const roundDuration = longestPathDuration + Math.max(0, visibleBallCount - 1) * RELEASE_DELAY_MS

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.("change", update)
    return () => media.removeEventListener?.("change", update)
  }, [])

  useEffect(() => {
    if (playNonce === 0) return
    setPhase("pending")
    setLandedSlots([])
    playedContactsRef.current.clear()
  }, [playNonce])

  useEffect(() => {
    if (!gameResult) return
    const resultSlots = Array.from(new Set(Array.from({ length: activeBallCount }, (_, index) => getFinalSlot(seed, gameId, index, config.rows, weights))))
    if (instantResults) {
      setLandedSlots(resultSlots)
      setPhase("result")
      return
    }
    setLandedSlots([])
    setPhase("animating")
    playedContactsRef.current.clear()
  }, [activeBallCount, config.rows, gameId, gameResult, instantResults, seed, weights])

  useEffect(() => {
    if (phase !== "pending" && phase !== "animating") return
    let previousFrame = performance.now()
    let elapsed = 0
    const duration = roundDuration
    let didFinish = false
    const tick = (now: number) => {
      // Clamp the first frame after a hidden-tab pause so a suspended tab
      // cannot integrate a huge timestep and teleport a ball through the board.
      elapsed += Math.min(50, Math.max(0, now - previousFrame))
      previousFrame = now
      const nextProgress = phase === "pending" ? (elapsed % duration) / duration : Math.min(1, elapsed / duration)
      const ballGroups = ballLayerRef.current?.querySelectorAll<SVGGElement>("[data-ball-index]")
      let currentPeg: SVGGElement | null = null
      ballGroups?.forEach((group) => {
        const index = Number(group.dataset.ballIndex)
        const localElapsed = elapsed - index * RELEASE_DELAY_MS
        const path = paths[index]
        const pathDuration = pathDurations[index]
        const localProgress = localElapsed < 0 || pathDuration <= 0
          ? null
          : phase === "pending"
            ? (((localElapsed % pathDuration) + pathDuration) % pathDuration) / pathDuration
            : localElapsed > pathDuration ? null : localElapsed / pathDuration
        if (localProgress === null || (phase !== "pending" && localElapsed > pathDuration)) {
          group.style.display = "none"
          return
        }
        const point = getPathPosition(path, localProgress)
        const trailProgresses = reducedMotion ? [] : [0.035, 0.02, 0.01]
        const trail = trailProgresses.map((offset) => getPathPosition(path, Math.max(0, localProgress - offset))).map((item) => `${item.x},${item.y}`).join(" ")
        group.style.display = "block"
        group.querySelector<SVGPolylineElement>("[data-ball-trail]")?.setAttribute("points", trail)
        group.querySelector<SVGCircleElement>("[data-ball-glow]")?.setAttribute("cx", String(point.x))
        group.querySelector<SVGCircleElement>("[data-ball-glow]")?.setAttribute("cy", String(point.y))
        group.querySelector<SVGCircleElement>("[data-ball-core]")?.setAttribute("cx", String(point.x))
        group.querySelector<SVGCircleElement>("[data-ball-core]")?.setAttribute("cy", String(point.y))
        if (point.pegRow !== undefined && point.pegIndex !== undefined) {
          const peg = document.querySelector<SVGGElement>(`[data-peg-row="${point.pegRow}"][data-peg-index="${point.pegIndex}"]`)
          if (peg) {
            currentPeg = peg
          }
          if (peg && activePegRef.current !== peg) {
            if (activePegRef.current) {
              activePegRef.current.querySelector("[data-peg-shell]")?.setAttribute("r", "2.1")
              activePegRef.current.querySelector("[data-peg-core]")?.setAttribute("r", "0.9")
            }
            peg.querySelector("[data-peg-shell]")?.setAttribute("r", "3")
            peg.querySelector("[data-peg-core]")?.setAttribute("r", "1.15")
            activePegRef.current = peg
          }
        }
      })
      if (activePegRef.current && activePegRef.current !== currentPeg) {
        activePegRef.current.querySelector("[data-peg-shell]")?.setAttribute("r", "2.1")
        activePegRef.current.querySelector("[data-peg-core]")?.setAttribute("r", "0.9")
        activePegRef.current = null
      }
      paths.forEach((path, index) => {
        const localElapsed = elapsed - index * RELEASE_DELAY_MS
        if (localElapsed < 0) return
        const pathDuration = pathDurations[index]
        const localProgress = Math.min(1, localElapsed / pathDuration)
        path.forEach((point, pointIndex) => {
          if (point.pegRow === undefined || localProgress < pathProgressAtPoint(path, pointIndex)) return
          const contactKey = `${index}-${point.pegRow}`
          if (!playedContactsRef.current.has(contactKey)) {
            playedContactsRef.current.add(contactKey)
            if (visibleBallCount <= 8 || index < 8 || point.pegRow % 2 === 0) soundEffects.playBallDrop()
          }
        })
      })
      if (phase === "animating" && nextProgress >= 1) {
        didFinish = true
        const resultSlots = Array.from(new Set(Array.from({ length: activeBallCount }, (_, index) => getFinalSlot(seed, gameId, index, config.rows, weights))))
        setLandedSlots(resultSlots)
        setPhase("result")
        const profit = Number.parseFloat(gameResult?.profit || "0")
        if (profit > Number.parseFloat(gameResult?.totalBet || "0") * 2) {
          setShowBigWinEffect(true)
          soundEffects.playBigWin()
          landingTimeoutRef.current = window.setTimeout(() => setShowBigWinEffect(false), 2800)
        } else if (profit > 0) soundEffects.playMediumWin()
        else soundEffects.playLoss()
      }
      if (!didFinish) animationFrameRef.current = requestAnimationFrame(tick)
    }
    animationFrameRef.current = requestAnimationFrame(tick)
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [activeBallCount, config.rows, gameId, gameResult, pathDurations, paths, phase, reducedMotion, roundDuration, seed, visibleBallCount, weights])

  useEffect(() => () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (landingTimeoutRef.current) window.clearTimeout(landingTimeoutRef.current)
    if (activePegRef.current) {
      activePegRef.current.querySelector("[data-peg-shell]")?.setAttribute("r", "2.1")
      activePegRef.current.querySelector("[data-peg-core]")?.setAttribute("r", "0.9")
    }
  }, [])

  const status = phase === "pending"
    ? { label: "Waiting for randomness", detail: "Your game is secured on-chain. VRF is preparing the result.", color: "text-amber-300", icon: Wifi }
    : phase === "animating"
      ? { label: "Balls are dropping", detail: `${activeBallCount > 1 ? `${activeBallCount} balls` : "Your ball"} are releasing in sequence.`, color: "text-cyan-300", icon: Activity }
      : phase === "result"
        ? { label: demoMode ? "Demo result" : "Result received", detail: "Landing confirmed. Your payout is shown below.", color: "text-emerald-300", icon: Trophy }
        : { label: demoMode ? "Demo board ready" : "Board ready", detail: "Choose your setup, then drop the first ball.", color: "text-slate-300", icon: CircleDot }
  const StatusIcon = status.icon
  const bestLandedMultiplier = landedSlots.length > 0 ? Math.max(...landedSlots.map((slot) => multipliers[slot] / 10000)) : 0

  const boardPegs = useMemo(() => {
    const pegs: Array<{ x: number; y: number; row: number; pin: number }> = []
    for (let row = 0; row < config.rows; row++) {
      const count = row + 1
      const step = 66 / (config.rows + 1)
      const startX = 50 - ((count - 1) * step) / 2
      for (let pin = 0; pin < count; pin++) pegs.push({ x: startX + pin * step, y: 7 + (72 / (config.rows + 1)) * row, row, pin })
    }
    return pegs
  }, [config.rows])

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!demoMode || !interactiveDropEnabled) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setHoverX(Math.max(18, Math.min(82, ((event.clientX - bounds.left) / bounds.width) * 100)))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!demoMode || !interactiveDropEnabled || event.button > 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeY = (event.clientY - bounds.top) / bounds.height
    if (relativeY > 0.78) return
    const originX = Math.max(18, Math.min(82, ((event.clientX - bounds.left) / bounds.width) * 100))
    setHoverX(originX)
    onInteractiveDrop?.(originX)
  }

  return (
    <Card className="relative overflow-hidden border-purple-500/20 bg-slate-950/70 p-4 shadow-2xl shadow-purple-950/30 backdrop-blur-xl sm:p-6">
      {showBigWinEffect && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-amber-500/10 via-yellow-300/20 to-amber-500/10 animate-pulse">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="flex items-center gap-2 text-4xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_26px_rgba(251,191,36,0.9)] sm:text-6xl"><Sparkles className="h-8 w-8" /> BIG WIN <Sparkles className="h-8 w-8" /></div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 shadow-inner shadow-purple-950/20">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 ${status.color}`}><StatusIcon className={`h-4 w-4 ${phase === "pending" || phase === "animating" ? "animate-pulse" : ""}`} /></div>
          <div className="min-w-0"><p className={`text-sm font-bold ${status.color}`}>{status.label}</p><p className="truncate text-xs text-slate-500">{status.detail}</p></div>
        </div>
        <span className="hidden shrink-0 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300 sm:inline-flex">{config.rows} rows · {config.risk === 0 ? "low" : config.risk === 1 ? "medium" : "high"} risk</span>
      </div>

      <div
        data-testid="plinko-board"
        data-phase={phase}
        data-animation-model="peg-to-peg-ballistic"
        data-demo-origin-x={demoMode && demoDropOriginX !== null ? demoDropOriginX : ""}
        data-interactive-drop={demoMode && interactiveDropEnabled ? "on" : "off"}
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-purple-400/20 bg-[radial-gradient(circle_at_50%_15%,rgba(124,58,237,0.18),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,13,55,0.98))] shadow-[inset_0_0_50px_rgba(76,29,149,0.22),0_0_35px_rgba(88,28,135,0.14)] ${demoMode && interactiveDropEnabled ? "cursor-crosshair" : ""}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverX(null)}
        onPointerDown={handlePointerDown}
        role={demoMode && interactiveDropEnabled ? "button" : undefined}
        aria-label={demoMode && interactiveDropEnabled ? "Click the upper Plinko board to drop a demo ball" : undefined}
      >
        <div className="absolute inset-3 rounded-xl border border-white/5" />
        {demoMode && interactiveDropEnabled && hoverX !== null && <div className="pointer-events-none absolute inset-y-3 z-10 w-px bg-cyan-300/30 shadow-[0_0_12px_rgba(103,232,249,0.7)]" style={{ left: `${hoverX}%` }}><div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border border-cyan-200/80 bg-cyan-300/40 shadow-[0_0_14px_rgba(103,232,249,0.9)]" /></div>}
        <svg viewBox="0 0 100 100" className="relative h-full w-full" role="img" aria-label="Animated Plinko board">
          <defs>
            <radialGradient id="peg-glow"><stop offset="0" stopColor="#f5d0fe" /><stop offset="0.28" stopColor="#c084fc" /><stop offset="1" stopColor="#7e22ce" /></radialGradient>
            <linearGradient id="bucket-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#312e81" stopOpacity="0.9" /><stop offset="1" stopColor="#111827" stopOpacity="0.95" /></linearGradient>
            <filter id="soft-glow"><feGaussianBlur stdDeviation="1.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path d="M 17 82 L 83 82" stroke="rgba(192,132,252,0.18)" strokeWidth="0.35" />
          {boardPegs.map((peg, index) => {
            return <g key={`${peg.row}-${index}`} data-peg-row={peg.row} data-peg-index={peg.pin}><circle data-peg-shell cx={peg.x} cy={peg.y} r="2.1" fill="rgba(168,85,247,0.13)" filter="url(#soft-glow)" /><circle data-peg-core cx={peg.x} cy={peg.y - 0.25} r="0.9" fill="url(#peg-glow)" /><circle cx={peg.x - 0.28} cy={peg.y - 0.52} r="0.22" fill="#fff" opacity="0.7" /></g>
          })}
          <g ref={ballLayerRef} aria-hidden="true">{paths.map((_, index) => <g key={`ball-${index}`} data-ball-index={index} style={{ display: "none" }}><polyline data-ball-trail fill="none" stroke="#67e8f9" strokeWidth="0.65" opacity="0.22" strokeLinecap="round" /><circle data-ball-glow r="2.9" fill="#22d3ee" opacity="0.2" filter="url(#soft-glow)" /><circle data-ball-core r="1.2" fill="#e0f2fe" stroke="#67e8f9" strokeWidth="0.55" /></g>)}</g>
          {multipliers.map((scaledMultiplier, slot) => {
            const multiplier = scaledMultiplier / 10000
            const x = 17 + ((slot + 0.5) / (config.rows + 1)) * 66
            const isLanded = landedSlots.includes(slot)
            const color = multiplierColor(multiplier)
            return <g key={`bucket-${slot}`}><rect x={x - 2.45} y="84" width="4.9" height="9" rx="1" fill={isLanded ? color : "url(#bucket-fill)"} fillOpacity={isLanded ? 0.9 : 1} stroke={color} strokeOpacity={isLanded ? 1 : 0.4} strokeWidth={isLanded ? 0.7 : 0.3} />{isLanded && <rect x={x - 2.15} y="84.3" width="4.3" height="8.4" rx="0.8" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="0.25" className="animate-pulse" />}<text x={x} y="89.7" textAnchor="middle" fill={isLanded ? "#fff" : color} fontSize={config.rows > 24 ? "1.8" : "2.2"} fontWeight="700" fontFamily="monospace">{multiplier.toFixed(2)}x</text></g>
          })}
        </svg>
        {phase === "result" && landedSlots.length > 0 && <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 shadow-lg shadow-emerald-500/20">Landing confirmed</div>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs"><div className="flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />{isSummarized ? `Showing ${visibleBallCount} of ${activeBallCount} balls · remaining outcomes summarized` : `${activeBallCount} ${activeBallCount === 1 ? "ball" : "balls"} in this drop`}</div><span className="rounded-full bg-slate-900/80 px-3 py-1 font-mono text-slate-400">{phase === "pending" ? "VRF PENDING" : phase === "animating" ? "SETTLING" : phase === "result" ? "SETTLED" : "READY"}</span></div>

      {gameResult && phase === "result" && <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-purple-400/20 bg-purple-950/20 p-3 text-sm sm:grid-cols-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-500">{gameResult.isDemo ? "Best landing" : "Payout"}</p><p className="font-bold text-white">{gameResult.isDemo ? `${bestLandedMultiplier.toFixed(2)}x` : `${gameResult.totalPayout} POL`}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-500">{gameResult.isDemo ? "Board result" : "Profit"}</p><p className={`font-bold ${gameResult.isDemo ? "text-cyan-300" : Number.parseFloat(gameResult.profit) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{gameResult.isDemo ? "Practice drop" : `${Number.parseFloat(gameResult.profit) >= 0 ? "+" : ""}${gameResult.profit} POL`}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-500">Balls</p><p className="font-bold text-white">{activeBallCount}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-500">Mode</p><p className="font-bold text-purple-300">{gameResult.isDemo ? "Demo" : "Paid"}</p></div></div>}
    </Card>
  )
}
