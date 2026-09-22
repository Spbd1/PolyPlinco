# PolyPlinco Final Pre-Production / Release Audit

Date: 2026-09-22
Audit baseline: `98776bbf98885321685345ba81973e57dd9c2b1b`
Scope: local Hardhat, deterministic simulations, production-like local web/container rehearsal, and source/documentation inspection. No public-chain deployment, funding, push, or mainnet transaction was performed.

## Decision summary

**Not production-ready for real-money launch.** The frozen contract path passed the local regression gate and the admission rule rejects an accepted game whose maximum legal payout exceeds either free bankroll or 5% of current free bankroll. A compromised web server has no blockchain signing key in the intended architecture. The remaining blockers are system/external: real Chainlink VRF validation and stuck-request recovery, public-chain deployment verification, AMM/MEV risk acceptance, reorg-aware indexing, independent external contract/economic review, and specialist legal/compliance review.

## Release baseline and ancestry

| Check | Result |
|---|---|
| Current branch | `main` |
| Baseline HEAD at audit start | `98776bbf98885321685345ba81973e57dd9c2b1b` |
| Required historical changes | All eight referenced changes are ancestors of the baseline, including `a41b760`, `aeb5925`, `b31fcfc`, `ac54753`, `26475c7`, `80a3ee7`, and `98776bb` |
| Contract files changed by this audit | No |
| Public deployment/funding | No |

## Current source-of-truth parameters

| Area | Current value | Evidence |
|---|---:|---|
| Token | PolyPlinko Token (`PPL`), 18 decimals | `contracts/PolyPlinkoToken.sol` |
| Maximum supply | 1,000,000 PPL | `MAX_SUPPLY` |
| Genesis mint | 100,000 PPL | 10,000 dev + 90,000 game allocation |
| Mining allocation | 900,000 PPL | `MINING_ALLOCATION`, `MINING_SUPPLY` |
| Mining tiers | 9 × 100,000 PPL | `NUM_TIERS`, `TOKENS_PER_TIER` |
| Loss price | 0.02, 0.03, …, 0.10 native/PPL | `PRICE_BASE`, `PRICE_STEP` |
| Supported rows | 8–32 | `playPlinko` |
| Supported risks | Low, Medium, High | `RiskLevel` |
| Maximum balls | 256/game | `playPlinko` |
| RTP | 90.0415%–90.4849% in current formula output; public display rounds to ~90.03%–90.48% | `economics:rtp`, contract formula |
| Gross house edge | ~9.5151%–9.9585% | `100% - RTP` |
| Developer fee | `floor(totalBet / 100)`; 1%, accrued pull-based | `playPlinko`, `devFeesAccrued` |
| Native post-mining flow | 70% buyback / 30% retained | `BUYBACK_PERCENT` |
| Purchased PPL post-mining flow | 30% real burn / 70% player | `POST_MINING_BURN_BPS=3000` |
| User swap fee | 5% input fee; native fee to vault, PPL input fee burned | `SWAP_FEE_PERCENT` |
| New-game liability cap | 500 BPS / 10,000 = 5% of current free house bankroll | `MAX_GAME_LIABILITY_BPS` |
| Free bankroll | `max(houseBankroll - lockedBankroll, 0)` | `_freeHouseBankroll` |
| Swap minimum liquidity | 1 native/PPL unit | `MIN_LIQUIDITY` |
| Swap max | 100 native units or reserve-impact guard | `MAX_SWAP_SIZE`, 30% reserve check |
| VRF callback gas limit | 2,000,000 default | `scripts/deploy.ts` |
| VRF words/request | 1 | `_requestRandomness` |

## Contract and economic answers

### Plinko math and solvency

All 75 supported row/risk combinations (25 row counts × 3 risks) were exercised by the current RTP gate. Weight sums are normalized to 1,000,000; multipliers are integer-scaled; no tested configuration had positive player EV. The 1% fee is deducted before `netBet`, and the settlement loss basis is `max(99% of total wager - payout, 0)`.

Admission is liability-based, not probability-based:

```text
maxPayout = betPerBall × maximumMultiplier(rows,risk) × balls / 10,000
freeHouseBankroll = max(houseBankroll - lockedBankroll, 0)
accept iff maxPayout <= freeHouseBankroll
         and maxPayout <= freeHouseBankroll × 500 / 10,000
```

`lockedBankroll` increases before a request becomes pending, so later games see less free capacity. The contract tests cover simultaneous requests and out-of-order fulfillment; the deterministic treasury model was extended to 20, 50, and 100 attempted pending games. A malicious player cannot make the tested admission path accept more maximum liability than the available reserve. This is not a guarantee against an untested implementation defect, VRF liveness failure, or owner misuse.

### Native accounting identity

The reconciled protected-native identity is:

```text
accountedNative = houseBankroll
                + reserveMatic
                + vaultMatic
                + totalPendingWithdrawals
                + devFeesAccrued
```

`lockedBankroll` is a subset of `houseBankroll`, not another asset to add. Live local reconciliation after deployment and a smoke game produced zero unclassified surplus both before and after the game. The owner withdrawal paths use free house funds or explicitly protect AMM, vault, failed-payout, and developer-fee liabilities. A compromised owner key can still withdraw free house funds and pause/configure permitted admin settings; this remains a governance risk, not a bypass of locked-liability accounting.

### Token supply and burns

The token begins at 100,000 PPL. The game contract alone can mint loss-mining PPL, and both the 900,000 mining cap and 1,000,000 maximum supply are enforced. After mining exhaustion there is no mining mint path. The automatic post-mining player path burns exactly `floor(purchasedPPL × 3000 / 10000)` from the game contract and transfers the remainder to the player. Independent burn categories remain separate:

1. automatic post-mining player-buyback burn;
2. 5% PPL-side swap fee burn;
3. threshold/vault buyback-and-burn;
4. owner-triggered `buybackAndBurn`.

No arbitrary user balance burn or arbitrary owner mint path was found. No deterministic positive-value game/buyback/sell loop was found in the bounded economic searches; this does not prove universal MEV resistance.

### Treasury stress and minimum wager

The treasury simulator uses normalized native units, not a USD price. With the fixed 5% cap, a 100-unit free bankroll permits a maximum liability of 5 units; at the audited 16-row/high-risk/256-ball configuration this corresponds to approximately `0.0012128349` native per ball. The 50-unit case permits approximately `0.0006064174` per ball. Exact contract minimum is 0.001 native per ball, so a 50-unit free bankroll cannot admit that worst-case 256-ball configuration at the minimum bet; a smaller ball count or larger treasury is required.

The cap preserves solvency by rejecting or shrinking exposure, but a cluster of accepted maximum wins can consume almost all free bankroll. For normalized starts of 50, 100, 250, 500, and 1,000 units, the deterministic 5% clustered-win model reached minimum free balances of approximately 0.409, 0.818, 2.045, 4.089, and 8.178 units respectively. These are stress-model outputs, not behavior forecasts.

VRF cost is model-dependent until a real Polygon subscription is configured. Using the measured callback gas as a lower-bound gas-only model (excluding Chainlink premium/subscription overhead) gives:

| Balls | Measured callback gas | Gas-only cost at 30 / 100 / 300 gwei |
|---:|---:|---:|
| 1 | 444,380 | 0.0133 / 0.0444 / 0.1333 native |
| 10 | 480,878 | 0.0144 / 0.0481 / 0.1443 native |
| 50 | 632,206 | 0.0190 / 0.0632 / 0.1897 native |
| 100 | 821,890 | 0.0247 / 0.0822 / 0.2466 native |
| 256 | 1,450,714 (post-mining) | 0.0435 / 0.1451 / 0.4352 native |

With one VRF request per round, cost amortizes across balls; it must not be multiplied by ball count. At the highest RTP, pre-VRF house margin is approximately `99% - 90.4849% = 8.5151%` of total wager. The pure EV break-even round wager is therefore approximately VRF cost / 0.085151, before player gas, Chainlink premium, and operational costs. This means a small alpha needs an owner-approved minimum-round policy after live VRF billing is observed; the contract’s 0.001-per-ball minimum is not by itself an economic guarantee.

## VRF status

The request path stores one request ID per game, requests one random word, authenticates the coordinator callback, rejects unknown/replayed requests, and settles a game once. Local tests use `LocalVRFCoordinatorV2PlusMock`; the deployment script rejects incomplete public-chain configuration and always uses `localMode=false` for deployment tooling.

**OPEN MEDIUM / LAUNCH BLOCKER for real money:** a request can remain pending indefinitely if external fulfillment never arrives. There is no timeout/refund/recovery path. A future recovery design must preserve locked-liability backing and prevent late-callback double settlement; it requires a separate owner-approved contract change.

Measured callback gas:

| Balls | Actual gas | Headroom to 2,000,000 |
|---:|---:|---:|
| 1 | 444,380 | 1,555,620 |
| 2 | 448,844 | 1,551,156 |
| 5 | 462,238 | 1,537,762 |
| 10 | 480,878 | 1,519,122 |
| 25 | 533,125 | 1,466,875 |
| 50 | 632,206 | 1,367,794 |
| 100 | 821,890 | 1,178,110 |
| 128 | 928,365 | 1,071,635 |
| 256 | 1,429,198 | 570,802 |
| 256 post-mining | 1,450,714 | 549,286 |

The previous `515,285` value was estimate-based (`2,000,000 - 1,484,715`), not measured. Production Chainlink callback execution remains untested.

## AMM and economic attack status

The AMM is an internal constant-product-style reserve system in the game contract, not an external Uniswap pool. It maintains `reserveMatic` and `reserveToken`, applies the 5% input fee, caps swap size and reserve impact, and requires minimum liquidity. Reserve reconciliation and alternating swap paths passed local tests. The bounded sandwich/buyback searches found no deterministic positive P/L after the 30% burn change.

**OPEN MEDIUM:** spot pricing remains manipulable, there is no independent oracle, and bounded grids cannot establish MEV/sandwich safety. Operational controls such as low initial limits and monitoring are appropriate; an AMM redesign is outside this audit.

## Web server, keys, and release operations

The intended server contains zero deployer, owner, treasury, developer-fee, or VRF-subscription private keys. Users sign paid transactions in their wallets; the server reads chain state and serves the frontend. Full web-server compromise can deface/censor the UI or cause downtime, but it does not provide an on-server path to treasury withdrawal, minting, changing the fixed burn/cap, or choosing a paid outcome. A malicious frontend can still phish or misrepresent transaction details; wallet and chain hard-stop checks remain essential.

Actual container controls include multi-stage standalone build, non-root runtime, read-only root filesystem, tmpfs, dropped capabilities, `no-new-privileges`, CPU/memory/PID limits, internal app networking, and Nginx-only public publishing in the production compose. The no-money compose requires operator TLS certificate files and correctly fails its proxy rather than serving fake HTTPS without certificates. The private local rehearsal is the valid HTTP-on-loopback rehearsal.

Current public port intent is 22/80/443 at the host firewall; app port 3000, local RPC 8545, database, Docker API, and metrics must remain private. No external VPS was accessed in this audit.

### API and frontend attack surface

| Route | Method | Bound | Chain effect |
|---|---|---|---|
| `/api/health` | GET | 1-second RPC timeout; no scan | `eth_chainId` only when configured |
| `/api/game/:gameId` | GET | decimal ID limited to 78 digits | one contract read |
| `/api/stats/:address` | GET | address validation, 100,000-block default window, canonical 30-second cache | bounded event query |
| `/api/security/check` | GET | strict nonzero Ethereum address validation | none; informational response |
| `/api/prices` | GET | 60-second cache | one fixed CoinGecko URL; no user URL/SSRF input |

The proxy limits API traffic to 5 requests/second with burst 10 and the
application middleware adds a 100-request/minute in-process limit using the
proxy-overwritten `X-Real-IP`. The current limits are per process and are not
a substitute for a distributed limiter on a multi-replica deployment. The
application does not trust arbitrary public `X-Forwarded-For` for this limit.
Malformed addresses, oversized game IDs, invalid methods, and unavailable RPC
are bounded by validation/error handling. `dangerouslySetInnerHTML` is used
only by the chart component for generated CSS variables; no user HTML is
rendered. CSP removes `unsafe-eval`; wallet/RPC domains must be explicitly
reviewed when a real provider is configured.

### Reorg and server truth

The stats route uses a bounded historical scan and a process-local cache. It
is not reorg-aware and can miss events outside the configured window or
temporarily cache a result across a reorg. This is acceptable for no-money
demo/read-only operation, conditionally acceptable for a testnet rehearsal,
and a launch blocker for authoritative user history at public real-money
scale. On-chain state remains authoritative for paid outcome, payout, supply,
and entitlement; server/API responses must never be treated as settlement
proof.

### Release verification result

`npm run release:verify` completed successfully after the final script change:
33 contract tests, ABI drift, TypeScript, ESLint, RTP, trajectory, treasury
simulation, full gas matrix, Next production build, liveness/readiness checks,
and Chromium browser regression. The Next build emitted only the known
middleware-to-proxy and Edge-runtime deprecation warnings. A Docker build was
attempted with the legacy Docker builder but stalled at the large
`COPY --from=deps /app/node_modules` step in this environment; no image was
accepted as a new release artifact. Existing image history and Compose
configuration were inspected, and the production image must be rebuilt in CI
or on a host with a functioning BuildKit/buildx path before deployment.

Dependency audit via `npx pnpm@9.15.0 audit --prod --audit-level=high` returned
0 critical/high findings and 3 moderate findings. No populated private key,
mnemonic, RPC credential, or cloud secret was found in tracked files or the
Docker build context; example key hashes and placeholders are configuration
documentation, not private keys.

## Findings

| ID | Severity | Launch blocker | Finding |
|---|---|---:|---|
| F-01 | MEDIUM | YES for real money | VRF requests can remain pending indefinitely; no timeout/refund path. |
| F-02 | MEDIUM | YES for broad launch; owner acceptance for alpha | Internal AMM spot/MEV manipulation remains possible and is not proven safe. |
| F-03 | MEDIUM | YES | Real Polygon/Chainlink VRF deployment and callback behavior are not validated. |
| F-04 | MEDIUM | YES for broad launch | Historical event scans are bounded but not reorg-aware; a future indexer needs confirmation/reorg policy. |
| F-05 | HIGH external/process | YES | No independent external smart-contract/economic audit has been completed. Internal tests are not an external audit. |
| F-06 | HIGH external/process | YES | Wagering, transferable token, AMM, revenue, age/geography, AML/KYC, and custody questions require specialist legal/compliance review. |
| F-07 | LOW | NO | Local `pnpm audit` could not run because the environment exposes no pnpm/corepack shim; CI has the authoritative frozen-lockfile audit gate. `npm audit` is inapplicable without `package-lock.json`. |
| F-08 | LOW | NO | `scripts/seed-liquidity.ts` default was above the 90,000-PPL game allocation; corrected to 90,000 in this audit. |
| F-09 | INFO | NO | Fresh no-money internet-facing proxy requires real operator TLS files/domain; private loopback rehearsal remains available. |
| F-10 | LOW | NO | The local host lacks Docker buildx and the legacy Docker builder stalled while copying dependencies; CI/host image build remains a release prerequisite. |

## Readiness tiers

| Tier | Status | Conditions |
|---|---|---|
| Local development | READY | Existing local tests and mock-VRF flow pass. |
| Internet-facing VPS / no money | READY WITH CONDITIONS | Use exact release image, no-money mode, operator TLS/domain, firewall, monitoring, and no privileged keys. |
| Public testnet rehearsal | READY WITH CONDITIONS | Owner must provide funded test deployer, verified target chain, VRF subscription/coordinator/key hash, deployment metadata, and run the full testnet matrix. |
| Small closed real-money alpha | NOT READY | Resolve/accept VRF liveness, validate production VRF, complete independent review and legal/compliance gate, approve minimum-wager and AMM risk policy, fund only after the pre-funding checklist. |
| Broad public real-money launch | NOT READY | All alpha blockers plus reorg-aware indexing, operational history, external review, responsible-gaming controls, and legal/compliance approval. |

## Direct answers to the primary questions

1. **One malicious player insolvency:** no deterministic path was found; admission is conservative and liability-based, subject to normal implementation and owner-risk assumptions.
2. **Concurrent overcommit:** the contract locks maximum liabilities before pending requests; local tests and 20/50/100-attempt model show rejection/shrinking capacity rather than bypass.
3. **Owner spending protected liabilities:** normal paths protect locked games, failed payouts, AMM reserve, vault, and accrued dev fees; owner can still spend free house funds and change permitted admin settings.
4. **Web compromise:** no privileged key is intended or required on the web server; blast radius is primarily UI/service disruption.
5. **Paid result manipulation:** no server path controls it; authenticated VRF is required, but real Chainlink validation remains open.
6. **Supply cap:** tested and enforced by token and game mining caps.
7. **Post-mining value creation:** native accounting and burn/player identity reconcile; no mint path reopens after exhaustion.
8. **Deterministic extraction:** no positive loop found in bounded deterministic searches; AMM MEV remains open.
9. **5% cap:** fixed 500 BPS against current free bankroll and recomputed after locks.
10. **30% burn:** real `burnFrom` reduces `totalSupply` by the exact rounded amount.
11. **1% fee:** accrued separately, fully backed in the native identity, and pull-withdrawn by the dev address.
12. **Minimum wager:** must be chosen after live VRF billing; gas-only break-even is model-dependent and can be substantial at high gas prices.
13. **~100-unit treasury:** technically usable only for smaller rounds/configurations; minimum bet plus 256-ball/high-risk worst-case is not admitted at 50 free units.
14. **VPS compromise:** limited to frontend/read-side disruption when key separation is followed.
15. **Reconstruction:** source commit, frozen lockfile, manifest, env template, Docker/Compose, and runbooks are sufficient; no on-chain state is stored in the web container.
16. **Real-money blockers:** F-01 through F-06, plus owner approval of minimum wager/AMM risk and production monitoring.
