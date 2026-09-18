# PolyPlinco Full-System Audit

Validation date: 2026-09-18
Scope: local Hardhat chain only; no Amoy or mainnet deployment
Checkpoint: `04bc12d9b0d8f7e524478d2b8413cdd1932f2952` (`checkpoint: verified local PolyPlinco before full-system audit`)

## Status legend

- **VERIFIED**: observed from source and executable validation.
- **TESTED**: covered by a passing executable test or smoke command.
- **ASSUMED**: an explicit operational assumption, not a proof.
- **NOT TESTED**: not exercised in this local-only audit.
- **EXTERNAL DEPENDENCY**: requires a provider, service, or independent review.

## Architecture summary

`PolyPlinkoGame` owns a `PolyPlinkoToken`, receives native bets, locks the
maximum configured payout, requests one VRF word, and settles exactly once in
the authenticated coordinator callback. `LocalVRFCoordinatorV2PlusMock`
provides the local callback state machine. The game also contains the loss
mining path and a separate native/PPL constant-product AMM.

The Next.js application uses wagmi/viem for wallet and contract access. Demo
results come from the browser-only Plinko simulator. Paid results are sourced
from the contract event/call path. Next API routes use `lib/server-chain.ts`
and the configured local chain in this validation.

## Threat model and accounting model

The relevant trust boundaries are the Chainlink coordinator callback, the game
owner/admin, player-controlled calldata/native value, arbitrary payout
receivers, the AMM caller, RPC/indexing infrastructure, and untrusted browser
state. The browser is not an authority for paid outcomes.

The local reconciliation model is:

`houseBankroll + reserveMatic + vaultMatic + totalPendingWithdrawals + devFeesAccrued <= address(this).balance`

with `lockedBankroll <= houseBankroll`, `reserveToken <= token.balanceOf(game)`,
and `totalSupply <= MAX_SUPPLY`. The inequality permits unclassified/native
donations; protected categories must never exceed actual assets.

## Findings

| ID | Severity | Finding/evidence | Affected code | Status |
|---|---|---|---|---|
| F-01 | HIGH | Post-mining buyback increased `reserveMatic` without debiting the house and added the retained 30% to a bankroll that already contained the net bet. A mining-exhausted test reproduced protected native accounting above the real balance. | `contracts/PolyPlinkoGame.sol:_buybackToPlayer` | **FIXED**; regression in `test/VRFAndInvariant.test.ts` |
| F-02 | HIGH | An authenticated coordinator callback with an unmapped request relied on the default mapping value. Without a request/game identity check it could resolve through game 0. | `contracts/PolyPlinkoGame.sol:_fulfillRandomness` | **FIXED**; direct impersonated-coordinator regression test |
| F-03 | HIGH | `localMode` was a constructor option without an on-chain chain-ID restriction. A bad deployment configuration could create predictable local randomness on a public chain. | `contracts/PolyPlinkoGame.sol` constructor | **FIXED**; restricted to chain 1337 or 31337. Deployment script always passes `false`. |
| F-04 | MEDIUM | Browser history used an unbounded `fromBlock: earliest` scan on every history render. | `hooks/use-game-events.ts` | **FIXED**; bounded to latest 100,000 blocks |
| F-05 | MEDIUM | Contract reads/writes could use zero-address configuration or submit on a connected chain different from the build-time target. | `lib/contracts.ts`, `hooks/*` | **FIXED**; address query guards and expected-chain write guards |
| F-06 | MEDIUM | `pnpm audit --prod` reports current upstream advisories: 3 critical, 37 high, 61 moderate, 9 low across 1,114 dependencies. The report includes Next 16.0.3 and sharp/libheif advisories. | `package.json`, `pnpm-lock.yaml` | **OPEN**; requires dependency remediation and compatibility testing |
| F-07 | MEDIUM | API and browser statistics are intentionally bounded/recent-window views and do not provide complete historical indexing or reorg-aware pagination. | `app/api/stats/[address]/route.ts`, `hooks/use-game-events.ts` | **OPEN/KNOWN LIMITATION**; future indexer requirement |
| F-08 | LOW | API rate limiting is an in-memory per-process map and is not a distributed security control. | `middleware.ts` | **OPEN**; acceptable only for local/single-process use |
| F-09 | LOW | `withdrawProfits` and emergency native withdrawals use `transfer`, which can reject a contract owner receiver. This is an admin operability issue, not a player settlement path. | `contracts/PolyPlinkoGame.sol` | **OPEN** |
| F-10 | LOW | Historical/UI text contained one stale 80% buyback statement; it was corrected to the current 70% behavior. | `components/token-panel.tsx` | **FIXED** |
| F-11 | INFO | Slither is not installed in this environment. Manual review and executable tests were performed; this is not equivalent to static-analysis coverage. | repository/tooling | **NOT TESTED** |
| F-12 | INFO | No independent external security audit, real Chainlink VRF callback, Amoy deployment, or mainnet deployment was performed. | external systems | **EXTERNAL DEPENDENCY / NOT TESTED** |

No protocol Critical finding was identified. The dependency scanner's three
critical advisories remain separately counted as an external dependency risk,
not as an identified exploitable contract path in this local Linux run.

## VRF lifecycle

**VERIFIED/TESTED:** game creation records a pending game before requesting
randomness; the request ID is mapped to the game; only the configured
coordinator may call the raw callback; request/game IDs must match; settlement
checks `settled`; locked bankroll is released once; out-of-order requests are
isolated; failed native payouts become pull liabilities.

**TESTED:** unauthorized callbacks, authenticated unknown callbacks, replayed
mock fulfillment, and out-of-order fulfillment. Click-to-Drop/demo state is
not used by the contract and cannot influence paid randomness.

**NOT TESTED:** real Chainlink subscription/funding/fulfillment on Amoy.

## Economics and supply

The executable implementation is 70% post-mining buyback / 30% retained. The
initial contract source historically contained an 80% comment while its
implementation already used 70%; the repository changelog says the intended
change was from 80/20 to 70/30, and current README/whitepaper/checklist text
uses 70/30. This supports 70/30 as the current executable decision, but does
not prove owner intent because the history is largely squashed into the
initial implementation. The ratio was deliberately **not changed** in this
audit and remains an economic decision requiring owner confirmation.

Mining uses nine 100,000-token tiers, 0.02–0.10 native units per token, a
900,000-token mining allocation, and a 1,000,000-token maximum supply.
Boundary behavior, cap checks, loss mining, post-mining buyback, and the
mining-exhaustion accounting path were tested locally.

## Independent mathematics and gas

An independent integer implementation of the binomial weights, risk curves,
normalization, and 90% target scaling produced all 75 configurations with
RTP from **9003 to 9048 bps** (90.03%–90.48%). The contract RTP report agrees.

Fresh local gas measurements:

| Operation | Gas |
|---|---:|
| deployment | 5,724,063 |
| one-ball game creation | 476,318 |
| 256-ball callback settlement | 1,462,695 |
| native-to-PPL swap | 102,646 |
| PPL-to-native swap | 107,860 |
| loss-mining tier crossing | 424,069 |

The configured callback limit is 2,000,000, leaving approximately 537,305 gas
in this local measurement. 256 remains the tested application maximum; this
does not establish a safe production margin under the real coordinator or
future compiler/dependency changes.

## AMM and malicious-call review

**TESTED:** initialization, native-to-PPL, PPL-to-native, fee accounting,
slippage rejection, low/uninitialized liquidity rejection, repeated swaps in
the stress suite, reserve/token-balance reconciliation, failed payout
receiver behavior, and protected claims.

SafeERC20 and nonReentrant guards cover token/native entry points. Failed player
payouts are pull liabilities rather than settlement-blocking obligations.
The AMM has explicit 5% fee, 30% impact, 100 native-unit swap, and minimum
liquidity controls.

**OPEN:** the custom AMM has not received an independent economic audit;
MEV/sandwich resistance is bounded by impact limits, not eliminated.

## Stateful validation

The corrected deterministic stress harness ran 10 seeds × 1,000 attempted
actions. Every seed had zero unexpected failures and every expected bankroll
rejection left the captured state unchanged:

| Seed | Successful actions | Expected rejected games | Swaps | Failed receivers | Unexpected failures |
|---|---:|---:|---:|---:|---:|
| 0x5eedc0de | 1000 | 0 | 98 | 9 | 0 |
| 0x1 | 1000 | 0 | 98 | 9 | 0 |
| 0x2 | 1000 | 0 | 98 | 9 | 0 |
| 0x3 | 1000 | 0 | 98 | 9 | 0 |
| 0x4 | 999 | 1 | 96 | 9 | 0 |
| 0x5 | 998 | 2 | 98 | 9 | 0 |
| 0x6 | 999 | 1 | 98 | 9 | 0 |
| 0x7 | 1000 | 0 | 98 | 9 | 0 |
| 0x8 | 998 | 2 | 98 | 9 | 0 |
| 0x9 | 1000 | 0 | 98 | 9 | 0 |

The actions randomized users, rows, risks, ball counts, bet sizes, fulfillment
ordering, swaps, and failed receivers. The harness now accepts only the exact
`Insufficient available bankroll` revert for a rejected game and snapshots
native, game, reserve, vault, fee, and supply state before/after that revert.

## Access-control matrix

| Function group | Caller | Assets/state affected | Production assumption |
|---|---|---|---|
| play/settle/claim/swap | player or coordinator as applicable | bets, payouts, reserves, liabilities | coordinator authentication and contract invariants |
| pause/unpause, emergency trigger/cancel | owner | game/swap availability | multisig/timelock recommended |
| seed liquidity, buyback/burn, profit withdrawal, max-bet change | owner | house/AMM/vault funds and limits | multisig/timelock required before mainnet |
| dev fee withdrawal | current dev address | accrued developer fees | dedicated controlled recipient |
| token mint/burnFrom | game contract only | PPL supply/reserves | game/token ownership remains coupled |
| raw VRF fulfillment | configured coordinator only | game result/liabilities | real Chainlink coordinator and subscription |

## Frontend/API audit

**VERIFIED/TESTED:** current local build includes Click-to-Drop default-off
state, first-use demo-only confirmation and local acknowledgement storage,
pointer/touch event wiring, origin-X clamping, preserved Drop One Ball and Play
Demo Round controls, and paid-mode separation. The simulator path never writes
paid result state. Animation effects clean up their requestAnimationFrame and
event subscriptions.

**FIXED:** paid writes now require a configured address and the expected
build-time chain; zero-address reads are disabled; recent event scans are
bounded. API tests returned fresh local health/config, valid game 0, 404 for a
nonexistent game, valid stats, invalid-address 400, and an explicit
`configured:false` security response rather than a fake security conclusion.

**TESTED:** `pnpm browser:test` now exercises the local Chromium/CDP matrix:
default-off behavior, no-op board clicks while disabled, first-use
confirmation/cancel/accept, local acknowledgement persistence, left/right
pointer origin, preserved Drop One Ball and Play Demo Round controls, reload,
and paid-mode pointer non-authority. This remains a lightweight interaction
regression rather than a full wallet/reconnect browser suite.

## Secrets, CI, Docker, and configuration

The tracked sensitive-name scan found only `.env.example` and ordinary source
names. No tracked private key, mnemonic, or populated env file was found.
`.env.local` is ignored and was used only for local addresses. Local Hardhat
printed its well-known test accounts while starting; no such key material was
written to this report or repository.

The primary CI workflow uses frozen pnpm installation and runs compile, tests,
ABI check, typecheck, lint, build, and Docker build without real keys or VRF.
The security workflow now uses frozen pnpm installation; dependency audit,
lint, secret scanning, and compile are mandatory. Snyk, Slither, and Mythril
remain explicitly optional external scanners with `continue-on-error` because
their external service/tool availability is not deterministic.

Docker build passed with the fresh local public addresses. A non-root runtime
container passed `/api/health` and was removed after the check. Direct Docker
access initially failed due to the shell's group activation; `newgrp docker`
worked without changing socket permissions.

## Local deployment evidence

- chain ID: 1337
- Game: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Token: `0xCafac3dD18aC6c6e92c921884f9E4176737C052c`
- mock coordinator: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- deployment transaction: `0x21e62bd7576a94530288da6afebc7ee4cd39dcfa1f1cb4956860fd660174ecc9`
- liquidity seed transaction: `0x909c022e387d137c0891fba0bdacb30f12bd1dc7d15749a9ecf38f0081577ce4`
- local URL: `http://localhost:3002`
- RPC: `http://127.0.0.1:8545`

Fresh reconciliation reported `nativeProtectedLeAssets: true`,
`lockedLeHouse: true`, `tokenReserveLeGameBalance: true`, and `supplyLeMax:
true`. The local paid smoke settled game 0 and a native-to-PPL swap; contract
tests cover the reverse swap, failed receiver, claim-liability protection,
and dev-fee withdrawal.

## Remaining blockers before testnet/mainnet

1. Resolve and patch the pnpm dependency advisories, then rerun compatibility
   and Docker gates.
2. Obtain an independent contract/economic/security audit; this document is
   not an independent audit.
3. Validate current Chainlink VRF v2.5 configuration, subscription funding,
   callback behavior, latency, and 256-ball gas margin on Amoy.
4. Replace bounded event scans with an indexed/reorg-aware history service
   before relying on complete production history.
5. Move owner/admin control to an appropriate multisig/timelock and document
   operational key rotation and monitoring.
6. Complete real wallet/browser interaction coverage, including pending and
   reconnect/reload states.
7. Confirm the 70/30 economic decision with the owner; no ratio change was
   made here.
