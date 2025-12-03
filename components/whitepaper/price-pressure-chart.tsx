"use client"

import { Card } from "@/components/ui/card"

export function PricePressureChart() {
  const dataPoints = 50
  const points = Array.from({ length: dataPoints }, (_, i) => {
    const progress = i / (dataPoints - 1)
    // Gentler growth curve - starts moderate, increases gradually
    const base = 0.3 + Math.pow(progress, 0.7) * 0.5
    const variance = 0.08
    const upper = base + variance
    const lower = Math.max(0.2, base - variance * 0.6)
    return { time: progress, upper, lower, mid: (upper + lower) / 2 }
  })

  return (
    <Card className="p-6 bg-slate-900/50 border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">Chart C: Conceptual Price Pressure Over Time</h3>

      {/* Chart */}
      <div className="relative h-80 bg-slate-950/50 rounded-lg p-6 border border-slate-800">
        {/* Y-axis labels */}
        <div className="absolute left-2 top-6 bottom-12 flex flex-col justify-between text-xs text-slate-500">
          <span>High</span>
          <span></span>
          <span>Med</span>
          <span></span>
          <span>Low</span>
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
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-px bg-slate-800/50" />
            ))}
          </div>

          {/* Pressure band */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pressureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.2" />
                <stop offset="50%" stopColor="rgb(168, 85, 247)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="pressureLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                <stop offset="50%" stopColor="rgb(168, 85, 247)" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" />
              </linearGradient>
            </defs>

            {/* Band fill */}
            <polygon
              points={[
                ...points.map((p) => `${p.time * 100},${(1 - p.upper) * 100}`),
                ...points
                  .reverse()
                  .map((p) => `${p.time * 100},${(1 - p.lower) * 100}`)
                  .reverse(),
              ].join(" ")}
              fill="url(#pressureGradient)"
            />

            {/* Upper line */}
            <polyline
              points={points.map((p) => `${p.time * 100},${(1 - p.upper) * 100}`).join(" ")}
              fill="none"
              stroke="url(#pressureLineGradient)"
              strokeWidth="2"
              strokeDasharray="4 2"
              vectorEffect="non-scaling-stroke"
              opacity="0.5"
            />

            {/* Middle line */}
            <polyline
              points={points.map((p) => `${p.time * 100},${(1 - p.mid) * 100}`).join(" ")}
              fill="none"
              stroke="url(#pressureLineGradient)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Lower line */}
            <polyline
              points={points.map((p) => `${p.time * 100},${(1 - p.lower) * 100}`).join(" ")}
              fill="none"
              stroke="url(#pressureLineGradient)"
              strokeWidth="2"
              strokeDasharray="4 2"
              vectorEffect="non-scaling-stroke"
              opacity="0.5"
            />
          </svg>

          {/* Key factors annotations */}
          <div className="absolute top-4 right-4 text-xs space-y-2 bg-slate-900/80 p-3 rounded border border-slate-700">
            <div className="text-slate-300 font-semibold mb-2">Factors:</div>
            <div className="text-slate-400">↑ Supply reduction</div>
            <div className="text-slate-400">↑ Vault growth</div>
            <div className="text-slate-400">↑ Buyback volume</div>
            <div className="text-slate-400">↑ Protocol usage</div>
          </div>
        </div>

        {/* Axis labels */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400 font-semibold whitespace-nowrap origin-center">
          Relative Scarcity / Potential Price Pressure
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-semibold">Time</div>
      </div>

      <Card className="mt-4 p-4 bg-amber-900/10 border-amber-700/50">
        <p className="text-sm text-amber-300 font-semibold">
          This is a conceptual illustration only – NOT a price prediction or guarantee. Actual price behavior depends on
          market conditions and many unpredictable factors.
        </p>
      </Card>

      <p className="text-xs text-slate-500 mt-2 text-center italic">
        The band represents potential upward pressure from deflationary mechanics. Tokens can lose all value.
      </p>
    </Card>
  )
}
