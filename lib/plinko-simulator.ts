import { RiskLevel } from "./contracts"
import { encodeAbiParameters, keccak256 } from "viem"

/**
 * Client-side Plinko ball path simulator
 * Uses the same random seed as the contract for consistency
 */

export interface BallPathPoint {
  x: number
  y: number
  /** Relative time spent travelling to this point. */
  duration?: number
}

export interface BallPath {
  path: BallPathPoint[]
  finalSlot: number
  multiplier: number
}

/**
 * Simulate ball drop animation path
 * @param baseSeed Random seed from contract
 * @param gameId Game identifier
 * @param ballIndex Ball index
 * @param rows Number of rows
 * @returns Array of positions for animation
 */
export function simulateBallPath(
  baseSeed: bigint,
  gameId: string,
  ballIndex: number,
  rows: number,
  originX = 50,
): BallPathPoint[] {
  const path: BallPathPoint[] = []
  const targetSlot = getFinalSlot(baseSeed, gameId, ballIndex, rows, computeBinomialWeights(rows))
  const targetX = 17 + (targetSlot / (rows + 1)) * 66
  const seed = generateBallSeed(baseSeed, gameId, ballIndex)
  const stepHeight = 72 / (rows + 1)
  const stepCount = rows + 1
  const boardStep = 66 / (rows + 1)
  const clampedOrigin = Math.max(18, Math.min(82, originX))
  let currentX = clampedOrigin
  let momentum = 0

  path.push({ x: clampedOrigin, y: 3, duration: 0.18 })
  for (let row = 0; row <= rows; row++) {
    const layerY = 7 + stepHeight * row
    const direction = ((seed >> BigInt((row * 5 + 3) % 61)) & 1n) === 0n ? -1 : 1
    const variation = Number((seed >> BigInt((row * 7 + 11) % 61)) & 15n) / 15
    const targetPull = (targetX - currentX) * (0.16 + variation * 0.08)
    const collisionBias = direction * (0.8 + variation * 1.25)
    const desiredPegX = Math.max(18, Math.min(82, currentX + momentum * 0.45 + targetPull + collisionBias))
    const pegCount = row + 1
    const pegStart = 50 - ((pegCount - 1) * boardStep) / 2
    const nearestPeg = Math.round((desiredPegX - pegStart) / boardStep)
    const pegX = pegCount === 1
      ? 50
      : pegStart + Math.max(0, Math.min(pegCount - 1, nearestPeg)) * boardStep
    const approachX = Math.max(18, Math.min(82, currentX + momentum * 0.32 + (pegX - currentX) * 0.62))
    const bounce = 0.65 + variation * 0.65
    const reboundMomentum = direction * (1.1 + variation * 1.6) + momentum * 0.34
    const exitX = Math.max(18, Math.min(82, pegX + reboundMomentum))

    // Each layer has a falling approach, a short contact, and a visible
    // upward rebound before the next gravity-driven arc. The small duration
    // weights avoid the old glide/pause/slide rhythm without adding a physics
    // dependency. Target pull is applied at every layer, never as a last-row
    // correction, so the final bucket remains believable.
    path.push({ x: approachX, y: layerY - 1.7, duration: 0.34 + variation * 0.08 })
    path.push({ x: pegX, y: layerY, duration: 0.08 + variation * 0.025 })
    path.push({ x: pegX + reboundMomentum * 0.18, y: layerY - bounce, duration: 0.11 + (1 - variation) * 0.03 })
    path.push({ x: exitX, y: layerY + stepHeight * 0.52, duration: 0.38 + (1 - variation) * 0.1 })
    currentX = exitX
    momentum = reboundMomentum
  }

  path.push({ x: targetX, y: 82, duration: 0.42 })
  path.push({ x: targetX, y: 85, duration: 0.12 })

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
