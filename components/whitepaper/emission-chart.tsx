"use client"

import { Card } from "@/components/ui/card"

interface EmissionChartProps {
  miningEmitted?: number // Optional prop for dynamic tier display
}

export function EmissionChart({ miningEmitted = 0 }: EmissionChartProps) {
  const TOKENS_PER_TIER = 100_000

  // Calculate realistic cumulative loss for each tier
  // Tier 1: 100k tokens * 0.02 = 2,000 MATIC
  // Tier 2: adds 100k * 0.03 = 3,000 MATIC (cumulative: 5,000)
  // etc.
  const tiers = [
    { tier: 1, tokens: 100000, costPerToken: 0.02, cumulativeLoss: 2000 },
    { tier: 2, tokens: 200000, costPerToken: 0.03, cumulativeLoss: 5000 },
    { tier: 3, tokens: 300000, costPerToken: 0.04, cumulativeLoss: 9000 },
    { tier: 4, tokens: 400000, costPerToken: 0.05, cumulativeLoss: 14000 },
    { tier: 5, tokens: 500000, costPerToken: 0.06, cumulativeLoss: 20000 },
    { tier: 6, tokens: 600000, costPerToken: 0.07, cumulativeLoss: 27000 },
    { tier: 7, tokens: 700000, costPerToken: 0.08, cumulativeLoss: 35000 },
    { tier: 8, tokens: 800000, costPerToken: 0.09, cumulativeLoss: 44000 },
    { tier: 9, tokens: 900000, costPerToken: 0.1, cumulativeLoss: 54000 },
  ]

  const maxLoss = 60000 // X-axis max for better visualization
  const maxTokens = 900000

  const tierIndex = Math.min(8, Math.floor(miningEmitted / TOKENS_PER_TIER))
  const currentTierNumber = tierIndex + 1
  const currentPricePerToken = 0.02 + 0.01 * tierIndex
  const tierStart = tierIndex * TOKENS_PER_TIER
  const tierEnd = (tierIndex + 1) * TOKENS_PER_TIER

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">Chart A: Token Emission vs Cumulative Net Loss</h3>

      <Card className="mb-4 p-4 bg-purple-900/20 border-purple-700/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-purple-300 mb-1">Current Loss-Mining Tier</div>
            <div className="text-2xl font-bold text-white">Tier {currentTierNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">
              ~{tierStart.toLocaleString()}–{tierEnd.toLocaleString()} PPL
            </div>
            <div className="text-lg font-mono text-purple-400">{currentPricePerToken.toFixed(2)} MATIC per PPL</div>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <div className="relative h-80 bg-slate-950/50 rounded-lg p-6 border border-slate-800">
        {/* Y-axis labels */}
        <div className="absolute left-2 top-6 bottom-12 flex flex-col justify-between text-xs text-slate-500">
          <span>900k</span>
          <span>700k</span>
          <span>500k</span>
          <span>300k</span>
          <span>100k</span>
          <span>0</span>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-14 right-6 bottom-2 flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>15k</span>
          <span>30k</span>
          <span>45k</span>
          <span>60k MATIC</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 mr-2 mb-8 mt-2 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-px bg-slate-800/50" />
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="emissionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                <stop offset="50%" stopColor="rgb(59, 130, 246)" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" />
              </linearGradient>
            </defs>
            {/* Create step-wise path */}
            <path
              d={tiers
                .map((t, i) => {
                  const x = (t.cumulativeLoss / maxLoss) * 100
                  const y = (1 - t.tokens / maxTokens) * 100
                  const prevX = i > 0 ? (tiers[i - 1].cumulativeLoss / maxLoss) * 100 : 0
                  const prevY = i > 0 ? (1 - tiers[i - 1].tokens / maxTokens) * 100 : 100

                  if (i === 0) {
                    return `M ${prevX} ${prevY} L ${x} ${prevY} L ${x} ${y}`
                  }
                  return `L ${x} ${prevY} L ${x} ${y}`
                })
                .join(" ")}
              fill="none"
              stroke="url(#emissionGradient)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Tier markers */}
          {tiers.map((tier) => {
            const x = (tier.cumulativeLoss / maxLoss) * 100
            const y = (1 - tier.tokens / maxTokens) * 100
            const isCurrent = tier.tier === currentTierNumber
            return (
              <div
                key={tier.tier}
                className={`absolute rounded-full border-2 border-slate-950 ${
                  isCurrent ? "w-3 h-3 bg-cyan-400 animate-pulse" : "w-2 h-2 bg-purple-500"
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                title={`Tier ${tier.tier}: ${tier.tokens.toLocaleString()} PPL at ~${tier.cumulativeLoss.toLocaleString()} MATIC cumulative loss`}
              />
            )
          })}
        </div>

        {/* Axis labels */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400 font-semibold whitespace-nowrap origin-center">
          Total PPL Emitted
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-semibold">
          Cumulative Net Loss (MATIC)
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center italic">
        Illustrative only – not a price prediction or guarantee. Shows step-wise increase in MATIC cost per PPL as tiers
        fill.
      </p>
    </Card>
  )
}
