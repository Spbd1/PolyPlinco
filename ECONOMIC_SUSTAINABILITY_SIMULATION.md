# PolyPlinco Economic Sustainability & Player-Incentive Stress Test

Date: 2026-09-19
Release candidate: `bddc08376f7c7dd05239e8e2febd60f3402587d4`
Scope: local, deterministic analysis only. No network deployment or transaction was performed.

> **OWNER-APPROVED UPDATE (2026-09-19):** The earlier report modeled the pre-change 0% automatic player-buyback burn. The approved current implementation is native 70% buyback / 30% retained, followed by purchased PPL 30% burn / 70% player. Historical pre-change results remain below; the current simulator and post-change characterization supersede its pre-change supply conclusions.

## Executive conclusion

**VERIFIED / SIMULATED:** The implemented game has a positive expected house edge, and the tested admission rule prevents the modeled house balance from becoming negative. This is not equivalent to guaranteed treasury profitability at every finite horizon. A clustered maximum-payout scenario reduced a 50 native-unit house balance to approximately 11.31 after one accepted maximum game and rejected the next 99 attempts. The protocol remained solvent, but availability was materially degraded.

**SIMULATED:** In the canonical 1-, 10-, and 100-thousand-game Monte Carlo runs, the house balance increased and no games were rejected. These runs use small one-ball bets and immediate serial settlement; they are not a forecast of real user behavior or throughput.

**SIMULATED:** Intentional loss followed by immediate PPL sale is strongly loss-making in the tested initial AMM state. One tier-1 PPL produced about 0.000528 native units on sale against a 0.02 native loss, before considering the player's opportunity cost.

**VERIFIED / SIMULATED:** Mining reaches the 900,000-token mining allocation and total supply reaches the 1,000,000 cap in the exhaustion model. In the current post-mining player buyback path, supply is flat absent user burns or the separate owner buyback-and-burn path; it is not automatically declining merely because post-mining buybacks occur.

**OPEN RISK:** The internal AMM has manipulable spot pricing and no oracle. The tested simple buyback sandwich grid did not find positive profit, but this is a bounded model result, not proof that all MEV strategies are unprofitable. VRF liveness remains an operational risk because there is no expiry/refund path.

## Labels

- **VERIFIED** — directly established from current source, compiled behavior, or existing regression tests.
- **TESTED** — exercised by a deterministic test or local transaction sequence.
- **SIMULATED** — produced by `scripts/economic-sustainability.cjs` using current contract formulas.
- **MODEL-DEPENDENT** — depends on scenario assumptions and is not a forecast.
- **NOT TESTED** — not established by this work.
- **EXTERNAL** — requires product, legal, governance, or operational decisions outside contract arithmetic.

## Methodology and reproducibility

**TESTED:** The analysis tool is:

```text
scripts/economic-sustainability.cjs
```

It reproduces the current Solidity formulas for:

- binomial outcome weights and row/risk multipliers;
- 90% target RTP normalization;
- 1% developer fee;
- maximum-liability admission;
- nine loss-mining tiers and the 900,000-token mining allocation;
- post-mining 70% buyback / 30% retained accounting;
- AMM 5% fee, burn/fee behavior, and 30% impact cap.

Deterministic seed family: `0x5eedc0de + path` for Monte Carlo paths, with dedicated fixed seeds for clustered winners and supply transition. The full JSON output was generated at `/tmp/poly-economic.json` during this run; it contains no credentials or chain writes.

Monte Carlo sample sizes:

| Horizon | Paths | Scenario |
|---:|---:|---|
| 1,000 games | 500 | rows 16, Medium risk, 1 ball, 0.01 native bet, 50 native starting house |
| 10,000 games | 200 | same canonical configuration |
| 100,000 games | 50 | same canonical configuration |
| 10,000 games | 100 per starting balance | starting house 5, 10, 50, 100 |

These are serial, immediately settled games. Pending-game concurrency and unfavorable fulfillment order are addressed separately by the clustered-liability and existing contract invariant tests.

## 1. RTP and expected house edge

**VERIFIED / TESTED:** Independent formula calculation across the supported seven row counts and three risk levels produced:

- minimum RTP: **90.0415365%**
- maximum RTP: **90.4849158%**
- corresponding expected gross house edge: approximately **9.5151%–9.9585%**, before the developer fee and operational effects.

This is consistent with the previously reported approximately 90.03%–90.48% range; the small difference is attributable to the exact independently reproduced integer-weight/multiplier calculation and rounding.

Positive expected value means the expected settlement flow favors the house over many independent games. It does not bound finite-horizon drawdown, guarantee liquidity, or eliminate the possibility of a clustered winning sequence.

## 2. Treasury trajectories and variance

**SIMULATED:** Canonical Monte Carlo results, starting with a 50 native-unit house balance and 50 native / 90,000 PPL AMM reserves:

| Horizon | Ending house p01 / p50 / p99 | Worst observed minimum house | Worst observed drawdown | Rejections |
|---:|---:|---:|---:|---:|
| 1,000 | 50.6667 / 50.8898 / 51.1325 | 49.9313 | 0.0687 | 0 |
| 10,000 | 58.1606 / 58.9389 / 59.8138 | 49.9458 | 0.0542 | 0 |
| 100,000 | 135.0727 / 138.8979 / 140.6631 | 135.0727 | 0.0542 | 0 |

The one-thousand-game sample contains the largest observed drawdown because the drawdown statistic is path maximum, not ending-balance loss. The model’s house balance remained positive in all canonical paths.

**MODEL-DEPENDENT:** Starting-house sensitivity over 10,000 canonical games and 100 paths per balance showed no simulated balance reaching zero. Starting balances of 5 and 10 were below the report’s informational 10-unit threshold throughout, but that threshold is not a protocol insolvency threshold and should not be interpreted as a failure.

## 3. Risk of ruin and clustered winners

**VERIFIED:** Game admission uses the maximum possible payout and rejects a game when available house liquidity cannot cover that maximum. This makes the tested insolvency mode rejection rather than an under-backed accepted game.

**SIMULATED:** One hundred sequential forced maximum-payout games at rows 16, high risk, 256 balls, 0.01 native per ball, from a 50 native house:

| Metric | Result |
|---|---:|
| Maximum payout per game | 41.225728 native |
| Accepted games | 1 |
| Rejected attempts | 99 |
| Remaining house | 11.308672 native |
| Minimum free house | 11.308672 native |
| Locked after settlement | 0 |

This demonstrates finite-horizon drawdown and degraded service availability, not insolvency. A real concurrent sequence is additionally constrained by locked bankroll; the existing multi-seed stateful tests covered pending games and admission invariants.

**MODEL-DEPENDENT:** A formal risk-of-ruin percentage depends on arrival rate, bet sizing, user strategy, settlement timing, and the chosen reserve floor. The current evidence supports “no modeled negative balance under admission,” not “zero economic risk.”

## 4. Token supply evolution

**VERIFIED:** Current genesis supply is 100,000 PPL, with a 900,000 PPL mining allocation and a 1,000,000 PPL maximum supply. Only the game can mint loss-mining rewards, and the current cap checks cover cumulative mining and total supply.

**SIMULATED:** A deterministic 60,000 native-loss exhaustion event crosses all tiers safely:

| State | Mining allocation consumed | Total supply |
|---|---:|---:|
| Before mining | 0 | 100,000 |
| After exhaustion | 900,000 | 1,000,000 |

**SIMULATED:** In 100,000 post-mining canonical games, minted PPL remained 900,000 and total supply, ignoring user burns, remained 1,000,000. AMM-held PPL declined from 90,000 to approximately 25,332.12 as post-mining buybacks acquired tokens; acquired tokens were not automatically burned in that player-buyback path.

Therefore:

- **EMISSION PHASE:** net supply is inflationary until the mining allocation is exhausted, subject to the hard cap.
- **POST-MINING PHASE:** no additional loss-mining minting occurs; supply is approximately neutral in the player buyback path and decreases only through actual user burns or the separate owner buyback-and-burn operation.
- Calling the whole lifecycle “deflationary” would be inaccurate without qualifying the emission phase and the non-burning player buyback.

## 5. Intentional-loss economics

**SIMULATED / MODEL-DEPENDENT:** Initial AMM state was 50 native / 90,000 PPL. The player loses native funds, receives PPL at the active mining tier, and immediately sells all received PPL. Results:

| Gross loss | PPL received | Native recovered | Recovery ratio | Net P/L |
|---:|---:|---:|---:|---:|
| 0.02 | 1 | 0.00052777 | 2.6389% | -0.01947223 |
| 1 | 50 | 0.02637497 | 2.6375% | -0.97362503 |
| 10 | 500 | 0.26250345 | 2.6250% | -9.73749655 |
| 100 | 5,000 | 2.50659630 | 2.5066% | -97.49340370 |

One-PPL immediate-sale recovery by mining tier was approximately 2.64%, 1.76%, 1.32%, 1.06%, 0.88%, 0.75%, 0.66%, 0.59%, and 0.53% for tiers 1 through 9 respectively. The modeled loop is strictly loss-making in this tested reserve state.

**SIMULATED:** Splitting the same realized loss across multiple accounts does not increase total issuance in the model; issuance is based on aggregate loss and the global tier allocation. Splitting may affect who receives the tokens, but no Sybil bypass of the global mining cap was identified.

**NOT TESTED:** This does not prove that every possible externally manipulated AMM price state is loss-making. The AMM spot price is manipulable and should not be treated as a stable market valuation.

## 6. Hold-instead-of-sell break-even values

**MODEL-DEPENDENT:** For one PPL received at each tier, the nominal break-even native value before sale fees and price impact is the tier’s loss-per-token price: 0.02, 0.03, …, 0.10 native per PPL. If the holder later sells through the 5% token-side fee with no additional price impact, the required quoted value is approximately tier price / 0.95: 0.02105 through 0.10526 native per PPL.

These are break-even values, not forecasts. The player has already paid the original gambling loss and bears market depth, slippage, and timing risk. PPL rewards should not be represented as recovery of the loss.

## 7. Post-mining and 70/30 accounting

**VERIFIED / TESTED:** Existing regression coverage and the current formula show that post-mining buyback debits the 70% buyback amount from house funds and adds only that real amount to AMM native reserves. The retained 30% is not double-added. The prior double-counting defect remains fixed.

**SIMULATED:** After 100,000 post-mining canonical games, buyback native allocated in the model was approximately 127.6401, while PPL reserves declined and total supply stayed at the cap absent burns. This is a reserve transfer, not free value creation.

**MODEL-DEPENDENT:** Long-run post-mining house behavior is expected to retain positive game EV under canonical probabilities, but buybacks consume house liquidity. A lower house reserve can cause admission rejections before it creates an accounting insolvency.

## 8. AMM and liquidity shocks

**SIMULATED:** Starting spot was 50 / 90,000 = 0.00055556 native per PPL. Selected outputs:

| AMM depth | Sell 1% PPL reserve | Sell 25% PPL reserve | Buy 10 native | Buy 25 native |
|---|---:|---:|---:|---:|
| Full | 0.47053 native | 9.59596 native | 14,369.75 PPL | rejected by impact cap |
| 50% | 0.23526 native | 4.79798 native | 12,391.30 PPL | rejected by impact cap |
| 25% | 0.11763 native | 2.39899 native | rejected by impact cap | rejected by impact cap |

The 30% impact cap rejects increasingly large buys as liquidity becomes shallow. Sells remain executable in this formula model but produce materially worse realized value. This is a liquidity/market-quality risk, not a proven solvency break.

**OPEN MEDIUM / VERIFIED:** Internal spot price remains manipulable. Protocol buyback behavior uses the AMM state directly, so public predictable buybacks may be exposed to MEV and adverse execution. No deterministic profitable sandwich was found in the tested grid below, but this remains an open risk rather than a safety guarantee.

## 9. Buyback sandwich model

**SIMULATED:** For a 0.70-native protocol buyback following a 1-native post-mining loss, an attacker grid from 0.01 through 100 native was tested against the current AMM formulas. The best candidate was a 0.01-native pre-buy, which returned approximately 0.00927948 native on unwind, for a net **-0.00072052 native** before gas.

This is evidence against the simple tested strategy in the initial reserve state only. It does not cover all liquidity depths, timing, back-running, multiple attacker legs, or future reserve states.

## 10. Economic loop search

**TESTED / SIMULATED:** The following deterministic loops were modeled:

1. native loss → PPL emission → immediate AMM sale → repeat;
2. native buy → PPL reserve manipulation → protocol buyback → unwind;
3. repeated alternating AMM buy/sell cycles;
4. tier-crossing losses and immediate sales;
5. post-mining loss → player buyback token receipt → sale.

**RESULT:** No deterministic positive-value loop was found in the tested states. This is not a statement that ordinary trading cannot make or lose money, and it is not a proof against all MEV strategies.

## 11. Mining exhaustion transition

**TESTED:** The transition from the final mining allocation into post-mining handling was exercised across the exhaustion boundary. Cumulative mining stopped at 900,000 PPL; the post-mining branch used buyback accounting and did not reopen minting.

**RESULT:** No discontinuous double-counting opportunity was observed. The economic discontinuity is intentional: reward form changes from minted PPL to AMM-acquired PPL, and the player-buyback path does not itself reduce total supply.

## 12. Solvency and reserve floor

**VERIFIED / TESTED:** Existing accounting reconciliation and invariant suites establish that protected liabilities remain backed in tested local sequences and accepted games cannot exceed available bankroll. Emergency withdrawal protects pending-game and reserve/liability categories under the tested conditions.

**SIMULATED:** In the canonical runs, minimum free house stayed positive. In the clustered maximum-winner case it reached approximately 11.3087 native after one accepted game. No explicit percentage reserve floor exists; the safety mechanism is maximum-liability admission.

**OWNER DECISION REQUIRED:** A reserve floor or circuit breaker could improve availability and reduce tail risk, but choosing its percentage is a product/risk parameter. No parameter was changed.

## 13. Behavioral and responsible-gaming risks

**BEHAVIORAL / PRODUCT SAFETY RISK:** Loss-based rewards can encourage deliberate loss farming, chasing losses, and continued play under the belief that PPL softens losses. This is not a contract exploit, and the simulations show immediate loss-to-sale is materially negative, but the incentive remains behaviorally relevant.

Current copy requiring review includes wording such as “Your losses turn into PPL which has real value” in `app/how-to-play/page.tsx`. The same page also contains a useful caveat that loss-mining does not make losing profitable. The stronger “valuable” framing can still be misleading if users interpret it as recovery or investment return.

**REQUIRED BEFORE PUBLIC LAUNCH — EXTERNAL / PRODUCT:**

- clear RTP, probability, multiplier, and house-edge disclosure;
- clear statement that PPL rewards are not reimbursement of gambling losses;
- age, jurisdiction, and access controls as determined by specialist review;
- responsible-gaming messaging and a path to support;
- specialist legal/compliance review for wagering, token transferability, AML/KYC, custody, and geographic restrictions.

**RECOMMENDED:** voluntary deposit/loss/session limits, cooling-off periods, and self-exclusion. Do not use loss rewards as engagement or “recovery” messaging.

## 14. Explicit economic safety conditions

The following conditions are supported by current evidence:

| Condition | Status | Evidence |
|---|---|---|
| No tested deterministic positive loss-mining cycle | **TESTED / MODEL-DEPENDENT** | Immediate sell and loop simulation |
| Mining emissions never exceed 900,000 allocation | **VERIFIED / TESTED** | Contract cap tests and exhaustion model |
| Total supply never exceeds 1,000,000 | **VERIFIED / TESTED** | Contract invariants and supply simulation |
| Protected liabilities remain backed | **VERIFIED / TESTED** | Reconciliation and stateful invariant suites |
| Accepted games do not overcommit tested bankroll | **VERIFIED / TESTED** | Maximum-liability admission and stress tests |
| Post-mining 70/30 accounting reconciles | **VERIFIED / TESTED** | Regression test for prior double count |
| AMM spot manipulation cannot create a tested profitable loop | **TESTED / MODEL-DEPENDENT** | Bounded loop/sandwich grids only |
| Canonical game EV is positive for the house | **VERIFIED / TESTED** | Independent RTP range 90.0415%–90.4849% |
| Post-mining has no remaining mint path | **VERIFIED / TESTED** | Mining cap and post-mining simulation |

## 15. Limitations and open risks

- **MODEL-DEPENDENT:** Monte Carlo uses immediate serial settlement and does not forecast real player arrival or strategy.
- **NOT TESTED:** Full adversarial MEV search over every possible same-block transaction ordering and reserve state.
- **OPEN MEDIUM:** VRF requests can remain pending indefinitely; no safe expiry/refund path is currently implemented.
- **OPEN MEDIUM:** Reorg-aware indexing is deferred; bounded history is the current operational approach.
- **OPEN MEDIUM:** AMM spot pricing is manipulable and player/protocol execution has no external price oracle.
- **EXTERNAL:** public launch requires legal/compliance and responsible-gaming review.

No contract, tokenomic, RTP, fee, burn, mining, reserve, or MAX_BALLS parameter was changed for this analysis.

## Current owner-approved update

The preceding report was produced before the approved policy change and
describes the former 0% player-buyback burn. Current implementation is now
30% purchased-PPL burn / 70% player after the unchanged native 70% buyback /
30% retained split. Current post-change results are in
`POST_MINING_BURN_POLICY_SIMULATION.md` and the focused contract
characterization script.
