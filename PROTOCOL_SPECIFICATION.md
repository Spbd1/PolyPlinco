# PolyPlinco Protocol Specification Notes

This technical companion records stable, non-secret parameters from [`protocol-spec.json`](protocol-spec.json). It is a reviewed specification artifact, not runtime contract configuration.

## Current wager semantics

The player supplies `rows` (8–32), `balls` (1–256), `risk` (Low/Medium/High), and `betPerBall` (0.001–10 native units). The contract computes:

```text
totalBet = betPerBall × balls
```

`totalBet` must equal `msg.value`, must not exceed the current owner-configurable `maxBetTotal` (initially 1,000 native units), and must satisfy:

```text
freeHouseBankroll = max(houseBankroll - lockedBankroll, 0)
maximumPossiblePayout <= freeHouseBankroll
maximumPossiblePayout <= freeHouseBankroll × 500 / 10000
```

The 5% rule uses maximum possible payout, not win probability. Existing pending games increase `lockedBankroll`, so later games see a smaller free bankroll. The technical minimum is not an economically viable-minimum recommendation; that remains an owner decision pending live target-chain VRF cost measurement.

## Fee and loss ordering

```text
developerFee = floor(totalBet / 100)
netBet = totalBet - developerFee
netLoss = max(netBet - totalPayout, 0)
```

The developer fee is a protected pull-based liability. If a native payout transfer fails, the amount is recorded in `pendingWithdrawals` and remains protected until the player claims it.

## VRF request shape

The current round shape is one game → one VRF request → one random word. The word is combined with game ID and ball index to derive each slot during settlement. This is an implementation fact, not a live billing claim. Local tests use the authenticated mock coordinator; public-chain Chainlink validation remains open.

## AMM mechanics

The game contract keeps `reserveMatic` and `reserveToken` and uses integer constant-product-style pricing.

### MATIC → PPL

```text
fee = floor(maticIn × 5 / 100)
tradeMatic = maticIn - fee
tokensOut = floor(tradeMatic × reserveToken / (reserveMatic + tradeMatic))
```

The fee increases `vaultMatic`; the reserve receives `tradeMatic`. The swap requires initialized reserves, minimum liquidity of 1 native/PPL unit, native input no greater than 100 native units, and `tokensOut <= floor(reserveToken × 30 / 100)`.

### PPL → MATIC

```text
feeBurned = floor(tokenAmountIn × 5 / 100)
tradeTokens = tokenAmountIn - feeBurned
maticOut = floor(tradeTokens × reserveMatic / (reserveToken + tradeTokens))
```

The contract receives the full input, burns `feeBurned`, and adds only `tradeTokens` to the token reserve. It requires estimated input value no greater than 100 native units and `maticOut <= floor(reserveMatic × 30 / 100)`. Tiny fees can round to zero.

## Callback gas measurements

These are local Hardhat measurements from `scripts/gas-report.ts`, not Chainlink billing measurements or public-chain validation:

| Balls | Measured gas | Headroom versus 2,000,000 |
|---:|---:|---:|
| 1 | 444,380 | 1,555,620 |
| 10 | 480,878 | 1,519,122 |
| 50 | 632,206 | 1,367,794 |
| 100 | 821,890 | 1,178,110 |
| 256 normal | 1,429,198 | 570,802 |
| 256 post-mining | 1,450,714 | 549,286 |

Configured default callback gas limit: `2,000,000`.

## Failed payout claims

Settlement first attempts a native transfer. If the recipient rejects it, the amount is added to `pendingWithdrawals` and `totalPendingWithdrawals`. The player later calls `withdrawPendingPayout`; the claim is cleared before the external call and cannot be claimed twice. Protected accounting prevents owner withdrawal from consuming it. Pausing new games does not erase an existing claim.

## Open decisions

- Technical minimum wager: 0.001 native units per ball is the contract floor; economically viable minimum is **OWNER DECISION REQUIRED** after live VRF billing.
- Public Chainlink VRF lifecycle: **INTENTIONALLY OPEN**.
- Stuck-request timeout/refund: **INTENTIONALLY OPEN**.
- AMM/MEV acceptance or mitigation and reorg-aware indexing remain launch decisions.
