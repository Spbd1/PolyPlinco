/*
 * Deterministic economic stress model for the current PolyPlinco formulas.
 * This is analysis tooling only; it does not submit transactions or change
 * contract parameters.
 */
const WEIGHT_SCALE = 1_000_000
const MULTIPLIER_SCALE = 10_000
const E18 = 1e18
const MINING_SUPPLY = 900_000
const TIER_SIZE = 100_000

function binomialWeights(rows) {
  const binomial = Array(rows + 1).fill(0)
  binomial[0] = 1
  for (let i = 1; i <= rows; i++) for (let j = i; j > 0; j--) binomial[j] += binomial[j - 1]
  const total = 2 ** rows
  const weights = binomial.map((value) => Math.floor((value * WEIGHT_SCALE) / total))
  const sum = weights.reduce((a, b) => a + b, 0)
  weights[rows] += WEIGHT_SCALE - sum
  return weights
}

function multipliers(rows, risk, weights) {
  const center = Math.floor(rows / 2)
  const raw = []
  let expectedRaw = 0
  for (let k = 0; k <= rows; k++) {
    const d = Math.abs(k - center)
    const x = Math.floor((d * 10_000) / center)
    let value
    if (risk === 0) value = 8_000 + Math.floor((15_000 * x * x) / 1e8)
    else if (risk === 1) value = 5_000 + Math.floor((30_000 * x * x) / 1e8)
    else value = 2_000 + Math.floor((60_000 * x * x * x) / 1e12)
    raw.push(value)
    expectedRaw += Math.floor((value * weights[k]) / WEIGHT_SCALE)
  }
  return raw.map((value) => Math.floor((value * 9_000) / expectedRaw))
}

function rtp(rows, risk) {
  const weights = binomialWeights(rows)
  const mults = multipliers(rows, risk, weights)
  return weights.reduce((sum, weight, i) => sum + (weight * mults[i]) / WEIGHT_SCALE, 0) / MULTIPLIER_SCALE
}

function rng(seed) {
  let state = BigInt(seed)
  return () => {
    state = (state * 1103515245n + 12345n) & 0x7fffffffn
    return Number(state) / 0x80000000
  }
}

function slot(random, weights) {
  const u = Math.floor(random() * WEIGHT_SCALE)
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (u < cumulative) return i
  }
  return weights.length - 1
}

function payout(random, rows, risk, balls, bet) {
  const weights = binomialWeights(rows)
  const mults = multipliers(rows, risk, weights)
  let result = 0
  for (let i = 0; i < balls; i++) result += (bet * mults[slot(random, weights)]) / MULTIPLIER_SCALE
  return result
}

function maxPayout(rows, risk, balls, bet) {
  return (bet * Math.max(...multipliers(rows, risk, binomialWeights(rows))) * balls) / MULTIPLIER_SCALE
}

function mintForLoss(state, loss) {
  let remaining = loss
  let minted = 0
  while (remaining > 1e-15 && state.mining < MINING_SUPPLY - 1e-12) {
    const tier = Math.floor(state.mining / TIER_SIZE)
    const price = 0.02 + tier * 0.01
    const left = TIER_SIZE - (state.mining % TIER_SIZE)
    const possible = remaining / price
    const take = Math.min(possible, left)
    if (take <= 1e-12) break
    const consumed = take * price
    state.mining += take
    minted += take
    remaining -= consumed
  }
  state.minted += minted
  return minted
}

function buyback(state, loss) {
  if (state.mining < MINING_SUPPLY - 1e-12) return 0
  if (state.reserveM < 1 || state.reserveT < 1) return 0
  const amount = loss * 0.70
  if (state.house < amount) return 0
  let tokens = (amount * state.reserveT) / (state.reserveM + amount)
  tokens = Math.min(tokens, state.reserveT / 2)
  state.house -= amount
  state.reserveM += amount
  state.reserveT -= tokens
  state.boughtBack += amount
  return tokens
}

function modelGame(state, random, config, forcedMultiplier = null) {
  const { rows, risk, balls, bet } = config
  const netBet = bet * balls * 0.99
  const max = maxPayout(rows, risk, balls, bet)
  const available = state.house - state.locked
  if (available + 1e-12 < max) {
    state.rejected++
    return false
  }
  state.locked += max
  state.house += netBet
  const total = forcedMultiplier === null ? payout(random, rows, risk, balls, bet) : bet * balls * forcedMultiplier
  state.locked -= max
  state.house -= total
  const loss = Math.max(0, netBet - total)
  if (loss > 0) {
    if (state.mining < MINING_SUPPLY - 1e-12) mintForLoss(state, loss)
    else buyback(state, loss)
  }
  state.games++
  state.minHouse = Math.min(state.minHouse, state.house - state.locked)
  state.maxDrawdown = Math.max(state.maxDrawdown, state.startHouse - state.house)
  state.longestLoss = Math.max(state.longestLoss, state.lossStreak)
  state.lossStreak = total < netBet ? state.lossStreak + 1 : 0
  return true
}

function newState(house = 50) {
  return { startHouse: house, house, locked: 0, reserveM: 50, reserveT: 90_000, vault: 0, mining: 0, minted: 0, burned: 0, boughtBack: 0, games: 0, rejected: 0, minHouse: house, maxDrawdown: 0, lossStreak: 0, longestLoss: 0 }
}

function summarize(values) {
  values.sort((a, b) => a - b)
  const at = (p) => values[Math.min(values.length - 1, Math.floor(values.length * p))]
  return { p01: at(0.01), p05: at(0.05), p50: at(0.50), p95: at(0.95), p99: at(0.99), min: values[0], max: values[values.length - 1] }
}

function monteCarlo(horizon, paths, seedBase, house = 50) {
  const endings = [], drawdowns = [], mins = [], rejects = [], streaks = [], emissions = [], buybacks = []
  for (let path = 0; path < paths; path++) {
    const state = newState(house)
    const random = rng(BigInt(seedBase) + BigInt(path))
    for (let i = 0; i < horizon; i++) {
      modelGame(state, random, { rows: 16, risk: 1, balls: 1, bet: 0.01 })
    }
    endings.push(state.house)
    drawdowns.push(state.maxDrawdown)
    mins.push(state.minHouse)
    rejects.push(state.rejected)
    streaks.push(state.longestLoss)
    emissions.push(state.mining)
    buybacks.push(state.boughtBack)
  }
  return { horizon, paths, endingHouse: summarize(endings), drawdown: summarize(drawdowns), minimumHouse: summarize(mins), rejectedGames: summarize(rejects), longestLossStreak: summarize(streaks), emittedPpl: summarize(emissions), buybackNative: summarize(buybacks), ruinAtZero: mins.filter((x) => x <= 0).length / paths, criticalAt10: mins.filter((x) => x <= 10).length / paths }
}

function ammSell(reserveM, reserveT, tokens) {
  const trade = tokens * 0.95
  return { nativeOut: (trade * reserveM) / (reserveT + trade), reserveM: reserveM - (trade * reserveM) / (reserveT + trade), reserveT: reserveT + trade, burned: tokens * 0.05 }
}

function buybackAndBurn(state, nativeAmount) {
  if (nativeAmount <= 0 || state.reserveM <= 0 || state.reserveT <= 0) return { tokens: 0, burned: 0 }
  const tokens = (nativeAmount * state.reserveT) / (state.reserveM + nativeAmount)
  state.reserveM += nativeAmount
  state.reserveT -= tokens
  state.burned += tokens
  return { tokens, burned: tokens }
}

function ammBuy(reserveM, reserveT, native) {
  const trade = native * 0.95
  const out = (trade * reserveT) / (reserveM + trade)
  if (out > reserveT * 0.30) return null
  return { tokensOut: out, reserveM: reserveM + trade, reserveT: reserveT - out }
}

function intentionalLossTable() {
  const rows = []
  for (let tier = 0; tier < 9; tier++) {
    const loss = 0.02 + tier * 0.01
    const tokens = 1
    const sold = ammSell(50, 90_000, tokens)
    rows.push({ tier: tier + 1, loss, ppl: tokens, immediateNative: sold.nativeOut, recoveryRatio: sold.nativeOut / loss, netPnl: sold.nativeOut - loss })
  }
  return rows
}

function intentionalLossScenarios() {
  return [0.02, 1, 10, 100].map((loss) => {
    const state = newState()
    const tokens = mintForLoss(state, loss)
    const sold = ammSell(state.reserveM, state.reserveT, tokens)
    return { loss, tokens, immediateNative: sold.nativeOut, recoveryRatio: sold.nativeOut / loss, netPnl: sold.nativeOut - loss, sellAcceptedByImpactBound: sold.nativeOut > 0 }
  })
}

function buybackSandwich() {
  const loss = 1
  const protocolBuy = loss * 0.70
  let best = null
  for (let native = 0.01; native <= 100; native += 0.01) {
    const before = ammBuy(50, 90_000, native)
    if (!before) continue
    const afterBuybackM = before.reserveM + protocolBuy
    const afterBuybackT = before.reserveT - (protocolBuy * before.reserveT) / (before.reserveM + protocolBuy)
    const unwind = ammSell(afterBuybackM, afterBuybackT, before.tokensOut)
    const pnl = unwind.nativeOut - native
    if (!best || pnl > best.pnl) best = { attackerNativeIn: native, attackerTokens: before.tokensOut, protocolBuy, attackerNativeOut: unwind.nativeOut, pnl }
  }
  return best
}

function cluster() {
  const state = newState(50)
  const random = rng(0xdecafbadn)
  const config = { rows: 16, risk: 2, balls: 256, bet: 0.01 }
  const max = maxPayout(config.rows, config.risk, config.balls, config.bet)
  let accepted = 0
  for (let i = 0; i < 100; i++) if (modelGame(state, random, config, max / (config.bet * config.balls))) accepted++
  return { maxPayout: max, accepted, rejected: state.rejected, remainingHouse: state.house, minimumFreeHouse: state.minHouse, locked: state.locked }
}

function supplyTransition() {
  const state = newState()
  const before = { mining: state.mining, minted: state.minted, supply: 100_000 + state.mining }
  const exhaustionLoss = 60_000
  const minted = mintForLoss(state, exhaustionLoss)
  const afterExhaustion = { mining: state.mining, minted, supply: 100_000 + state.mining }
  const random = rng(0xfeedcafen)
  for (let i = 0; i < 100_000; i++) modelGame(state, random, { rows: 16, risk: 1, balls: 1, bet: 0.01 })
  const ownerBurn = buybackAndBurn(state, 0.005)
  const representativeSell = ammSell(state.reserveM, state.reserveT, 100)
  state.burned += representativeSell.burned
  return { before, exhaustionLoss, afterExhaustion, postMining100kGames: { games: state.games, house: state.house, minimumHouse: state.minHouse, rejected: state.rejected, minted: state.minted, mining: state.mining, reservePpl: state.reserveT, buybackNative: state.boughtBack, supplyWithoutUserBurns: 100_000 + state.mining, ownerBuybackBurn: ownerBurn, representativeUserSellBurn: representativeSell.burned, supplyAfterModeledBurns: 100_000 + state.mining - state.burned } }
}

function liquidityShocks() {
  const sellFractions = [0.01, 0.05, 0.10, 0.25]
  const buyNative = [0.01, 1, 5, 10, 25]
  const depths = [
    { label: "full", native: 50, ppl: 90_000 },
    { label: "50% liquidity", native: 25, ppl: 45_000 },
    { label: "25% liquidity", native: 12.5, ppl: 22_500 }
  ]
  return depths.map(({ label, native, ppl }) => ({
    label,
    spotNativePerPpl: native / ppl,
    whaleSells: sellFractions.map((fraction) => {
      const result = ammSell(native, ppl, ppl * fraction)
      return { fraction, nativeOut: result.nativeOut, burn: result.burned }
    }),
    nativeBuys: buyNative.map((amount) => {
      const result = ammBuy(native, ppl, amount)
      return { nativeIn: amount, accepted: result !== null, pplOut: result ? result.tokensOut : 0 }
    })
  }))
}

// Exact post-mining policy model. This section uses integer base units to
// mirror Solidity's uint256 arithmetic; the broader historical model above
// intentionally remains unchanged for continuity with prior reports.
const POLICY_BURN_PERCENTS = [0, 10, 20, 25, 30, 40, 50, 60, 75, 100]
const NATIVE_UNIT = 10n ** 18n
const TOKEN_UNIT = 10n ** 18n
const POLICY_INITIAL_SUPPLY = 1_000_000n * TOKEN_UNIT
const POLICY_INITIAL_HOUSE = 50n * NATIVE_UNIT
const POLICY_INITIAL_AMM_NATIVE = 50n * NATIVE_UNIT
const POLICY_INITIAL_AMM_PPL = 90_000n * TOKEN_UNIT

function exactNative(value) {
  const [whole, fraction = ""] = String(value).split(".")
  return BigInt(whole) * NATIVE_UNIT + BigInt((fraction + "0".repeat(18)).slice(0, 18))
}

function exactPolicyGame(burnPercent, lossText, initial = {}) {
  let reserveM = initial.reserveM ?? POLICY_INITIAL_AMM_NATIVE
  let reserveT = initial.reserveT ?? POLICY_INITIAL_AMM_PPL
  let house = initial.house ?? POLICY_INITIAL_HOUSE
  let actualNative = initial.actualNative ?? (POLICY_INITIAL_HOUSE + POLICY_INITIAL_AMM_NATIVE)
  let totalSupply = initial.totalSupply ?? POLICY_INITIAL_SUPPLY
  const loss = exactNative(lossText)
  const buybackNative = (loss * 70n) / 100n

  // The settled net loss increases house accounting before the 70% transfer.
  house += loss
  actualNative += loss

  let purchased = 0n
  if (reserveM >= NATIVE_UNIT && reserveT >= TOKEN_UNIT && house >= buybackNative) {
    purchased = (buybackNative * reserveT) / (reserveM + buybackNative)
    purchased = purchased > reserveT / 2n ? reserveT / 2n : purchased
    house -= buybackNative
    reserveM += buybackNative
    reserveT -= purchased
  }

  const burnedByPlayerPolicy = (purchased * BigInt(burnPercent)) / 100n
  const playerPpl = purchased - burnedByPlayerPolicy
  totalSupply -= burnedByPlayerPolicy

  // Immediate player sell-back uses the existing 5% token-side burn path.
  const swapFeeBurn = (playerPpl * 5n) / 100n
  const tradePpl = playerPpl - swapFeeBurn
  const nativeOut = tradePpl === 0n ? 0n : (tradePpl * reserveM) / (reserveT + tradePpl)
  reserveT += tradePpl
  reserveM -= nativeOut
  actualNative -= nativeOut
  totalSupply -= swapFeeBurn

  const accountedNative = house + reserveM
  return {
    burnPercent,
    loss: loss.toString(),
    buybackNative: buybackNative.toString(),
    retainedNative: (loss - buybackNative).toString(),
    purchasedPpl: purchased.toString(),
    burnedPpl: burnedByPlayerPolicy.toString(),
    playerPpl: playerPpl.toString(),
    immediateNativeOut: nativeOut.toString(),
    recoveryRatio: Number(nativeOut) / Number(loss),
    netPlayerPnl: Number(nativeOut - loss) / Number(NATIVE_UNIT),
    swapFeeBurnPpl: swapFeeBurn.toString(),
    totalSupplyBefore: (initial.totalSupply ?? POLICY_INITIAL_SUPPLY).toString(),
    totalSupplyAfter: totalSupply.toString(),
    ammNativeAfter: reserveM.toString(),
    ammPplAfter: reserveT.toString(),
    houseAfter: house.toString(),
    actualNativeAfter: actualNative.toString(),
    nativeAccountingReconciled: accountedNative === actualNative,
    playerPlusBurnEqualsPurchased: playerPpl + burnedByPlayerPolicy === purchased,
  }
}

function policyLongRun(burnPercent, games, lossText = "0.003347") {
  let reserveM = POLICY_INITIAL_AMM_NATIVE
  let reserveT = POLICY_INITIAL_AMM_PPL
  let house = POLICY_INITIAL_HOUSE
  let actualNative = POLICY_INITIAL_HOUSE + POLICY_INITIAL_AMM_NATIVE
  let totalSupply = POLICY_INITIAL_SUPPLY
  let purchased = 0n
  let burned = 0n
  let playerPpl = 0n
  let buybackNative = 0n
  let skipped = 0
  const loss = exactNative(lossText)
  for (let i = 0; i < games; i++) {
    const amount = (loss * 70n) / 100n
    if (reserveM < NATIVE_UNIT || reserveT < TOKEN_UNIT || house + loss < amount) {
      skipped++
      continue
    }
    const quotedBought = (amount * reserveT) / (reserveM + amount)
    const bought = quotedBought < reserveT / 2n ? quotedBought : reserveT / 2n
    const policyBurn = (bought * BigInt(burnPercent)) / 100n
    house += loss - amount
    actualNative += loss
    reserveM += amount
    reserveT -= bought
    totalSupply -= policyBurn
    purchased += bought
    burned += policyBurn
    playerPpl += bought - policyBurn
    buybackNative += amount
  }
  const startingSupply = POLICY_INITIAL_SUPPLY
  return {
    burnPercent,
    games,
    lossPerGame: loss.toString(),
    purchasedPpl: purchased.toString(),
    burnedPpl: burned.toString(),
    playerPpl: playerPpl.toString(),
    burnPer1000Games: (burned * 1000n / BigInt(games)).toString(),
    burnPer10000Games: (burned * 10000n / BigInt(games)).toString(),
    burnPer100000Games: (burned * 100000n / BigInt(games)).toString(),
    endingTotalSupply: totalSupply.toString(),
    supplyReductionPercent: Number(startingSupply - totalSupply) / Number(startingSupply) * 100,
    ammNative: reserveM.toString(),
    ammPpl: reserveT.toString(),
    averageBuybackPriceNativePerPpl: purchased === 0n ? 0 : Number(buybackNative) / Number(purchased),
    house: house.toString(),
    actualNative: actualNative.toString(),
    nativeAccountingReconciled: house + reserveM === actualNative,
    skippedBuybacks: skipped,
  }
}

function policyClassification(reductionPercent) {
  if (reductionPercent === 0) return "FLAT"
  if (reductionPercent < 1) return "SLOWLY DEFLATIONARY"
  if (reductionPercent <= 5) return "MODERATELY DEFLATIONARY"
  return "STRONGLY DEFLATIONARY"
}

function policySimulation() {
  const configured = Number(process.env.POST_MINING_BURN_PERCENT ?? "30")
  if (!Number.isInteger(configured) || configured < 0 || configured > 100) throw new Error("POST_MINING_BURN_PERCENT must be an integer from 0 to 100")
  const losses = ["0.02", "1", "10", "100"]
  const volume = [1_000, 10_000, 100_000]
  const canonicalLoss = "0.003347"
  const candidates = POLICY_BURN_PERCENTS.map((burnPercent) => {
    const canonical = exactPolicyGame(burnPercent, canonicalLoss)
    const longRun = volume.map((games) => policyLongRun(burnPercent, games, canonicalLoss))
    const highVolume = ["1", "10", "100"].map((loss) => policyLongRun(burnPercent, 1_000, loss))
    const reduction = longRun[2].supplyReductionPercent
    return {
      burnPercent,
      classification: policyClassification(reduction),
      canonical,
      lossScenarios: losses.map((loss) => exactPolicyGame(burnPercent, loss)),
      longRun,
      highVolume,
      transition: policyTransition(burnPercent),
    }
  })

  const loops = []
  for (const burnPercent of POLICY_BURN_PERCENTS) {
    for (const depth of [
      { label: "full", reserveM: 50n * NATIVE_UNIT, reserveT: 90_000n * TOKEN_UNIT },
      { label: "50%", reserveM: 25n * NATIVE_UNIT, reserveT: 45_000n * TOKEN_UNIT },
      { label: "25%", reserveM: 125n * NATIVE_UNIT / 10n, reserveT: 22_500n * TOKEN_UNIT },
    ]) {
      for (const loss of ["0.02", "1", "10", "100"]) {
        const result = exactPolicyGame(burnPercent, loss, depth)
        loops.push({ burnPercent, depth: depth.label, loss, recovery: result.recoveryRatio, netPnl: result.netPlayerPnl, classification: result.netPlayerPnl < 0 ? "strictly loss-making" : result.netPlayerPnl === 0 ? "break-even" : "potentially profitable; investigate" })
      }
    }
  }
  return { configuredBurnPercent: configured, candidates, loops, buybackSandwichByCandidate: POLICY_BURN_PERCENTS.map(policyBuybackSandwich), existingBurns: { playerBuybackBurn: "candidate-controlled", tokenSideSwapFeeBurnPercent: 5, vaultAutoBuybackBurn: "100% of tokens acquired by that path", ownerBuybackAndBurn: "100% of tokens acquired by that path" } }
}

function policyTransition(burnPercent) {
  const finalMiningReward = 1n * TOKEN_UNIT
  const firstPostMining = exactPolicyGame(burnPercent, "0.1")
  const playerPpl = BigInt(firstPostMining.playerPpl)
  return {
    finalMiningRewardPpl: finalMiningReward.toString(),
    firstPostMiningPurchasedPpl: firstPostMining.purchasedPpl,
    firstPostMiningPlayerPpl: playerPpl.toString(),
    firstPostMiningBurnedPpl: firstPostMining.burnedPpl,
    playerRewardDeltaPpl: (playerPpl - finalMiningReward).toString(),
    playerRewardRatioVsFinalMining: Number(playerPpl) / Number(finalMiningReward),
  }
}

function policyBuybackSandwich(burnPercent) {
  const protocolBuy = 0.70
  let best = null
  for (const native of [0.01, 0.1, 1, 5, 10, 25, 50, 100]) {
    const frontRun = ammBuy(50, 90_000, native)
    if (!frontRun) continue
    const protocolTokens = (protocolBuy * frontRun.reserveT) / (frontRun.reserveM + protocolBuy)
    const burned = (protocolTokens * burnPercent) / 100
    const playerTokens = protocolTokens - burned
    const afterBuybackM = frontRun.reserveM + protocolBuy
    const afterBuybackT = frontRun.reserveT - protocolTokens
    const unwind = ammSell(afterBuybackM, afterBuybackT, frontRun.tokensOut)
    const pnl = unwind.nativeOut - native
    const candidate = { burnPercent, attackerNativeIn: native, protocolBuy, protocolTokens, burned, playerTokens, attackerNativeOut: unwind.nativeOut, pnl }
    if (!best || candidate.pnl > best.pnl) best = candidate
  }
  return best
}

const output = {
  model: { seedFamily: "0x5eedc0de + path", canonical: { rows: 16, risk: "Medium", balls: 1, bet: 0.01, startingHouse: 50, startingAmmNative: 50, startingAmmPpl: 90000 }, rtp: Object.fromEntries([8, 12, 16, 20, 24, 28, 32].flatMap((r) => [0, 1, 2].map((risk) => [`${r}/${risk}`, rtp(r, risk)]))) },
  monteCarlo: [monteCarlo(1_000, 500, 0x5eedc0de), monteCarlo(10_000, 200, 0x1), monteCarlo(100_000, 50, 0x9)],
  riskByStartingHouse: [5, 10, 50, 100].map((house) => ({ house, result: monteCarlo(10_000, 100, 0xabc000 + house, house) })),
  clusteredMaximumWinners: cluster(),
  intentionalLossOnePpl: intentionalLossTable(),
  intentionalLossScenarios: intentionalLossScenarios(),
  buybackSandwich: buybackSandwich(),
  supplyTransition: supplyTransition(),
  liquidityShocks: liquidityShocks(),
  postMiningBurnPolicy: policySimulation(),
  notes: ["Simulation is a model, not a forecast of player behavior.", "Protocol admission rejects games whose maximum payout exceeds available house bankroll.", "AMM fee, burn, impact caps, and buyback reserve updates follow the contract formulas."]
}

console.log(JSON.stringify(output, null, 2))
