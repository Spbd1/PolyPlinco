import { RiskLevel } from "./contracts"
import { encodeAbiParameters, keccak256 } from "viem"

/**
 * Client-side Plinko ball path simulator
 * Uses the same random seed as the contract for consistency
 */

export interface BallPathPoint {
  x: number
  y: number
  /** Milliseconds spent travelling from the previous point. */
  duration?: number
  curve?: "fall" | "ballistic" | "settle"
  /** Vertical lift above the straight line for a ballistic segment. */
  arcHeight?: number
  pegRow?: number
  pegIndex?: number
}

export interface BallPath {
  path: BallPathPoint[]
  finalSlot: number
  multiplier: number
}

export type PlinkoDecision = "L" | "R"

const BOARD_LEFT = 17
const BOARD_WIDTH = 66
const BOARD_TOP = 7
const BOARD_HEIGHT = 72
const BALL_PEG_CLEARANCE = 3

function visualRandom(seed: bigint): () => number {
  let state = seed === 0n ? 0x9e3779b97f4a7c15n : seed & ((1n << 64n) - 1n)
  return () => {
    state ^= state << 13n
    state ^= state >> 7n
    state ^= state << 17n
    state &= (1n << 64n) - 1n
    return Number(state & 0xffffffn) / 0x1000000
  }
}

export function generateVisualSeed(baseSeed: bigint, gameId: string, ballIndex: number, finalSlot: number): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [baseSeed, BigInt(gameId), BigInt(ballIndex), BigInt(finalSlot)],
      ),
    ),
  )
}

/** Generate a shuffled, mathematically valid L/R sequence for one bucket. */
export function generateDecisionPath(rows: number, finalSlot: number, seed: bigint): PlinkoDecision[] {
  if (!Number.isInteger(rows) || rows < 1 || finalSlot < 0 || finalSlot > rows) {
    throw new Error(`Invalid Plinko path target: rows=${rows}, slot=${finalSlot}`)
  }
  const decisions: PlinkoDecision[] = Array.from({ length: rows }, (_, index) => index < finalSlot ? "R" : "L")
  const random = visualRandom(seed)
  for (let index = decisions.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[decisions[index], decisions[swapIndex]] = [decisions[swapIndex], decisions[index]]
  }
  return decisions
}

function pegPosition(rows: number, row: number, pegIndex: number) {
  const step = BOARD_WIDTH / (rows + 1)
  return { x: 50 - (row * step) / 2 + pegIndex * step, y: BOARD_TOP + (BOARD_HEIGHT / (rows + 1)) * row }
}

function bucketPosition(rows: number, slot: number) {
  return BOARD_LEFT + ((slot + 0.5) / (rows + 1)) * BOARD_WIDTH
}

export function getPathDuration(path: BallPathPoint[]): number {
  return path.slice(1).reduce((sum, point) => sum + (point.duration ?? 0), 0)
}

export function getPathPosition(path: BallPathPoint[], progress: number): BallPathPoint {
  if (path.length === 0) return { x: 50, y: 0 }
  const totalDuration = getPathDuration(path)
  let remaining = Math.max(0, Math.min(1, progress)) * totalDuration
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1]
    const to = path[index]
    const duration = to.duration ?? 0
    if (remaining <= duration || index === path.length - 1) {
      const linear = duration <= 0 ? 1 : Math.max(0, Math.min(1, remaining / duration))
      const curve = to.curve ?? "ballistic"
      const eased = curve === "settle" ? linear * linear * (3 - 2 * linear) : linear
      const arc = curve === "ballistic" ? (to.arcHeight ?? -1) * 4 * linear * (1 - linear) : 0
      const vertical = curve === "fall"
        ? (to.y - from.y) * linear * linear
        : (to.y - from.y) * linear + arc
      const nearContact = to.pegRow !== undefined && linear >= 0.86
      return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + vertical,
        pegRow: nearContact ? to.pegRow : undefined,
        pegIndex: nearContact ? to.pegIndex : undefined,
      }
    }
    remaining -= duration
  }
  return path[path.length - 1]
}

/**
 * Build a peg-to-peg trajectory. The final slot is encoded by the discrete
 * decision sequence; animation randomness only changes the physical-looking
 * contact offsets, arc energy, and timing.
 */
export function simulateBallPath(
  baseSeed: bigint,
  gameId: string,
  ballIndex: number,
  rows: number,
  originX = 50,
): BallPathPoint[] {
  const targetSlot = getFinalSlot(baseSeed, gameId, ballIndex, rows, computeBinomialWeights(rows))
  const seed = generateVisualSeed(baseSeed, gameId, ballIndex, targetSlot)
  const decisions = generateDecisionPath(rows, targetSlot, seed)
  const random = visualRandom(seed)
  const spawnX = Math.max(18, Math.min(82, originX))
  const path: BallPathPoint[] = [{ x: spawnX, y: 2.5, duration: 0 }]
  const segmentBase = Math.max(68, 150 - rows * 2.5)
  let pegIndex = 0

  // Click-to-drop can start at the edge, but the ball gets a short, gentle
  // corridor into the playable center before it reaches the first peg.
  const corridorX = 50 + Math.max(-8, Math.min(8, (spawnX - 50) * 0.25))
  if (Math.abs(corridorX - spawnX) > 0.1) {
    path.push({ x: corridorX, y: 4.4, duration: 48 + random() * 18, curve: "fall" })
  }

  const firstPeg = pegPosition(rows, 0, 0)
  path.push({
    x: firstPeg.x + (random() - 0.5) * 0.9,
    y: firstPeg.y - BALL_PEG_CLEARANCE,
    duration: 92 + random() * 34,
    curve: "fall",
    pegRow: 0,
    pegIndex: 0,
  })

  // Each decision is represented by exactly one ballistic segment to the
  // next peg (or the bucket after the final decision). There is no target
  // force between contacts; the discrete topology is the outcome mechanism.
  for (let row = 0; row < rows; row++) {
    const movesRight = decisions[row] === "R"
    const nextIndex = pegIndex + (movesRight ? 1 : 0)
    const reachesPeg = row + 1 < rows
    const nextNode = reachesPeg ? pegPosition(rows, row + 1, nextIndex) : { x: bucketPosition(rows, targetSlot), y: 82 }
    const nextOffset = (random() - 0.5) * (reachesPeg ? 0.9 : 1.2)
    path.push({
      x: nextNode.x + nextOffset,
      y: reachesPeg ? nextNode.y - BALL_PEG_CLEARANCE : nextNode.y,
      duration: segmentBase * (0.92 + random() * 0.16),
      curve: reachesPeg ? "ballistic" : "fall",
      arcHeight: reachesPeg ? -(1.1 + random() * 1.2) : 0.15,
      pegRow: reachesPeg ? row + 1 : undefined,
      pegIndex: reachesPeg ? nextIndex : undefined,
    })
    pegIndex = nextIndex
  }

  const landingX = bucketPosition(rows, targetSlot) + (random() - 0.5) * 0.9
  path.push({ x: landingX, y: 85.1, duration: 78 + random() * 22, curve: "fall" })
  path.push({ x: landingX - (random() - 0.5) * 0.25, y: 84.35, duration: 45 + random() * 20, curve: "settle" })
  path.push({ x: landingX, y: 85.1, duration: 75 + random() * 35, curve: "settle" })
  return path
}

/**
 * Generate deterministic seed for a specific ball
 * Matches the contract's randomForBall function
 */
export function generateBallSeed(baseSeed: bigint, gameId: string, ballIndex: number): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
        [baseSeed, BigInt(gameId), BigInt(ballIndex)],
      ),
    ),
  )
}

/**
 * Get final slot from random seed (matches contract logic)
 */
export function getFinalSlot(
  baseSeed: bigint,
  gameId: string,
  ballIndex: number,
  rows: number,
  weights: number[],
): number {
  const random = generateBallSeed(baseSeed, gameId, ballIndex)
  const WEIGHT_SCALE = 1_000_000
  const u = Number(random % BigInt(WEIGHT_SCALE))

  let cumulative = 0
  for (let k = 0; k <= rows; k++) {
    cumulative += weights[k]
    if (u < cumulative) {
      return k
    }
  }

  return rows // Fallback
}

/**
 * Compute binomial weights for visualization
 */
export function computeBinomialWeights(rows: number): number[] {
  const weights: number[] = []
  const WEIGHT_SCALE = 1_000_000

  // Pascal's triangle
  const binomial: number[] = [1]
  for (let i = 1; i <= rows; i++) {
    for (let j = i; j > 0; j--) {
      binomial[j] = (binomial[j] || 0) + (binomial[j - 1] || 0)
    }
  }

  // Normalize
  const total = Math.pow(2, rows)
  for (let k = 0; k <= rows; k++) {
    weights[k] = Math.floor((binomial[k] * WEIGHT_SCALE) / total)
  }

  const remainder = WEIGHT_SCALE - weights.reduce((sum, weight) => sum + weight, 0)
  weights[rows] += remainder

  return weights
}

/**
 * Compute multipliers for a given risk level
 */
export function computeMultipliers(rows: number, risk: RiskLevel): number[] {
  const multipliers: number[] = []
  const center = rows / 2
  const MULTIPLIER_SCALE = 10000

  const rawMults: number[] = []
  let expectedRaw = 0
  const weights = computeBinomialWeights(rows)

  for (let k = 0; k <= rows; k++) {
    const d = Math.abs(k - center)
    const x = d / center

    let rawMult: number
    if (risk === RiskLevel.Low) {
      // Low: 0.8 + 1.5 * x^2
      rawMult = 0.8 + 1.5 * x * x
    } else if (risk === RiskLevel.Medium) {
      // Medium: 0.5 + 3.0 * x^2
      rawMult = 0.5 + 3.0 * x * x
    } else {
      // High: 0.2 + 6.0 * x^3 (creates extreme edge multipliers)
      rawMult = 0.2 + 6.0 * x * x * x
    }

    rawMults[k] = rawMult
    expectedRaw += rawMult * (weights[k] / 1_000_000)
  }

  // Scale to 90% RTP
  const targetExpected = 0.9
  const scale = targetExpected / expectedRaw

  for (let k = 0; k <= rows; k++) {
    multipliers[k] = Math.floor(rawMults[k] * scale * MULTIPLIER_SCALE)
  }

  return multipliers
}

/**
 * Get the maximum multiplier for a given configuration
 * Returns the SCALED multiplier (divide by 10000 for actual multiplier)
 */
export function computeMaxMultiplier(rows: number, risk: RiskLevel): number {
  const multipliers = computeMultipliers(rows, risk)
  const maxMult = Math.max(...multipliers)
  // Return as decimal (e.g., 23.45 for 23.45x)
  return maxMult / 10000
}
