# PolyPlinco Whitepaper-as-Specification Conformance Audit

Date: 2026-09-22
Baseline: `d77081ae73b8e6920179c52c34176ca7b1624a2e`
Scope: diagnostic comparison only. No contracts, tokenomics, whitepaper, or deployment state were changed.

## 1. Executive summary

The canonical whitepaper is substantially consistent with the current contract design after the synchronization at `98776bb`. No Critical code/spec violation was found in the tested supply, mining, fee, treasury-admission, post-mining burn, AMM, or VRF-authentication paths.

It is not a full conformance pass. The main remaining issues are:

- `README.md` still describes the post-mining native buyback as “sent to player” without disclosing that 30% of purchased PPL is burned.
- “Provably Fair Guarantee” and “all outcomes are driven by verifiable on-chain randomness” are technically conditional on the intended production Chainlink flow; real public-chain VRF has not been validated.
- The whitepaper does not specify the minimum wager, one-request/one-word VRF economics, callback gas configuration, or failed-payout claim behavior.
- The whitepaper describes the AMM accurately at a high level but does not make every reserve-impact calculation and fee destination explicit.
- The code comments and token comments contain older “fixed supply” / “vault reserve” terminology that can reintroduce documentation drift, although these are not executable mismatches.

The current code appears to be the intended side for the material owner-approved changes: the 5% liability cap (`aeb5925`) and the 30% post-mining PPL burn (`a41b760`) were deliberate changes with tests and audit evidence. The current README conflict should be corrected on the documentation side. The remaining production-status and specification gaps require clarification, not silent economic changes.

## 2. Canonical whitepaper and source-of-truth order

Canonical whitepaper: [`app/whitepaper/page.tsx`](app/whitepaper/page.tsx).

Other documents found:

- `WHITEPAPER_IMPLEMENTATION_AUDIT.md`: historical diagnostic/remediation report, not the product specification.
- `README.md`, `app/how-to-play/page.tsx`, and `app/layout.tsx`: user-facing or navigation copy, not authoritative protocol specifications.
- `FINAL_PRODUCTION_AUDIT.md`, `ECONOMIC_INVARIANTS.md`, `TOKEN_SUPPLY_SIMULATION.md`, and related audit files: evidence and risk documentation, not the primary product spec.

The audit uses:

1. current source code;
2. executable tests;
3. current audit/simulation evidence;
4. the canonical whitepaper;
5. other documentation for conflict detection only.

## 3. High-priority conflict table

| ID | Whitepaper rule/claim | Actual code or repository behavior | Conflict | Risk | Resolution |
|---|---|---|---|---|---|
| C-01 | Post-mining native 70% buys PPL and purchased PPL is split 30% burn / 70% player. | The whitepaper is correct, but `README.md:213-214` still says 70% of net losses is “automatic PPL buyback sent to player” and 30% is retained, without the PPL burn split. | Documentation conflict outside the canonical whitepaper. | LOW SPEC MISMATCH; real-money clarity issue, not a contract defect. | **WHITEPAPER SHOULD CHANGE** is not appropriate here; **documentation clarification only**: synchronize README with the canonical two-dimensional split. |
| C-02 | “Provably Fair Guarantee” / verifiable on-chain randomness. | Production path is intended to use authenticated Chainlink VRF; local tests use a mock/local coordinator, and no public-chain VRF execution has been validated. | The wording can be read as a currently deployed production guarantee. | MEDIUM SPEC MISMATCH; REAL-MONEY BLOCKER: YES until qualified/validated. | **DOCUMENTATION CLARIFICATION ONLY** plus public-chain validation. No code change required. |
| C-03 | Every paid play uses the stated authenticated randomness model. | `localMode` can use an incrementing local nonce, but deployment tooling forces `localMode=false`; constructor restricts local mode to local chain IDs. | Implementation has a test-only alternate path that the whitepaper only partly describes. | MEDIUM if local mode is exposed publicly; currently guarded. | **DOCUMENTATION CLARIFICATION ONLY** and retain deployment guard. |
| C-04 | Winnings are transferred directly to the player. | Settlement attempts a direct native transfer; failed transfers become `pendingWithdrawals` and require a later player claim. | The claim recovery path is omitted. | MEDIUM operational/spec gap; REAL-MONEY BLOCKER: NO by itself. | **WHITEPAPER SHOULD CHANGE**: disclose deferred claim behavior. |
| C-05 | AMM trades have a 30% reserve-impact limit. | Native-to-PPL checks output token amount against 30% of token reserve; PPL-to-native checks native output against 30% of native reserve, after the 5% token burn. | “Impact” is a compact description, not the exact side-specific check. | LOW wording ambiguity. | **DOCUMENTATION CLARIFICATION ONLY**. |
| C-06 | The 5% swap fee applies on the input side. | MATIC input fee accrues to `vaultMatic`; PPL input fee is burned from the transferred tokens. | The general statement is true, but fee destinations are asymmetric. | LOW disclosure gap. | **DOCUMENTATION CLARIFICATION ONLY**. |
| C-07 | Post-mining losses can create buyback demand. | Buyback requires AMM liquidity and passes reserve/liquidity guards; otherwise the player receives no PPL from that path. | The whitepaper qualifies this in several places but not every occurrence. | MEDIUM economic expectation risk if read unconditionally. | **DOCUMENTATION CLARIFICATION ONLY**. |
| C-08 | The whitepaper documents the game-admission safety rule. | Code enforces both maximum-payout <= free bankroll and maximum-payout <= 5% of free bankroll. | Current canonical whitepaper does state this rule. No mismatch. | INFO. | **CORRECT**. |
| C-09 | 1,000 native-unit total wager ceiling is initialized and owner-configurable. | `maxBetTotal` initializes to 1,000 native units and owner may set it no lower than 100 native units. | The lower bound on future owner changes is not stated. | LOW disclosure gap. | **DOCUMENTATION CLARIFICATION ONLY**. |
| C-10 | 90,000 PPL is the game/protocol allocation and deployment controls AMM seeding. | The token mints 90,000 PPL to the game contract; `seedInitialLiquidityAndBankroll` accepts the actual reserve amount. | The whitepaper is materially correct. | INFO. | **CORRECT**. |

No Critical or High implementation/spec mismatch was established by this pass.

## 4. Specification matrix

Normative levels:

- **MUST** — expected to be enforced by code or an explicit invariant.
- **SHOULD** — intended behavior with implementation latitude.
- **DESCRIPTIVE** — explanatory model, not itself an invariant.
- **RISK/DISCLOSURE** — limitation or caution.
- **STATUS CLAIM** — deployment, testing, or audit status.

Status values are `MATCH`, `PARTIAL`, `MISSING`, `AMBIGUOUS`, or `CONFLICT`.

| ID | Section | Rule | Type / level | Implementation | Test/evidence | Status | Severity | Resolution |
|---|---|---|---|---|---|---|---|---|
| WP-001 | Header/Abstract | Protocol is designed for Polygon PoS; no public deployment is represented. | STATUS CLAIM | `app/whitepaper/page.tsx`; deployment guards | `FINAL_PRODUCTION_AUDIT.md` | MATCH | INFO | DOCUMENTATION CLARIFICATION ONLY |
| WP-002 | Abstract | Game has a mathematical edge and players can lose money. | RISK/DESCRIPTIVE | Multiplier/RTP calculation | `scripts/rtp-report.ts` | MATCH | INFO | CORRECT |
| WP-003 | Abstract | Losses can interact with capped mining or post-mining buyback. | ECONOMIC / SHOULD | `_handleLossReward` | contract tests, economic simulator | MATCH | INFO | CORRECT |
| WP-004 | Abstract | Token rewards do not reimburse gambling losses. | RISK/DISCLOSURE | Token reward flow | UI/whitepaper language | MATCH | INFO | CORRECT |
| WP-005 | Vision | Outcomes remain random and risky; no guarantee of profit. | RISK/DISCLOSURE | VRF settlement and payout math | RTP/economic reports | MATCH | INFO | CORRECT |
| WP-006 | Overview | Game accepts native-asset bets and settles winnings on-chain. | GAME / MUST | `playPlinko`, `_fulfillRandomness` | contract tests | MATCH | INFO | CORRECT, with failed-claim qualification |
| WP-007 | Tokenomics | PPL is an ERC-20 named PolyPlinko Token with symbol PPL. | TOKEN / MUST | `PolyPlinkoToken` | ABI check/tests | MATCH | LOW | CORRECT |
| WP-008 | Tokenomics | Maximum supply cap is 1,000,000 PPL. | TOKEN / MUST | `MAX_SUPPLY` | `VRFAndInvariant.test.ts` | MATCH | INFO | CORRECT |
| WP-009 | Tokenomics | Initial supply is 100,000 PPL. | TOKEN / MUST | 10,000 dev + 90,000 game mint | deployment/tests | MATCH | INFO | CORRECT |
| WP-010 | Tokenomics | Developer allocation is 10,000 PPL, minted once to configured developer address. | TOKEN / MUST | token constructor | `PolyPlinkoToken.sol`, deployment | MATCH | INFO | CORRECT |
| WP-011 | Tokenomics | Game/protocol allocation is 90,000 PPL; actual AMM seed is deployment-configured. | TOKEN / SHOULD | `initializeVaultAllocation`, seed function | deployment tooling | MATCH | INFO | CORRECT |
| WP-012 | Tokenomics | Loss-mining allocation is 900,000 PPL. | TOKEN / MUST | `MINING_ALLOCATION`, `MINING_SUPPLY` | mining invariant tests | MATCH | INFO | CORRECT |
| WP-013 | Tokenomics | Supply can rise during capped mining and fall through burns after exhaustion. | TOKEN / MUST | mint and `_burn` paths | supply/burn tests | MATCH | INFO | CORRECT |
| WP-014 | Tokenomics | Mining cannot mint more than 900,000 PPL and total supply cannot exceed the cap. | TOKEN / MUST | token mint guards | invariant tests | MATCH | HIGH | CORRECT |
| WP-015 | Tokenomics | Mining stops permanently after allocation exhaustion. | TOKEN / MUST | `miningEmitted < MINING_SUPPLY` branch | repeated post-mining test | MATCH | HIGH | CORRECT |
| WP-016 | Tokenomics | Post-mining burn mechanisms may reduce totalSupply; price appreciation is not guaranteed. | TOKEN / RISK | `burnFrom`, swap/vault/player burns | burn tests/economic reports | MATCH | INFO | CORRECT |
| WP-017 | Mechanics | Supported rows are 8 through 32. | GAME / MUST | `playPlinko` validation | RTP/contract tests | MATCH | LOW | CORRECT |
| WP-018 | Mechanics | Three risk settings are supported. | GAME / MUST | `RiskLevel {Low,Medium,High}` | RTP tests | MATCH | LOW | CORRECT |
| WP-019 | Mechanics | Maximum balls per play are 256. | GAME / MUST | `config.balls <= 256` | gas/invariant tests | MATCH | MEDIUM | CORRECT |
| WP-020 | Mechanics | Randomness is intended to use authenticated Chainlink VRF v2.5-style production flow. | VRF / STATUS | coordinator callback and deployment config | local mock tests; no public validation | PARTIAL | MEDIUM | DOCUMENTATION CLARIFICATION ONLY |
| WP-021 | Mechanics | Local development/tests use a mock coordinator and are not production validation. | VRF / STATUS | `LocalVRFCoordinatorV2PlusMock` | contract tests | MATCH | INFO | CORRECT |
| WP-022 | Mechanics | Random seed is stored on-chain after fulfillment. | VRF / MUST | `game.randomSeed = randomness` | VRF lifecycle tests | MATCH | LOW | CORRECT |
| WP-023 | Mechanics | Ball slots are derived deterministically from seed, game ID, and ball index using binomial weights. | GAME / MUST | `_getSlotForBall` | payout tests/RTP script | MATCH | MEDIUM | CORRECT |
| WP-024 | Mechanics | Paid result is authoritative on-chain rather than determined by animation. | SECURITY / MUST | settlement state and frontend separation | browser/trajectory tests | MATCH | HIGH | CORRECT |
| WP-025 | Mechanics | “Provably Fair Guarantee” describes recomputability from authenticated coordinator response. | VRF / RISK | authenticated callback path | local tests only | PARTIAL | MEDIUM | DOCUMENTATION CLARIFICATION ONLY |
| WP-026 | Mechanics | A missing external fulfillment can leave a game pending and reserved. | VRF / RISK | no timeout/refund function | audit report | MATCH | MEDIUM | CORRECT |
| WP-027 | Treasury | Each wager accrues a 1% developer fee as protected pull liability. | TREASURY / MUST | `totalBet / 100`, `devFeesAccrued` | developer-fee test | MATCH | HIGH | CORRECT |
| WP-028 | Treasury | Fee is not pushed during game creation and is withdrawn separately. | TREASURY / MUST | `withdrawDevFees` | fee tests | MATCH | MEDIUM | CORRECT |
| WP-029 | Treasury | Net loss is `max(99% of total wager - payout, 0)`. | ECONOMIC / MUST | settlement netBet/netLoss | contract tests | MATCH | HIGH | CORRECT |
| WP-030 | Treasury | Free bankroll is `max(houseBankroll - lockedBankroll, 0)`. | TREASURY / MUST | `_freeHouseBankroll` | reconciliation/stress tests | MATCH | HIGH | CORRECT |
| WP-031 | Treasury | New maximum payout must fit free bankroll. | TREASURY / MUST | admission check | liability tests | MATCH | HIGH | CORRECT |
| WP-032 | Treasury | New maximum payout must also be <= 5% of current free bankroll. | TREASURY / MUST | `MAX_GAME_LIABILITY_BPS=500` | boundary/concurrency tests | MATCH | HIGH | CORRECT |
| WP-033 | Treasury | Existing pending games reduce later capacity through locked liabilities. | TREASURY / MUST | `lockedBankroll` | concurrency tests | MATCH | HIGH | CORRECT |
| WP-034 | Treasury | Total-wager ceiling starts at 1,000 native units and is owner-configurable. | TREASURY / SHOULD | `maxBetTotal`, `setMaxBetTotal` | source/test evidence | MATCH | LOW | DOCUMENTATION CLARIFICATION ONLY |
| WP-035 | Treasury | Swaps are separately bounded by input/value, liquidity, and impact controls. | AMM / MUST | `MAX_SWAP_SIZE`, `MIN_LIQUIDITY`, 30% checks | AMM tests | PARTIAL | LOW | DOCUMENTATION CLARIFICATION ONLY |
| WP-036 | Mining | Mining is proportional to realized positive net loss, not staking/pre-sale allocation. | ECONOMIC / DESCRIPTIVE | `_mintLossMiningTokens` | mining tests/simulator | MATCH | INFO | CORRECT |
| WP-037 | Mining | Nine tiers of 100,000 PPL use costs 0.02 through 0.10 native units/PPL. | TOKEN / MUST | tier constants | tier source/tests | MATCH | HIGH | CORRECT |
| WP-038 | Mining | Partial losses can cross tiers and only available allocation is minted. | TOKEN / MUST | loop and tier remainder arithmetic | invariant/stress scripts | MATCH | HIGH | CORRECT |
| WP-039 | Mining | Mining stops permanently at 900,000 emitted. | TOKEN / MUST | exhaustion branch | repeated post-mining test | MATCH | HIGH | CORRECT |
| WP-040 | Mining | Rewards do not make losing profitable or reimburse the wager. | RISK/DISCLOSURE | economics and token flow | policy simulation | MATCH | INFO | CORRECT |
| WP-041 | Post-mining | 70% of applicable positive net loss buys PPL from the internal AMM. | TOKEN/ECONOMIC / MUST | `BUYBACK_PERCENT=70` | post-mining invariant test | MATCH | HIGH | CORRECT |
| WP-042 | Post-mining | 30% of purchased PPL is permanently burned and 70% sent to player. | TOKEN / MUST | `POST_MINING_BURN_BPS=3000`; `burnFrom` | burn invariant tests | MATCH | CRITICAL | CORRECT |
| WP-043 | Post-mining | Remaining 30% of applicable native loss is retained in house accounting. | TREASURY / MUST | house bankroll decreases only by buyback amount | accounting test | MATCH | HIGH | CORRECT |
| WP-044 | Post-mining | Buyback is conditional on liquidity and protocol guards. | ECONOMIC / SHOULD | reserve and liquidity early returns/checks | audit/simulation | MATCH | MEDIUM | CORRECT |
| WP-045 | AMM | Internal AMM uses native/PPL reserves and constant-product-style pricing. | AMM / MUST | reserve formulas | AMM tests | MATCH | HIGH | CORRECT |
| WP-046 | AMM | User swaps charge 5% input-side fee. | AMM / MUST | `SWAP_FEE_PERCENT=5` | swap tests | MATCH | HIGH | CORRECT, fee destination is side-specific |
| WP-047 | AMM | MATIC-input fee goes to vault; PPL-input fee is burned. | AMM / MUST | swap functions | swap burn/fee tests | MATCH | HIGH | CORRECT |
| WP-048 | AMM | Trades require liquidity and have max-size and 30% reserve-impact checks. | AMM / MUST | swap guards | AMM tests/source | PARTIAL | MEDIUM | DOCUMENTATION CLARIFICATION ONLY |
| WP-049 | AMM | No oracle or complete MEV protection; price/liquidity/value are not guaranteed. | AMM / RISK | spot reserve pricing | economic audit | MATCH | MEDIUM | CORRECT |
| WP-050 | AMM | Vault threshold can trigger automatic buyback/burn; owner can call separate buyback/burn. | AMM / ADMIN / SHOULD | `_autoBuybackAndBurn`, `buybackAndBurn` | buyback tests | MATCH | MEDIUM | CORRECT |
| WP-051 | Admin | Owner can pause game and swaps. | ADMIN / MUST | pause functions | contract tests | MATCH | MEDIUM | CORRECT |
| WP-052 | Admin | Owner can withdraw only safely available funds and dev can withdraw accrued fees. | ADMIN/TREASURY / MUST | withdrawal functions | withdrawal tests | PARTIAL | HIGH | Add failed-payout and all-bucket conformance tests |
| WP-053 | Admin | Owner can update dev address and maximum total bet. | ADMIN / MUST | setters | source evidence | MATCH | MEDIUM | CORRECT |
| WP-054 | Admin | Owner has no arbitrary PPL mint authority. | ADMIN/TOKEN / MUST | token mint restricted to immutable game address | owner/mint tests | MATCH | CRITICAL | CORRECT |
| WP-055 | Admin | MAX_SUPPLY, mining allocation, 5% cap, and 30% burn are fixed/no mutable setters. | ADMIN/TOKEN / MUST | constants and guards | invariant tests | MATCH | CRITICAL | CORRECT |
| WP-056 | Trust | Users sign paid transactions with their own wallets; server is not outcome authority. | SECURITY / SHOULD | frontend wallet flow and server architecture | server audit/browser tests | MATCH | HIGH | Correct with phishing/service-risk qualification |
| WP-057 | Status | Local implementation/tests exist; public deployment, real VRF validation, and independent audit do not. | STATUS CLAIM | repository/deployment state | final audit | MATCH | HIGH | CORRECT |
| WP-058 | Risk | Token value is variable and may fall to zero; no profit/price guarantee. | RISK/DISCLOSURE | no price guarantee in code | whitepaper/economic reports | MATCH | INFO | CORRECT |
| WP-059 | Compliance | Regulatory classification is jurisdiction-dependent and not declared universally legal. | DISCLOSURE / RISK | documentation only | external gate | MATCH | HIGH | CORRECT |
| WP-060 | Parameters | No minimum wager, VRF billing policy, exact callback gas setting, or failed-claim timing rule is specified in the whitepaper. | DISCLOSURE | Code has min bet 0.001/ball, 2m default callback, one word/request, pending claims | source/reports | MISSING | MEDIUM | OWNER DECISION REQUIRED for product policy; documentation clarification for mechanics |

## 5. Tokenomics conformance

The lifecycle matches the whitepaper:

1. 10,000 PPL is minted to the configured developer address.
2. 90,000 PPL is minted to the game contract as the game/protocol allocation.
3. Up to 900,000 PPL is minted through loss mining in nine tiers.
4. Mining is globally capped and cannot reopen after exhaustion.
5. Burn paths can reduce `totalSupply` after and during the lifecycle.

The contract’s token comment still calls the supply “FIXED capped supply” and calls the 90,000 allocation “Vault/AMM reserve.” Those comments are weaker than the current whitepaper terminology. They are **INFO documentation drift**, not executable behavior. The allocation is held by the game contract, but deployment chooses the actual `reserveToken` seed amount.

## 6. Game mathematics and fee conformance

The current implementation computes normalized binomial weights, adjusts the final weight so the integer weights sum to 1,000,000, and derives risk-specific multipliers. The current RTP gate covers all 75 row/risk combinations and reports approximately 90.0415%–90.4849% RTP, consistent with the public rounded range of 90.03%–90.48%.

The 1% fee ordering matches the whitepaper’s current formula:

```text
devFee = floor(totalBet / 100)
netBet = totalBet - devFee
netLoss = max(netBet - payout, 0)
```

The whitepaper does not state the contract’s minimum wager of 0.001 native unit per ball, the 10-native-unit per-ball maximum, or the 1,000-native-unit initial total ceiling’s 100-native-unit setter floor. These are specification disclosures, not code contradictions.

## 7. Treasury/accounting conformance

The 5% liability rule is explicitly present and matches the source:

```text
freeHouseBankroll = max(houseBankroll - lockedBankroll, 0)
maxPossiblePayout <= freeHouseBankroll
maxPossiblePayout <= freeHouseBankroll * 500 / 10000
```

The accounting tests also protect AMM native reserve, vault funds, failed-payout claims, and accrued developer fees. The whitepaper says the owner can withdraw safely available funds, but does not enumerate failed-payout claims or the exact emergency-withdraw restrictions. This is a **PARTIAL** rule requiring stronger executable conformance coverage, not evidence of a current theft path.

## 8. AMM conformance

The whitepaper correctly describes an internal reserve-priced AMM rather than an external Uniswap pool. Source confirms:

- MATIC input: 5% to `vaultMatic`, 95% into reserve pricing;
- PPL input: 5% burned, 95% into reserve pricing;
- native swap input is capped at 100 native units;
- minimum liquidity is 1 native/PPL unit;
- output-side reserve-impact checks are 30% of the relevant reserve;
- vault threshold can trigger an automatic buyback/burn;
- owner can trigger a separate vault buyback/burn.

The current whitepaper’s “30% reserve-impact limit” is acceptable shorthand but not an exact formal definition. A future spec should state which output/reserve side is checked.

## 9. VRF and liveness conformance

The request/fulfillment state machine matches the documented intended architecture:

- one request per round;
- one random word requested;
- request ID maps to one game;
- coordinator address is authenticated;
- unknown request IDs and duplicate settlement are rejected;
- local mode is restricted to local chain IDs and deployment tooling sets `localMode=false`.

The whitepaper correctly discloses that a request can remain pending indefinitely. It does not define a timeout or refund policy, because none exists in code. This remains a real-money blocker, but not a code/whitepaper contradiction.

## 10. Admin and trust model

The whitepaper’s current owner-power summary is materially accurate. The owner can pause game/swap activity, withdraw available protocol funds subject to checks, set the developer address, adjust `maxBetTotal`, trigger owner buyback/burn, and trigger emergency shutdown. The owner cannot arbitrarily mint PPL, change `MAX_SUPPLY`, change the mining allocation, change the 5% cap, or change the 30% burn percentage.

The word “provably fair” should remain conditional: the on-chain mapping is deterministic and the callback is authenticated, but unpredictability and availability of a real public VRF provider remain external dependencies.

## 11. Frontend and animation conformance

The whitepaper does not specify the animation as a source of game outcomes. The current frontend keeps paid outcomes authoritative from chain/game state, while the peg-to-peg trajectory is visual-only. The trajectory test covers supported rows/buckets and deterministic path validity. No whitepaper promise is contradicted by the animation implementation.

The broader app metadata and README still use “Provably Fair” and “Polygon” in short marketing titles. These are not canonical whitepaper rules, but they should remain qualified by the whitepaper’s deployment-status and production-VRF wording.

## 12. Documentation conflicts outside the whitepaper

| Location | Conflict | Classification | Resolution |
|---|---|---|---|
| `README.md:1,7` | “Provably Fair … on Polygon” without the whitepaper’s local/tested/no-public-deployment qualification. | AMBIGUOUS / INFO | DOCUMENTATION CLARIFICATION ONLY |
| `README.md:213-214` | Describes 70% buyback as sent to player and 30% retained, omitting the purchased-PPL 30% burn / 70% player split. | LOW SPEC MISMATCH | DOCUMENTATION CLARIFICATION ONLY |
| `app/layout.tsx:9,11` | Short metadata says “Provably Fair … on Polygon PoS” and “deflationary tokenomics” without status qualifiers. | AMBIGUOUS / INFO | DOCUMENTATION CLARIFICATION ONLY |
| `contracts/PolyPlinkoToken.sol:11-15` | “FIXED capped supply” and “Vault/AMM reserve” comments do not reflect the current maximum-cap and configurable-seeding terminology. | INFO | Documentation/comment cleanup later |
| `contracts/PolyPlinkoGame.sol:485` | Comment says callback is “simulated here” even though the same authenticated function is the production callback entry point. | INFO | Documentation/comment cleanup later |
| `app/how-to-play/page.tsx:146-160` | “Provably Fair” presentation remains stronger than the public deployment qualification unless the surrounding qualifier is read. | AMBIGUOUS | Documentation clarification only |

No conflicting 80/20 language was found in current product documentation. Historical audit/changelog files mention the old 80/20 decision as historical evidence; that is not a current specification conflict.

## 13. Executable spec-to-test coverage

| Rule family | Existing coverage | Quality |
|---|---|---|
| MAX_SUPPLY and mining allocation | `VRFAndInvariant.test.ts`, token mint guards | COVERED |
| Genesis allocations | deployment/tests and token constants | PARTIAL — recipient/configuration assertions should be made explicit |
| All mining tiers and exact boundary crossing | tier logic, RTP/economic scripts, repeated post-mining setup | PARTIAL — not every tier boundary is a dedicated contract test |
| 1% developer fee and pull withdrawal | `PolyPlinkoGame.test.ts` | COVERED |
| Fee ordering before loss mining | settlement source and mining tests | PARTIAL — add exact payout/net-loss assertions |
| 5% liability cap boundaries | `VRFAndInvariant.test.ts` | COVERED |
| Concurrent liabilities/out-of-order fulfillment | `VRFAndInvariant.test.ts` | COVERED |
| Maximum payout conservatism for every configuration | RTP/gas and selected tests | PARTIAL — property/fuzz coverage should be expanded |
| Post-mining native 70/30 | `VRFAndInvariant.test.ts` | COVERED |
| Post-mining PPL 30/70 real burn | `VRFAndInvariant.test.ts` | COVERED |
| Swap fee destinations and burns | `PolyPlinkoGame.test.ts` | COVERED |
| Vault auto-burn versus owner burn separation | selected buyback test | PARTIAL |
| AMM reserve/actual token balance reconciliation | audit scripts/tests | PARTIAL |
| Owner withdrawal protection | `PolyPlinkoGame.test.ts`, invariant tests | PARTIAL — all protected buckets should be asserted together |
| VRF request mapping/authentication/replay | `VRFAndInvariant.test.ts` | COVERED |
| VRF liveness/timeout/refund | none because feature does not exist | UNCOVERED / known limitation |
| Pause semantics for games/swaps/claims/fulfillment | pause test exists; full matrix absent | PARTIAL |
| Deployment chain/configuration guards | deployment script/source review | PARTIAL — public chain rehearsal remains pending |
| Frontend chain hard stop and paid-mode disablement | browser regression/config tests | COVERED |
| Animation visual bucket integrity | trajectory checker/browser regression | COVERED |
| Server/API bounds and proxy trust | release audit/scripts | PARTIAL |

## 14. Unenforced or under-specified whitepaper rules

These are not all mismatches. They are rules or disclosures that the current whitepaper either does not define precisely enough or does not have permanent executable coverage for:

1. Minimum wager and minimum total round policy.
2. VRF cost and whether one request/one word is a product invariant.
3. Callback gas limit and worst-case gas margin.
4. Failed payout claim timing and claim semantics.
5. Exact owner withdrawal bucket formula, including failed payouts and vault reserve.
6. Exact side-specific AMM impact calculation.
7. Every mining-tier boundary as a dedicated regression test.
8. Public-chain coordinator/subscription/keyHash validity.
9. Reorg-aware event/indexing behavior.
10. Operational monitoring and pause response.

The implementation does enforce the core economic rules stated in the whitepaper, but the whitepaper should not be treated as a complete deployment runbook or a substitute for those operational controls.

## 15. Future permanent spec tests

Do not add these tests in this audit. Future regression coverage should include:

- compare a structured spec value for `MAX_SUPPLY`, allocations, mining tiers, fee, liability cap, native buyback, PPL burn, swap fee, rows, balls, and risk levels against deployed contract getters/constants;
- exact genesis allocation recipient and amount;
- every mining tier boundary, including partial cross-tier losses and final token;
- exact `devFee`, `netBet`, and `netLoss` values for tiny and ordinary wagers;
- every cap boundary: one wei below, exactly at, and one wei above 5%;
- every valid row/risk/ball combination’s maximum payout is no greater than the locked liability;
- exact post-mining native and purchased-PPL split identities and totalSupply delta;
- separate burn accounting for player buyback, PPL swap, automatic vault, and owner paths;
- actual ERC-20 balance versus AMM reserve reconciliation after alternating swaps;
- all owner withdrawal paths against every protected bucket;
- VRF unknown request, duplicate fulfillment, local-mode guard, and one-request/one-word behavior;
- pause behavior for new games, swaps, fulfillment, claims, and withdrawals;
- frontend chain/config hard stop and authoritative-bucket/display agreement.

## 16. Single source of truth recommendation

Recommend a future non-secret `protocol-spec.json` (or equivalent generated manifest) containing economic and supported-configuration parameters. It should be reviewed as part of an owner-approved protocol change and should not grant runtime authority.

Future checks could:

- compare source-exposed constants and deployment constructor values against the manifest;
- make RTP and economic scripts consume the same structured values;
- generate public parameter tables from the manifest;
- fail CI when a fixed safety constant or supported range drifts without a deliberate spec update.

Do not make the whitepaper parse Solidity source text directly. The manifest should be a reviewed, non-secret specification artifact with explicit versioning.

## 17. Owner decisions required

1. Whether the exact minimum wager should become a formal product specification, especially after live VRF billing is known.
2. Whether “Provably Fair Guarantee” should remain as a qualified phrase or be replaced with narrower wording before public-chain validation.
3. Whether one-request/one-word VRF behavior and callback gas margin should be formalized as whitepaper rules.
4. Whether failed payout claims and owner-protected bucket formulas should be added to the public specification.
5. Whether AMM side-specific impact checks should be documented in exact technical form.
6. Whether README/metadata/comment drift should be cleaned in a separate documentation-only change.

## 18. Final classifications

| Classification | Count / status |
|---|---:|
| Extracted atomic rules | 60 |
| Exact matches | 48 |
| Partial matches | 6 |
| Missing/under-specified | 6 |
| Non-match conformance gaps | 0 Critical; 0 High code-behavior mismatches; 9 Medium; 3 Low |
| Documentation-only conflicts outside canonical whitepaper | 6 locations |
| Real-money blockers caused by spec/status gaps | Production VRF validation, VRF liveness, external audit, legal/compliance, AMM risk acceptance, and reorg/indexing policy; not a proven direct code/spec theft path |

## 19. Answers to required questions

1. **Is current code fully compliant with the current whitepaper?** No. Core economic behavior conforms, but status/VRF qualification, failed-payout disclosure, and several operational details are partial or under-specified.
2. **Which whitepaper economic rules are not enforced?** No confirmed core economic rule is violated. The minimum-wager/VRF-cost policy is not specified, and exact AMM impact wording is not formalized.
3. **Which code behaviors are not disclosed?** Failed payout claims, one VRF word/request, callback gas configuration, exact minimum/per-ball maximum wager, owner setter floor for `maxBetTotal`, and exact protected withdrawal buckets.
4. **Are owner/admin powers stronger than suggested?** Not materially relative to the current status section. Owner can pause, withdraw safe funds, change dev address/max total bet, and operate buyback/burn; fixed cap/burn/mint restrictions remain.
5. **Are fees, burns, payouts, limits, or treasury rules different?** No confirmed material difference. README has an incomplete post-mining description; AMM fee destinations are asymmetric and deserve explicit wording.
6. **Do tests validate behavior that contradicts the whitepaper?** No direct contradiction was found. Test coverage is incomplete for some whitepaper-adjacent operational claims.
7. **Which mismatches require owner decision?** Minimum-wager policy, formal VRF/production claims, exact public specification scope, and whether to formalize operational disclosures.
8. **Which discrepancies block real-money launch?** The unresolved production VRF validation/liveness, external audit, legal/compliance, AMM risk, and indexing/reorg issues. The documentation conflicts alone do not create a direct insolvency path but should be cleaned before launch.
9. **What tests should be added?** The permanent spec-test list in Section 15.
10. **Should a structured source of truth be created?** Yes, recommend a reviewed versioned `protocol-spec.json`, but do not implement it in this diagnostic pass.

## Non-actions and validation

- No Solidity files were modified.
- No tokenomics, RTP, payout, fee, liability, VRF, or AMM behavior was modified.
- No deployment, funding, or push was performed.
- Current release gates remain the evidence baseline; this audit adds no runtime behavior.
