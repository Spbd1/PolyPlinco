# Token Supply Simulation

Baseline: `bddc08376f7c7dd05239e8e2febd60f3402587d4`
Model: integer arithmetic matching `_mintLossMiningTokens()`.

## Owner-approved post-mining update

Mining remains capped at 900,000 PPL. After exhaustion, the native flow stays
70% AMM buyback / 30% retained; purchased PPL is now 30% permanently burned
and 70% transferred to the player. This burn is separate from mining issuance
and the existing swap/vault/owner burn paths.

## Schedule

| Component | Amount |
|---|---:|
| Developer genesis allocation | 10,000 PPL |
| Initial AMM/vault allocation | 90,000 PPL |
| Mining allocation | 900,000 PPL |
| Maximum supply | 1,000,000 PPL |

Prices per whole PPL are 0.02, 0.03, ..., 0.10 native units across nine
100,000-PPL tiers. The contract converts native wei to 18-decimal token base
units once, caps each tier, and caps the total mining allocation.

## Deterministic checks

**TESTED/MODELLED:**

- Genesis: `100,000 + 900,000 = 1,000,000 PPL`.
- A loss large enough to cross multiple tiers stops at exactly 900,000 mined
  PPL; it cannot enter a tenth tier.
- A loss after exhaustion mints zero and takes the post-mining branch.
- A loss below the current price threshold mints zero rather than rounding up.
- Repeated tier-boundary operations never exceed either mining allocation or
  `MAX_SUPPLY`.

The token contract independently enforces `totalSupply + amount <= MAX_SUPPLY`
and `totalMintedFromMining + amount <= MINING_ALLOCATION`.

## Economic observation

**MODELLED:** intentional loss-mining is not a guaranteed extraction loop at
the seeded local AMM price. Tier-one issuance is one PPL per 0.02 native loss,
while the initial AMM price is approximately 50 native / 90,000 PPL before
fees and price impact. Reward market value is therefore materially below the
loss at genesis and falls in later mining tiers. Market value itself is not
guaranteed and requires separate public-market analysis.

**NOT TESTED:** public-chain sandwich execution, flash liquidity, or external
market arbitrage.

## Current post-mining burn implementation

**TESTED:** The owner-approved fixed policy burns 30% of each post-mining
player-buyback purchase using integer basis-point arithmetic and transfers the
remaining 70% to the player. At the canonical local characterization,
`1.265106719629331608 PPL` was burned from `4.217022398764438695 PPL`
purchased. The mining cap remains 900,000 PPL and no post-mining mint path was
introduced.
