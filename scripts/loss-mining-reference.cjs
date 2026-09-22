const SCALE = 10n ** 18n
const MINING_SUPPLY = 900_000n * SCALE
const TOKENS_PER_TIER = 100_000n * SCALE
const PRICE_BASE = 20_000_000_000_000_000n
const PRICE_STEP = 10_000_000_000_000_000n
const NUM_TIERS = 9n

function priceForTier(tier) {
  return PRICE_BASE + tier * PRICE_STEP
}

function lossCentricModel(netLoss, miningEmitted = 0n) {
  let remainingLossX18 = netLoss * SCALE
  let totalMinted = 0n
  const tiers = []

  for (let iterations = 0n; iterations < NUM_TIERS && remainingLossX18 > 0n && miningEmitted < MINING_SUPPLY; iterations++) {
    const tier = miningEmitted / TOKENS_PER_TIER
    const price = priceForTier(tier)
    const tierRemaining = TOKENS_PER_TIER - (miningEmitted % TOKENS_PER_TIER)
    const tokensToMint = [remainingLossX18 / price, tierRemaining].reduce((a, b) => a < b ? a : b)
    if (tokensToMint === 0n) break
    const costX18 = tokensToMint * price
    if (costX18 <= 0n || costX18 > remainingLossX18) throw new Error("invalid reference cost")
    tiers.push({ tier, tokensToMint, costX18, price })
    remainingLossX18 -= costX18
    miningEmitted += tokensToMint
    totalMinted += tokensToMint
  }

  return { totalMinted, miningEmitted, remainingLossX18, tiers }
}

// Reproduces the old lossy reverse conversion, with a finite guard only so
// differential analysis can identify non-terminating states safely.
function oldModel(netLoss, miningEmitted = 0n, maxIterations = 100_000n) {
  let remainingLoss = netLoss
  let totalMinted = 0n
  let iterations = 0n
  while (remainingLoss > 0n && miningEmitted < MINING_SUPPLY && iterations < maxIterations) {
    iterations++
    const tier = miningEmitted / TOKENS_PER_TIER
    const price = priceForTier(tier)
    const tierRemaining = TOKENS_PER_TIER - (miningEmitted % TOKENS_PER_TIER)
    const affordable = (remainingLoss * SCALE) / price
    const tokensToMint = affordable < tierRemaining ? affordable : tierRemaining
    if (tokensToMint === 0n) break
    const lossConsumed = (tokensToMint * price) / SCALE
    miningEmitted += tokensToMint
    remainingLoss -= lossConsumed
    totalMinted += tokensToMint
  }
  return { totalMinted, miningEmitted, remainingLoss, iterations, terminated: remainingLoss === 0n || miningEmitted >= MINING_SUPPLY }
}

function serialize(result) {
  return JSON.stringify(result, (_, value) => typeof value === "bigint" ? value.toString() : value, 2)
}

if (require.main === module) {
  const cases = [0n, 1n, 2n, 3n, 5n, 10n, 100n, 1_000n, 100_000_000_000_000_000n]
  for (const loss of cases) {
    console.log(serialize({ loss: loss.toString(), result: lossCentricModel(loss) }))
  }
}

module.exports = {
  SCALE,
  MINING_SUPPLY,
  TOKENS_PER_TIER,
  PRICE_BASE,
  PRICE_STEP,
  NUM_TIERS,
  lossCentricModel,
  oldModel,
}
