"use client"

import { Card } from "@/components/ui/card"

export function SupplyBurnChart() {
  const dataPoints = 60
  const points = Array.from({ length: dataPoints }, (_, i) => {
    const progress = i / (dataPoints - 1)
    let supply = 0

    if (progress < 0.6) {
      // Emission phase (0-60% of timeline): supply grows from 100k to 1M
      const emissionProgress = progress / 0.6
      supply = 100000 + 900000 * emissionProgress
    } else {
      // Deflationary phase (60-100%): supply decreases due to burns
      const burnProgress = (progress - 0.6) / 0.4
      // Gentle decline of 10-15% over long term
      supply = 1000000 * (1 - burnProgress * 0.12)
    }

    return { time: progress, supply }
  })

  const maxSupply = 1000000

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">Chart B: Total PPL Supply vs Burn Over Time</h3>

      {/* Chart */}
      <div className="relative h-80 bg-slate-950/50 rounded-lg p-6 border border-slate-800">
        {/* Y-axis labels */}
        <div className="absolute left-2 top-6 bottom-12 flex flex-col justify-between text-xs text-slate-500">
          <span>1M</span>
          <span>800k</span>
          <span>600k</span>
          <span>400k</span>
          <span>200k</span>
          <span>0</span>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-14 right-6 bottom-2 flex justify-between text-xs text-slate-500">
          <span>Launch</span>
          <span>Year 1</span>
          <span>Year 2</span>
          <span>Year 3</span>
          <span>Year 5+</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 mr-2 mb-8 mt-2 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-px bg-slate-800/50" />
            ))}
          </div>

          {/* Supply curve */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="supplyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="supplyLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                <stop offset="60%" stopColor="rgb(59, 130, 246)" />
                <stop offset="100%" stopColor="rgb(168, 85, 247)" />
              </linearGradient>
            </defs>

            {/* Area under curve */}
            <polygon
              points={`0,100 ${points
                .map((p) => `${p.time * 100},${(1 - p.supply / maxSupply) * 100}`)
                .join(" ")} 100,100`}
              fill="url(#supplyGradient)"
            />

            {/* Line */}
            <polyline
              points={points.map((p) => `${p.time * 100},${(1 - p.supply / maxSupply) * 100}`).join(" ")}
              fill="none"
              stroke="url(#supplyLineGradient)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-cyan-500/30" style={{ left: "60%" }}>
            <div className="absolute -top-1 left-2 text-xs text-cyan-400 font-semibold whitespace-nowrap">
              Mining Complete
            </div>
          </div>

          {/* Emission phase shaded region */}
          <div
            className="absolute top-0 bottom-0 bg-cyan-500/5 border-l-2 border-cyan-500/20"
            style={{ left: 0, right: "40%" }}
          >
            <div className="absolute top-2 left-2 text-xs text-cyan-300 font-medium">Emission Phase</div>
          </div>

          {/* Deflation phase region */}
          <div className="absolute top-0 bottom-0 bg-purple-500/5" style={{ left: "60%", right: 0 }}>
            <div className="absolute top-2 right-2 text-xs text-purple-300 font-medium">Deflationary Phase</div>
          </div>
        </div>

        {/* Axis labels */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400 font-semibold whitespace-nowrap origin-center">
          Circulating Supply (PPL)
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-semibold">Time</div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-xs text-slate-400 flex items-start gap-2">
          <span className="inline-block w-3 h-3 bg-cyan-500 rounded-full mt-0.5 flex-shrink-0" />
          <span>
            <strong>Emission Phase:</strong> Loss-mining gradually adds PPL to circulation up to the 1,000,000 cap
          </span>
        </div>
        <div className="text-xs text-slate-400 flex items-start gap-2">
          <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mt-0.5 flex-shrink-0" />
          <span>
            <strong>Deflation Phase:</strong> Effective circulating supply may decline via swap burns, buyback, and
            70/30 post-mining mechanics
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center italic">
        Illustrative only. Actual burn rate depends on real usage, swap volume, and protocol activity. No outcomes are
        guaranteed.
      </p>
    </Card>
  )
}
