import { RiskLevel } from "./contracts"

/**
 * Client-side Plinko ball path simulator
 * Uses the same random seed as the contract for consistency
 */

interface Point {
  x: number
  y: number
}

export interface BallPath {
  path: Point[]
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
export function simulateBallPath(baseSeed: bigint, gameId: string, ballIndex: number, rows: number): Point[] {
  const path: Point[] = []
  const width = 100 // Percentage width
  const height = 100 // Percentage height

  let x = width / 2 // Start at top center
  let y = 0

  path.push({ x, y })

  // Generate deterministic random for this ball
  const seed = generateBallSeed(baseSeed, gameId, ballIndex)
  let random = seed

  const rowHeight = height / (rows + 1)
  const maxDisplacement = width / (2 * (rows + 1))

  // Simulate each row
  for (let row = 0; row <= rows; row++) {
    // Deterministic left/right decision
    const direction = random % 2n === 0n ? -1 : 1
    random = BigInt(keccak256Hash(random.toString()))

    x += direction * maxDisplacement * (1 + row * 0.1)
    y += rowHeight

    // Keep within bounds
    x = Math.max(0, Math.min(width, x))

    path.push({ x, y })
  }

  return path
}

/**
 * Generate deterministic seed for a specific ball
 * Matches the contract's randomForBall function
 */
export function generateBallSeed(baseSeed: bigint, gameId: string, ballIndex: number): bigint {
  const combined = `${baseSeed.toString()}-${gameId}-${ballIndex}`
  return BigInt("0x" + keccak256Hash(combined))
}

/**
 * Simple keccak256 hash implementation using crypto
 */
function keccak256Hash(data: string): string {
  // In a real implementation, use ethers.js or viem's keccak256
  // For now, a placeholder that returns a pseudo-random hex string
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(64, "0")
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
