# Whitepaper-to-Implementation Consistency Audit

**Date:** 2026-09-19
**Scope:** diagnostic comparison only. The canonical whitepaper and implementation were not modified.
**Source-of-truth order:** current source code > executable tests > audit/simulation documents > whitepaper.

## Finding summary

The classifications below are non-exclusive where a stale statement is both unsupported and a missing disclosure.

| Category | Count |
|---|---:|
| Critical documentation errors | 0 |
| Major outdated claims | 7 |
| Minor outdated claims | 4 |
| Ambiguous statements | 5 |
| Unsupported claims called out | 3 |
| Missing disclosures | 8 |

## Canonical document

**VERIFIED:** The canonical whitepaper is the rendered application document at [`app/whitepaper/page.tsx`](app/whitepaper/page.tsx). No separate tracked `WHITEPAPER.md`, `whitepaper.md`, or `docs/*whitepaper*` document exists. The three files under `components/whitepaper/` are chart components, not alternate whitepaper versions. Generated `.next` copies are build artifacts and are not canonical.

## Current implementation parameter master table

Values below were checked against current Solidity, executable tests, the RTP script, and the current audit records. “Not stated” means the whitepaper does not disclose the value, not that the value is absent from the protocol.

| Parameter | Current implementation | Whitepaper comparison | Status / evidence |
|---|---:|---|---|
| Maximum supply | 1,000,000 PPL | 1,000,000 PPL | **CORRECT** — `contracts/PolyPlinkoToken.sol:20` |
| Initial/genesis mint | 100,000 PPL: 10,000 developer + 90,000 game allocation | 10,000 + 90,000 + 900,000 allocation breakdown | **CORRECT with terminology caveat** — `PolyPlinkoToken.sol:34-39,56-62`; the 900,000 is future mining capacity, not genesis supply |
| Developer allocation | 10,000 PPL, minted to constructor `_devAddress` | 10,000 PPL / 1% | **CORRECT amount; recipient wording incomplete** — `PolyPlinkoToken.sol:13,38`; deployment supplies the deployer as dev address |
| Claimed developer seed capital | No fixed 1,000 MATIC allocation is created by the contracts or deployment script | “Granted for seeding initial capital (1,000 MATIC)” | **MAJOR OUTDATED CLAIM** — `app/whitepaper/page.tsx:377-378`, `scripts/deploy.ts` |
| Mining allocation | 900,000 PPL, capped by `totalMintedFromMining` | 900,000 PPL / 90% | **CORRECT** — `PolyPlinkoGame.sol:114-118`, `PolyPlinkoToken.sol:23` |
| Mining tiers | 9 tiers × 100,000 PPL | 9 tiers × 100,000 PPL | **CORRECT** — `PolyPlinkoGame.sol:114-118`, tests |
| Loss cost per PPL | 0.02, 0.03, …, 0.10 native units per PPL | Same values | **CORRECT** — `PRICE_BASE`, `PRICE_STEP`, `_mintLossMiningTokens` |
| Loss basis | `netLoss = 99% of total bet - payout` when positive | Net-loss formula shown | **AMBIGUOUS / MISSING 1% ordering** — `PolyPlinkoGame.sol:432-433,520-536`; whitepaper does not explain the developer-fee deduction before loss mining |
| RTP | 90.03%–90.48% across rows 8–32 and risk levels | Approximately 90% / approximately 10% house edge | **CORRECT as approximation; incomplete range** — current `economics:rtp` output is 9003–9048 bps |
| Native post-mining split | 70% of positive net loss buys PPL; 30% remains in house accounting | Current whitepaper explicitly says 70/30 | **CORRECT** — `BUYBACK_PERCENT=70`, `_buybackToPlayer` |
| Purchased-PPL post-mining split | 30% real `_burn`; 70% player | Current whitepaper explicitly says 30% / 70% | **CORRECT** — `POST_MINING_BURN_BPS=3000`; `PolyPlinkoGame.sol:831-837`; regression tests |
| User swap fee | 5% input fee; MATIC fee to `vaultMatic`, PPL fee burned | 5% input fee and same directions | **CORRECT** — `SWAP_FEE_PERCENT=5`, swap functions |
| Post-mining/owner/vault burns | Automatic player-buyback burn, threshold auto buyback/burn, owner `buybackAndBurn`, and PPL→native 5% fee burn | Swap and vault buyback/burn described; automatic player-buyback burn now described | **PARTIAL / MISSING OWNER CONTROL DISCLOSURE** — source functions and `totalTokensBurned` |
| Maximum game liability | 5% of current free house bankroll, plus absolute solvency check | Not stated | **MISSING DISCLOSURE** — `MAX_GAME_LIABILITY_BPS=500`, `playPlinko` |
| Free bankroll | `max(houseBankroll - lockedBankroll, 0)`; protected reserves/liabilities are separate | Not stated | **MISSING DISCLOSURE** — `_freeHouseBankroll`, `getAvailableBankroll`, tests |
| Maximum balls | 256 | “Up to 1,000” | **MAJOR OUTDATED CLAIM** — `GameConfig.balls`, `playPlinko`, `PolyPlinkoGame.sol:42`; whitepaper `page.tsx:313` |
| Rows/risk | Rows 8–32; Low/Medium/High | Up to 32 rows; 3 risk settings | **CORRECT** |
| Callback gas limit | Deployment default 2,000,000; current measured local worst branch recorded as ~1,450,714 gas | Not stated | **MISSING DISCLOSURE**; production Chainlink execution remains untested |
| AMM impact/input controls | PPL/native swap impact limited to 30% of relevant reserve; native input max 100; minimum liquidity 1 native unit | Not stated | **MISSING DISCLOSURE** — `MAX_SWAP_SIZE`, `MIN_LIQUIDITY`, swap checks |
| VRF source | Chainlink VRF v2.5 interface outside local mode; local/mock execution exists; coordinator callback authenticated | “Chainlink VRF” / “deployed on Polygon PoS” | **PARTIAL / UNSUPPORTED DEPLOYMENT CLAIM** — `PolyPlinkoGame.sol`, `scripts/deploy.ts`, local mock tests; no public deployment performed |

## Findings

### Major outdated claims

| ID | Whitepaper section / claim | Current implementation and evidence | Classification | Recommended correction |
|---|---|---|---|---|
| W-01 | Header/Abstract: “deployed on Polygon PoS” | No public-chain deployment has occurred. The repository has local/mock execution and guarded deployment tooling only. | **MAJOR OUTDATED CLAIM** | Say “designed for Polygon PoS” or identify a verified deployment only after one exists. |
| W-02 | Game Mechanics: “Up to 1,000 Balls per Play” | Contract admission is `balls >= 1 && balls <= 256`. | **MAJOR OUTDATED CLAIM** | Change to 256, and avoid implying that all configurations have the same practical gas margin. |
| W-03 | Tokenomics/Economic Intuition: “Deflationary, Not Inflationary”; hard cap described as having “no possibility of additional minting” | The system mints during the emission phase, up to 900,000 mining PPL. It becomes non-minting only after mining exhaustion; burns can then reduce `totalSupply`. | **MAJOR OUTDATED / MISLEADING CLAIM** | Describe a capped emission phase followed by a post-mining phase with possible supply reduction. “Maximum supply” is more accurate than “fixed supply.” |
| W-04 | Allocation: developer’s 10,000 PPL “granted for seeding initial capital (1,000 MATIC)” | The token contract mints 10,000 PPL to `_devAddress`; neither the contract nor `scripts/deploy.ts` grants or fixes 1,000 MATIC. | **MAJOR OUTDATED CLAIM** | Remove the 1,000 MATIC assertion and state the exact recipient/configuration source. |
| W-05 | Abstract/Overview: “all game outcomes are driven by verifiable, on-chain randomness” and “provably fair guarantee” | Paid production is intended to use Chainlink VRF and authenticated callbacks. Local tests use a mock/local path; no real Chainlink callback or public deployment has been validated. A request can also remain pending indefinitely if fulfillment never arrives. | **UNSUPPORTED CLAIM / MISSING LIMITATION** | Separate local/mock verification from production-intended VRF and disclose the pending-request liveness limitation. |
| W-06 | House allocation: retained funds “ensure the protocol can always pay winners” | The 5% admission rule and locked-liability accounting reduce insolvency risk but cannot guarantee payment under all finite-bankroll, liveness, operational, or external conditions. | **UNSUPPORTED CLAIM** | Say the reserve is intended to support variance and protected liabilities; do not promise “always.” |
| W-07 | “Continuous market demand for PPL as long as the game is played and losses occur” | Automatic buyback requires available AMM liquidity and is subject to reserve/liquidity guards; mining-phase losses mint PPL rather than buying it. | **UNSUPPORTED / OVERBROAD CLAIM** | Qualify demand as conditional on post-mining state, liquidity, and successful buyback execution. |

### Minor outdated claims

| ID | Whitepaper statement | Finding | Recommended correction |
|---|---|---|---|
| W-08 | “Total fixed supply” / “fixed supply” | Current `totalSupply` is initially 100,000, can rise through capped mining, and can later fall through burns. The 1,000,000 value is a maximum cap, not a permanently fixed circulating supply. | Use “maximum supply cap: 1,000,000 PPL.” |
| W-09 | House edge shown as exactly “~10%” | Executable values vary from 9.52% to 9.97% depending on rows/risk because RTP is 90.03%–90.48%. | Keep the approximation but add the verified range and configuration dependence. |
| W-10 | Initial “vault & liquidity” allocation is described as initial swap liquidity and protocol reserves | 90,000 PPL is minted to the game contract, but the amount actually seeded into `reserveToken` is an initialization argument. | State that 90,000 PPL is the game allocation and identify the actual seed amount per deployment. |
| W-11 | Post-mining text says purchased tokens are redistributed “70% or retained by the house (30% + swap fees)” | Current behavior is more precise: 30% is burned and 70% is sent to the player; the native 30% is retained in house accounting. | Explicitly state both dimensions every time the percentages are used. |

### Ambiguous statements

| ID | Location / phrase | Why it is ambiguous | Recommended correction |
|---|---|---|---|
| W-12 | “Vault & Swap System holds MATIC and PPL reserves” | The implementation has `reserveMatic`/`reserveToken`, `vaultMatic`, `houseBankroll`, locked liabilities, and pending claims as distinct accounting buckets inside the game contract; there is no separate vault contract. | Define each bucket and avoid calling all contract-held assets “vault reserves.” |
| W-13 | “Losses generate/buy back PPL for the player” | During mining PPL is minted; after mining, PPL is bought, 30% burned, and 70% transferred. The player does not receive the full buyback amount. | State the phase and exact custody split. |
| W-14 | “Buyback & burn from the vault” is described as a periodic operation | The implementation has an owner-triggered `buybackAndBurn` and an automatic threshold-triggered path, plus the separate post-mining player path. | Identify automatic versus owner-triggered paths and their fund source. |
| W-15 | “Verifiable on-chain source (Chainlink VRF)” without local/production qualifier | This is accurate as intended production architecture but can be read as a currently deployed/validated guarantee. | Label local mock behavior and production dependency separately. |
| W-16 | “Long-term protocol participation” and “soften the impact of loss” | PPL rewards have variable value, can be sold at AMM slippage, and do not reimburse the wager. The wording is not an explicit guarantee but may overstate practical recovery. | Add a clear statement that rewards do not recover or reimburse losses. |

### Missing disclosures

| ID | Missing current mechanic/risk | Evidence | Recommended correction |
|---|---|---|---|
| W-17 | 1% pull-based developer fee | `devFee = totalBet / 100`; accrued in `devFeesAccrued`, withdrawn later by `devAddress`; it is deducted before net-loss calculation. | Add exact fee, rounding/order, and liability treatment. |
| W-18 | 5% dynamic per-game liability cap and concurrent-liability model | `maxPayout <= freeHouseBankroll * 500 / 10000`, with `freeHouseBankroll = max(houseBankroll - lockedBankroll, 0)`. | Add the admission formula and explain that pending games shrink later capacity. |
| W-19 | Max-bet and per-swap bounds | `maxBetTotal` is owner-adjustable with a 1,000 native-unit initial value; swaps have 100 native-unit/max-impact controls. | Add operational bounds and owner configurability where relevant. |
| W-20 | VRF stuck-request liveness | No expiry/refund path exists; a pending game can keep liability reserved until fulfillment. | Add an explicit risk disclosure; do not imply guaranteed settlement. |
| W-21 | AMM spot-price/MEV risk | The internal constant-product AMM has bounded trade impact but no oracle or complete sandwich/MEV protection. | Add a risk disclosure; do not describe the AMM as manipulation-proof or stable. |
| W-22 | Privileged controls | Owner can pause game/swap, withdraw available profits, set dev address/max total bet, perform owner buyback/burn, and emergency withdraw only under protections. | Add a concise admin/trust model and state that no arbitrary PPL mint or mutable 30% burn setter exists. |
| W-23 | No independent external audit / no public deployment | Current evidence is repository-local tests and internal audit documents; no external audit, Amoy validation, or mainnet deployment has occurred. | Add status labels: locally tested, simulated, not externally deployed/audited. |
| W-24 | Server trust boundary | Current hardened design uses user wallet signing and no privileged blockchain key on the web server; the server cannot determine paid outcomes. | Add only if the whitepaper intends to describe operational architecture; otherwise keep in technical docs. |

### Correct statements

The following material claims match current implementation, subject to the qualifications above:

- The 1,000,000 PPL value is the maximum supply cap.
- The 10,000 PPL developer allocation, 90,000 PPL game allocation, and 900,000 PPL mining allocation sum to the cap.
- Mining uses nine 100,000-PPL tiers with 0.02–0.10 native-unit loss costs.
- The current native post-mining split is 70% buyback / 30% retained.
- The purchased-PPL post-mining split is 30% real burn / 70% player.
- User PPL→native swaps burn 5% of the input token amount; MATIC→PPL charges a 5% native input fee to the vault bucket.
- The internal swap uses constant-product-style reserve math and slippage/impact checks.
- The game supports rows 8–32 and three risk levels.
- The whitepaper contains no old 80/20 or 20/80 post-mining language. The two 70/30 concepts are explicitly separated in the current file.
- The whitepaper’s disclaimers correctly state that the game is high risk, token value may fall, and profit is not guaranteed.
- Its regulatory section appropriately leaves jurisdictional classification and compliance to the user/specialists rather than declaring universal legality.

## Answers to requested questions

1. **Current tokenomics:** **PARTIAL.** Core allocations, mining tiers, swap fee, and current post-mining split are accurate. The supply-phase wording, 1,000 MATIC seed assertion, and missing 1% fee/order disclosure require correction.
2. **Native 70/30 split:** **YES**, the current whitepaper explicitly describes 70% native buyback and 30% native retained, separately from the PPL split.
3. **30% burn / 70% player:** **YES**, it is explicitly present and matches the fixed Solidity implementation.
4. **1% developer fee:** **NO / MISSING.** The whitepaper does not accurately explain the fee’s exact pull-based accounting or its deduction before net-loss calculation.
5. **5% free-bankroll liability cap:** **NO / MISSING.** It is not disclosed.
6. **Owner allocation/mint authority:** **PARTIAL.** The 10,000 PPL amount is present, but the 1,000 MATIC claim is unsupported and mint-authority/recipient controls are not explained.
7. **Randomness/VRF:** **PARTIAL.** Chainlink VRF is the intended production interface, but the whitepaper overstates current deployment status and omits local/mock and stuck-request limitations.
8. **Security/decentralization/profitability/deflation:** It avoids an explicit profit guarantee, but overstates current deployment/VRF certainty, uses “deflationary, not inflationary” across an emission phase, and implies stronger treasury/payment certainty than evidence supports.
9. **Top 10 corrections:**
   1. Replace “deployed on Polygon PoS” with designed/local-tested status until public deployment exists.
   2. Change maximum balls from 1,000 to 256.
   3. Replace fixed-supply language with maximum-cap plus emission/burn lifecycle language.
   4. Remove the unsupported 1,000 MATIC developer-seed statement.
   5. Add the exact 1% pull-based developer-fee model and net-loss ordering.
   6. Add the 5% current-free-bankroll maximum-liability rule and concurrent-lock behavior.
   7. Separate local/mock VRF from production-intended Chainlink VRF.
   8. Disclose indefinite pending VRF requests/no expiry-refund path.
   9. Disclose AMM spot-price/MEV manipulation risk and the actual trade bounds.
   10. Add the owner/admin control model and state that no arbitrary mint or mutable burn-percentage setter exists.

## Scope and non-actions

- **VERIFIED:** No Solidity files were modified.
- **VERIFIED:** The uncommitted animation files were not modified by this audit.
- **NOT TESTED here:** real Polygon/Chainlink execution, public deployment, external security audit, or legal/compliance classification.
- **OWNER REVIEW REQUIRED:** Resolve the documentation findings before committing a whitepaper update; do not change implementation to match stale text.

## Remediation after whitepaper synchronization

**Date:** 2026-09-19
**Evidence:** Whitepaper update is being prepared in `app/whitepaper/page.tsx`; no Solidity or protocol implementation changes were made.

| Findings | Status | Evidence |
|---|---|---|
| W-01 deployment status | **RESOLVED** | Whitepaper now says designed for Polygon PoS and states that no public deployment is represented. |
| W-02 maximum balls | **RESOLVED** | “Up to 1,000” replaced with the contract-enforced 256-ball maximum. |
| W-03 supply lifecycle wording | **RESOLVED** | Whitepaper now distinguishes 100,000 initial mint, capped 900,000 emission, 1,000,000 maximum cap, and post-mining burns. |
| W-04 unsupported 1,000 MATIC claim | **RESOLVED** | Removed; developer allocation is described as a one-time mint to the configured developer address. |
| W-05 VRF certainty/deployment wording | **PARTIALLY RESOLVED** | Local/mock versus intended Chainlink VRF flow is separated and public validation is disclaimed; real production VRF remains external/not tested. |
| W-06 “always pay winners” | **RESOLVED** | Replaced with protected-liability/variance language that explicitly disclaims guarantees. |
| W-07 continuous PPL demand | **RESOLVED** | Rewritten as conditional on post-mining state, liquidity, guards, and execution. |
| W-08 fixed-supply terminology | **RESOLVED** | Replaced with maximum supply cap and lifecycle terminology. |
| W-09 RTP approximation | **RESOLVED** | Whitepaper now states 90.03%–90.48% RTP and approximately 9.52%–9.97% gross house edge. |
| W-10 game/protocol allocation wording | **RESOLVED** | 90,000 PPL is described as a game/protocol allocation whose AMM seeding is deployment-configured. |
| W-11 two 70/30 splits | **RESOLVED** | Native and purchased-PPL percentages are explicitly separated throughout the relevant sections. |
| W-12–W-16 terminology/phase/AMM ambiguity | **RESOLVED** | Reserve buckets, phase-dependent rewards, burn paths, AMM type, and reward limitations are clarified. |
| W-17 1% developer fee | **RESOLVED** | Pull-based protected liability and pre-net-loss ordering are documented. |
| W-18 5% liability cap/free bankroll | **RESOLVED** | Formula, maximum-payout basis, and concurrent pending-game effect are documented. |
| W-19 max-bet and swap controls | **RESOLVED** | Owner-configurable total-wager ceiling, initial value, swap bound, impact, and liquidity controls are disclosed. |
| W-20 stuck VRF liveness | **RESOLVED** | Pending-without-fulfillment and absent expiry/refund path are disclosed. |
| W-21 AMM/MEV risk | **RESOLVED** | Internal spot-priced AMM, no oracle, bounded impact, and residual MEV exposure are disclosed. |
| W-22 privileged controls | **RESOLVED** | Current owner powers and fixed/no-setter supply/risk controls are summarized. |
| W-23 deployment/external-audit status | **RESOLVED** | Current status callout distinguishes local testing from public deployment and independent external audit. |
| W-24 server trust boundary | **RESOLVED** | User-wallet signing, no intended privileged web-server key, outcome authority, and residual UI/phishing risk are summarized. |

**INTENTIONALLY DEFERRED / EXTERNAL:** real Polygon deployment, real Chainlink VRF validation, independent external contract audit, stuck-VRF recovery implementation, AMM/MEV mitigation, reorg-aware indexing, and legal/compliance review remain outside this documentation change.
