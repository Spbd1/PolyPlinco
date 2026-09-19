# Post-Mining Burn Policy Simulation

Date: 2026-09-19
Scope: candidate analysis and the subsequent owner-approved 30% implementation; no deployment configuration or unrelated economics changed.

> **OWNER-APPROVED UPDATE (2026-09-19):** The selected policy is now fixed at 30% purchased-PPL burn / 70% player. The candidate matrix remains historical analysis; no alternative percentage was selected.

## Executive summary

**SIMULATED:** Candidate automatic player-buyback burns of `0%, 10%, 20%, 25%, 30%, 40%, 50%, 60%, 75%, 100%` were modeled with exact integer base-unit arithmetic for the post-mining path.

**VERIFIED IN MODEL:** The native side is invariant across candidates:

```text
70% of net loss -> AMM native reserve
30% of net loss -> retained house accounting
```

The candidate burn percentage applies only to PPL acquired by that native buyback. It does not reduce native buyback spending.

**SIMULATED:** The AMM removes the same purchased PPL for every candidate. Burning changes where the acquired PPL goes after purchase; it does not return burned PPL to the AMM. A higher burn percentage therefore does not, by itself, accelerate AMM PPL depletion. It reduces player-held PPL and reduces the amount that could later be sold back into the AMM.

**MODEL-DEPENDENT:** Under the canonical 100,000-game post-mining scenario, supply reduction ranges from 0% at current behavior to approximately 7.4171% at 100% burn. The model classifies 10% as slowly deflationary, 20%–60% as moderately deflationary, and 75%–100% as strongly deflationary under the quantitative thresholds defined below.

**HISTORICAL:** At the time the candidate matrix was first produced, the implementation was 0% automatic player-buyback burn. The selected current implementation is recorded in the addendum at the end of this document.

## Reproducibility and exact arithmetic

The analysis was added to:

```text
scripts/economic-sustainability.cjs
```

The policy section uses `BigInt` wei/base-unit arithmetic for:

- the 70% buyback amount;
- AMM reserve updates;
- purchased PPL;
- candidate burn amount;
- player PPL amount;
- 5% token-side swap burn;
- totalSupply deltas;
- native reconciliation.

The broader historical Monte Carlo section remains unchanged. The policy model accepts:

```text
POST_MINING_BURN_PERCENT=0..100
```

The default is `0`, matching the current implementation. The candidate matrix is always calculated. Generated JSON was written only under `/tmp`.

Two complete default runs produced identical output:

```text
60e2ef198217537aa47059e4f5ab590f4cfb661b0269f935783bc9785e094167
60e2ef198217537aa47059e4f5ab590f4cfb661b0269f935783bc9785e094167
```

## Assumptions

**MODEL-DEPENDENT:** Policy scenarios start post-mining with:

- totalSupply: 1,000,000 PPL;
- house: 50 native;
- AMM native reserve: 50 native;
- AMM PPL reserve: 90,000 PPL;
- 5% token-side swap burn when the player immediately sells;
- canonical post-mining net loss: `0.003347` native, taken from the local characterization transaction;
- larger loss cases: `0.02`, `1`, `10`, and `100` native;
- canonical volumes: 1,000, 10,000, and 100,000 games.

The simulation is a mechanical state-flow model, not a prediction of adoption, prices, user behavior, or market demand.

## Quantitative supply labels

For this report, using cumulative player-buyback burns divided by the 1,000,000 PPL starting post-mining supply after 100,000 canonical games:

- **FLAT:** exactly 0%;
- **SLOWLY DEFLATIONARY:** greater than 0% and less than 1%;
- **MODERATELY DEFLATIONARY:** 1% through 5%;
- **STRONGLY DEFLATIONARY:** greater than 5%.

These labels describe this simulation only and are not market claims.

## Candidate comparison table

Canonical case: `0.003347` native loss, immediate sale of all PPL remaining after the candidate burn.

| Burn | Player share | Immediate recovery | 100k supply reduction | Classification | 100k AMM PPL removed | Loop result |
|---:|---:|---:|---:|---|---:|---|
| 0% | 100% | 66.50% | 0.0000% | FLAT | 74,171.09 | Strictly loss-making |
| 10% | 90% | 59.85% | 0.7417% | SLOWLY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 20% | 80% | 53.20% | 1.4834% | MODERATELY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 25% | 75% | 49.88% | 1.8543% | MODERATELY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 30% | 70% | 46.55% | 2.2251% | MODERATELY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 40% | 60% | 39.90% | 2.9668% | MODERATELY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 50% | 50% | 33.25% | 3.7086% | MODERATELY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 60% | 40% | 26.60% | 4.4503% | MODERATELY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 75% | 25% | 16.63% | 5.5628% | STRONGLY DEFLATIONARY | 74,171.09 | Strictly loss-making |
| 100% | 0% | 0.00% | 7.4171% | STRONGLY DEFLATIONARY | 74,171.09 | Strictly loss-making |

The recovery column is native received from the subsequent AMM sale divided by the original loss. It is not a claim that the PPL reward reimburses the loss.

## Player reward impact across loss sizes

The exact model calculated every candidate for losses of `0.02`, `1`, `10`, and `100` native. The following recovery percentages show the endpoints and representative middle candidates:

| Loss | 0% burn | 30% burn | 60% burn | 100% burn |
|---:|---:|---:|---:|---:|
| 0.02 | 66.5009% | 46.5544% | 26.6046% | 0.0000% |
| 1 | 66.5459% | 46.7663% | 26.8297% | 0.0000% |
| 10 | 66.9109% | 48.5473% | 28.7923% | 0.0000% |
| 100 | 58.4615% | 47.9279% | 33.0435% | 0.0000% |

Every candidate preserves:

```text
playerPPL + burnedPPL == purchasedPPL
```

with Solidity-style integer truncation.

## Long-run supply and reserve behavior

Canonical loss per game: `0.003347` native.

| Burn | Burned after 1k | Burned after 10k | Burned after 100k | Supply reduction after 100k | AMM PPL reserve after 100k |
|---:|---:|---:|---:|---:|---:|
| 0% | 0 | 0 | 0 | 0.0000% | 15,828.9071 PPL |
| 10% | 402.85 PPL | 2,871.63 PPL | 7,417.11 PPL | 0.7417% | 15,828.9071 PPL |
| 20% | 805.69 PPL | 5,743.26 PPL | 14,834.22 PPL | 1.4834% | 15,828.9071 PPL |
| 25% | 1,007.11 PPL | 7,179.08 PPL | 18,542.77 PPL | 1.8543% | 15,828.9071 PPL |
| 30% | 1,208.54 PPL | 8,614.89 PPL | 22,251.33 PPL | 2.2251% | 15,828.9071 PPL |
| 40% | 1,611.38 PPL | 11,486.52 PPL | 29,668.44 PPL | 2.9668% | 15,828.9071 PPL |
| 50% | 2,014.23 PPL | 14,358.16 PPL | 37,085.55 PPL | 3.7086% | 15,828.9071 PPL |
| 60% | 2,417.07 PPL | 17,229.79 PPL | 44,502.66 PPL | 4.4503% | 15,828.9071 PPL |
| 75% | 3,021.34 PPL | 21,537.23 PPL | 55,628.32 PPL | 5.5628% | 15,828.9071 PPL |
| 100% | 4,028.45 PPL | 28,716.31 PPL | 74,171.09 PPL | 7.4171% | 15,828.9071 PPL |

**SIMULATED:** AMM PPL depletion is identical across candidates because every candidate purchases the same PPL amount. The difference is:

- 0%: all purchased PPL is transferred to the player;
- intermediate burn: purchased PPL is split between burn and player;
- 100%: all purchased PPL is burned and no PPL reaches the player.

For the canonical 100,000-game run, average buyback price was approximately `0.0005555816` native per PPL across candidates because the native buyback amount and AMM purchase formula are unchanged.

## Native treasury reconciliation

**TESTED IN MODEL:** For every candidate and loss size:

```text
house after + AMM native reserve after
== actual native assets after
```

The policy burn does not touch native balances. For the canonical one-game scenario, all candidates retained identical:

- native buyback amount;
- native retained amount;
- house bankroll;
- AMM native reserve;
- actual native balance;
- protected-liability treatment.

Only PPL destination and totalSupply change.

## Immediate sell-back and repeated loops

**SIMULATED:** For each candidate, reserve depth (`100%`, `50%`, `25%`) and loss size (`0.02`, `1`, `10`, `100`) were tested through:

```text
loss
-> 70% native buyback
-> candidate PPL burn
-> player receives remaining PPL
-> player sells remaining PPL through current AMM
```

All tested combinations were **strictly loss-making**. No candidate produced a mechanically positive game/buyback/sell loop.

Higher burns reduce the player’s immediate sell-back proceeds monotonically. The 100% candidate gives the player no PPL and therefore no sell-back leg.

This does not prove that every externally manipulated AMM state or MEV sequence is unprofitable.

## Mining-to-post-mining transition

**MODEL-DEPENDENT:** The boundary model assumes the final mining token is earned at the tier-9 rate from a `0.1` native net loss, then compares a first post-mining `0.1` native loss against fresh 50 native / 90,000 PPL reserves.

The final mining reward is 1 PPL. The first post-mining buyback purchases approximately 125.823846614739364889 PPL before candidate burning.

| Burn | First post-mining player PPL | Reward ratio vs final 1 PPL |
|---:|---:|---:|
| 0% | 125.8238 PPL | 125.82x |
| 10% | 113.2415 PPL | 113.24x |
| 20% | 100.6591 PPL | 100.66x |
| 25% | 94.3679 PPL | 94.37x |
| 30% | 88.0767 PPL | 88.08x |
| 40% | 75.4943 PPL | 75.49x |
| 50% | 62.9119 PPL | 62.91x |
| 60% | 50.3295 PPL | 50.33x |
| 75% | 31.4560 PPL | 31.46x |
| 100% | 0 PPL | 0x |

The candidate burn reduces the post-mining reward cliff but does not eliminate the modeled discontinuity until 100%, where the player receives no PPL. This boundary is highly dependent on reserve state and the selected loss amount.

## High-volume and whale-loss scenarios

**SIMULATED:** With 1,000 post-mining losses per scenario:

- at `1` native loss per game, AMM PPL reserve remained approximately 6,000 PPL;
- at `10` native loss per game, AMM PPL reserve remained approximately 638.30 PPL;
- at `100` native loss per game, AMM PPL reserve fell to approximately 77.09 PPL.

The same reserve depletion occurs for all burn percentages because all candidates buy the same PPL amount. Higher burns reduce player receipt, but do not prevent the AMM purchase from draining PPL reserves.

At the modeled 1,000-game horizon, the reserve remained above the current 1 PPL minimum-liquidity threshold. Longer or larger sequences would eventually make buybacks unavailable when reserve checks fail; this is an availability condition, not an accounting insolvency.

## Existing burn mechanisms

Existing burns were kept separate from candidate player-buyback burns:

| Mechanism | Current behavior | Included in candidate policy? |
|---|---|---|
| Player post-mining buyback | Historical 0%; current fixed 30% | Yes, candidate matrix / current implementation |
| PPL-to-native swap | Burns 5% token-side fee | Included in immediate sell-back |
| Vault-threshold auto buyback | Burns 100% of tokens acquired by that path | Not double-counted in player policy |
| Owner `buybackAndBurn` | Burns 100% of tokens acquired by that path | Not double-counted in player policy |
| Direct token `burn` | Holder-selected amount | Not assumed in canonical player policy |

**OWNER DECISION REQUIRED:** Adding automatic player-buyback burning would make the separate owner buyback-and-burn path less important as a supply-reduction mechanism, but it would remain operationally meaningful for vault-held native fees and burn timing. No existing path was removed or altered.

## Candidate ranges, not a selection

These ranges are mechanical groupings only:

- **Conservative: 10%–25%** — preserves approximately 49.9%–59.9% canonical immediate recovery and produces 0.74%–1.85% supply reduction over 100,000 modeled games.
- **Balanced: 30%–50%** — preserves approximately 33.3%–46.6% canonical immediate recovery and produces 2.23%–3.71% supply reduction over 100,000 modeled games.
- **Aggressive: 60%–75%** — preserves approximately 16.6%–26.6% canonical immediate recovery and produces 4.45%–5.56% supply reduction over 100,000 modeled games.
- **Maximal: 100%** — produces the largest modeled burn but transfers no PPL to the player and therefore changes the reward semantics completely.

No range is recommended as the final policy. The owner must decide the desired trade-off between player reward, supply reduction, and the post-mining transition behavior.

## Economic safety conditions

**TESTED for every candidate:**

- `burnedPPL <= purchasedPPL`;
- `playerPPL + burnedPPL == purchasedPPL`;
- candidate burn does not alter native 70/30 amounts;
- native accounting reconciles;
- no post-mining mint path is introduced by the model;
- totalSupply reduction equals modeled actual burn amount;
- AMM PPL reserve changes only through the purchase and any later player sale;
- no deterministic profitable game/buyback/sell loop emerged in tested depths/losses.

Existing contract MAX_SUPPLY and mining-cap invariants remain unchanged; this analysis did not modify or re-run contract behavior with a candidate burn because no contract patch was authorized.

## Limitations

- This is a deterministic policy model, not a market forecast.
- It does not model externally manipulated spot prices beyond the explicit AMM scenarios.
- It does not choose a real-world reserve floor or adoption rate.
- It does not implement a candidate policy in Solidity.
- It does not determine legal, gambling, securities, tax, or consumer-protection implications.

## Final decision status

| Item | Status |
|---|---|
| Current automatic player-buyback burn | 0% |
| Candidate percentages modeled | 0%, 10%, 20%, 25%, 30%, 40%, 50%, 60%, 75%, 100% |
| Native 70/30 split changed | No |
| Contracts modified | Yes, fixed owner-approved 30% policy |
| Deterministic reproducibility | PASS |
| Profitable deterministic loop found | No, within tested model |
| Final burn percentage | 30% selected; fixed, no setter |

## Selected policy update

The owner has now selected the 30% candidate for implementation. The fixed
current policy is 30% purchased-PPL burn / 70% player, while the native split
remains 70% buyback / 30% retained. The alternative candidate results above
remain historical analysis and were not implemented.

The current exact canonical result is `4.217022398764438695 PPL` purchased,
`1.265106719629331608 PPL` burned, and `2.951915679135107087 PPL` sent to the
player. The native buyback and retained amounts remain unchanged.
