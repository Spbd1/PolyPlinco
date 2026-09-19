#!/usr/bin/env node

/**
 * Deterministic launch-safety model.
 *
 * This intentionally models liabilities, not win probabilities.  The
 * admission rule is the current contract rule plus an optional owner-policy
 * exposure cap: max possible payout <= free house bankroll * cap.
 * Values are normalized native units, not USD or live prices.
 */

const crypto = require("node:crypto")

const BPS = 10_000
const MAX_BET_PER_BALL = 10
const MAX_BET_TOTAL = 1_000
const DEV_FEE_BPS = 100
const ROWS = 16
const BALLS = 256
const RISK = 2 // High
const ORDINARY_BALLS = 1
const ORDINARY_BET_PER_BALL = 0.001
const SEEDS = [0x5eedc0de, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const STARTS = [50, 100, 250, 500, 1_000]
const CAPS = [2, 5, 10, 20]

function binomialWeights(n) {
  const values = Array(n + 1).fill(0)
  values[0] = 1
  for (let i = 1; i <= n; i += 1) {
    for (let j = i; j > 0; j -= 1) values[j] += values[j - 1]
  }
  const total = 2 ** n
  const weights = values.map((value) => Math.floor((value * 1_000_000) / total))
  const sum = weights.reduce((a, b) => a + b, 0)
  weights[n] += 1_000_000 - sum
  return weights
}

function multipliers(n, risk) {
  const weights = binomialWeights(n)
  const center = Math.floor(n / 2)
  const raw = []
  let expectedRaw = 0
  for (let k = 0; k <= n; k += 1) {
    const d = Math.abs(k - center)
    const x = Math.floor((d * 10_000) / center)
    let value
    if (risk === 0) value = 8_000 + Math.floor((15_000 * x * x) / (10_000 * 10_000))
    else if (risk === 1) value = 5_000 + Math.floor((30_000 * x * x) / (10_000 * 10_000))
    else value = 2_000 + Math.floor((60_000 * x * x * x) / (10_000 * 10_000 * 10_000))
    raw.push(value)
    expectedRaw += Math.floor((value * weights[k]) / 1_000_000)
  }
  return raw.map((value) => Math.floor((value * 9_000) / expectedRaw))
}

const maxMultiplier = Math.max(...multipliers(ROWS, RISK)) / 10_000
const maxLiabilityForBet = (betPerBall) => betPerBall * BALLS * maxMultiplier

function xorshift(state) {
  let x = state >>> 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

function capAllows(free, liability, capPercent) {
  return liability <= free + 1e-12 && (capPercent === 0 || liability <= (free * capPercent) / 100 + 1e-12)
}

function admit(state, liability, betPerBall, capPercent) {
  const accepted = capAllows(state.free, liability, capPercent)
  if (!accepted) {
    state.rejected += 1
    return false
  }
  state.locked += liability
  state.house += betPerBall * BALLS * (1 - DEV_FEE_BPS / BPS)
  state.devFees += betPerBall * BALLS * (DEV_FEE_BPS / BPS)
  state.accepted += 1
  return true
}

function settle(state, liability, payout) {
  state.locked -= liability
  state.house -= payout
  state.minFree = Math.min(state.minFree, state.free)
  state.maxDrawdown = Math.max(state.maxDrawdown, state.start - state.free)
}

function fresh(start) {
  const state = { start, house: start, locked: 0, devFees: 0, accepted: 0, rejected: 0, minFree: start, maxDrawdown: 0 }
  Object.defineProperty(state, "free", { enumerable: true, get: () => Math.max(state.house - state.locked, 0) })
  return state
}

function pendingBurst(start, capPercent) {
  const state = fresh(start)
  const liability = maxLiabilityForBet(0.01)
  for (let i = 0; i < 20; i += 1) admit(state, liability, 0.01, capPercent)
  return { accepted: state.accepted, rejected: state.rejected, locked: state.locked, free: state.free }
}

function clusteredWins(start, capPercent) {
  const state = fresh(start)
  let wins = 0
  while (wins < 100) {
    const betPerBall = maxBetAtFree(state.free, capPercent)
    const liability = maxLiabilityForBet(betPerBall)
    if (!admit(state, liability, betPerBall, capPercent)) break
    settle(state, liability, liability)
    wins += 1
  }
  return { wins, rejected: state.rejected, minimumFree: state.minFree, drawdown: state.maxDrawdown }
}

function ordinaryGames(start, capPercent, seed) {
  const state = fresh(start)
  let rng = seed >>> 0
  const liability = ORDINARY_BET_PER_BALL * ORDINARY_BALLS * maxMultiplier
  for (let i = 0; i < 10_000; i += 1) {
    rng = xorshift(rng)
    if (!admit(state, liability, ORDINARY_BET_PER_BALL, capPercent)) continue
    // A deliberately conservative house-edge model: 10% expected edge,
    // with a bounded outcome mix sufficient for treasury drawdown comparison.
    const win = (rng % 10) === 0
    settle(state, liability, win ? liability * 0.9 : 0)
  }
  return { accepted: state.accepted, rejected: state.rejected, minimumFree: state.minFree, drawdown: state.maxDrawdown }
}

function maxBetAtFree(free, capPercent) {
  const policyLimit = capPercent === 0 ? Infinity : (free * capPercent) / 100
  return Math.min(MAX_BET_PER_BALL, MAX_BET_TOTAL / BALLS, policyLimit / (BALLS * maxMultiplier))
}

const output = {
  model: {
    units: "normalized native units; no live USD price",
    config: { rows: ROWS, balls: BALLS, risk: "high", maxMultiplier, ordinaryBalls: ORDINARY_BALLS, ordinaryBetPerBall: ORDINARY_BET_PER_BALL, devFeePercent: 1 },
    formula: "freeHouse = max(houseBankroll - lockedBankroll, 0); admission requires maxLiability <= freeHouse and, when selected, maxLiability <= freeHouse * capPercent / 100",
  },
  starts: {},
}

for (const start of STARTS) {
  output.starts[start] = {}
  for (const cap of [0, ...CAPS]) {
    const runs = SEEDS.map((seed) => ordinaryGames(start, cap, seed))
    output.starts[start][cap === 0 ? "current" : `${cap}%`] = {
      capPercent: cap,
      maxBetPerBall: maxBetAtFree(start, cap),
      pending20: pendingBurst(start, cap),
      clusteredMaximumWins: clusteredWins(start, cap),
      ordinary10k: {
        acceptedMean: runs.reduce((sum, r) => sum + r.accepted, 0) / runs.length,
        rejectedMean: runs.reduce((sum, r) => sum + r.rejected, 0) / runs.length,
        minimumFree: Math.min(...runs.map((r) => r.minimumFree)),
        maximumDrawdown: Math.max(...runs.map((r) => r.drawdown)),
      },
    }
  }
}

const digest = crypto.createHash("sha256").update(JSON.stringify(output)).digest("hex")
output.reproducibility = { seeds: SEEDS, digest }
console.log(JSON.stringify(output, null, 2))
