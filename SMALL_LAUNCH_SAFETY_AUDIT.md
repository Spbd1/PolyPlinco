# PolyPlinco Small-Launch Safety Audit

**Scope:** treasury exposure, liability admission, fee custody, privileged
withdrawals, server/key separation, and closed real-money launch readiness.

**Status:** analysis only. No contract, deployment, or tokenomics change was
made for this audit. The owner-approved post-mining policy remains 70% native
buyback / 30% native retained, then 30% of purchased PPL burned / 70% sent to
the player.

## Executive conclusion

**VERIFIED / TESTED:** The current game-admission rule is based on the maximum
possible payout, not on win probability. It compares that liability with
`houseBankroll - lockedBankroll`, and increments `lockedBankroll` before the
game becomes pending. In the tested concurrent scenarios, accepted games
cannot overcommit the house liability reserve.

**VERIFIED:** A compromised owner key can withdraw all currently free house
funds and can pause gameplay. It cannot use the normal withdrawal paths to
withdraw locked game liabilities, failed-payout claims, AMM native reserves,
vault funds, or accrued developer fees. This is still a material treasury
governance risk.

**MODELLED:** For a normalized `$100` *free house bankroll* and the current
maximum-liability configuration (16 rows, high risk, 256 balls, 0.01 native
per ball), one maximum-liability game reserves `41.225728` units. A 10% owner
exposure cap would reduce the corresponding maximum bet per ball to about
`0.00242567` units. A cap is not required to make the existing admission rule
solvent, but it materially limits variance and availability.

**NOT READY:** A small real-money launch should not be treated as ready until
an owner-approved exposure policy, production VRF readiness, key custody,
server hardening, and specialist legal/compliance review are complete.

## 1. Accounting map

### Native buckets

| Bucket | Current implementation | Accounting meaning |
|---|---|---|
| Actual contract balance | `address(game).balance` | Physical native asset held by the contract |
| House bankroll | `houseBankroll` | House-owned native balance, including the locked subset |
| Locked bankroll | `lockedBankroll` | Maximum payout liabilities for pending games; subset of house bankroll, not an additional asset |
| Free house bankroll | `max(houseBankroll - lockedBankroll, 0)` | Amount available for new maximum-liability admission and owner profit withdrawal |
| AMM native reserve | `reserveMatic` | Native reserve owed to the internal AMM; not house bankroll |
| Vault | `vaultMatic` | Native accumulated for vault buyback/burn; not house bankroll |
| Failed-payout claims | `totalPendingWithdrawals` | Player liabilities created when a push transfer fails |
| Developer fee liability | `devFeesAccrued` | Pull-based 1% fee liability owed to the current `devAddress` |

**VERIFIED formula:**

```text
freeHouseBankroll = max(houseBankroll - lockedBankroll, 0)
```

`lockedBankroll` is deliberately not added to protected totals a second time.
The reconciliation equation is:

```text
accountedNative = houseBankroll
                + reserveMatic
                + vaultMatic
                + totalPendingWithdrawals
                + devFeesAccrued

accountedNative <= address(game).balance
lockedBankroll <= houseBankroll
```

The difference is an unclassified surplus (for example, an unsolicited native
transfer) and is not treated as a protected or spendable category by this
audit. `scripts/reconcile.ts` now reports the free house amount, accounted
native amount, surplus, and both invariants.

### Token buckets

**VERIFIED:** Genesis mints 10,000 PPL to the configured dev address and
90,000 PPL to the Game contract for the AMM/vault allocation. Up to 900,000
PPL can be minted only through loss mining, subject to both the mining cap and
`MAX_SUPPLY = 1,000,000 PPL`. The EOA owner cannot arbitrarily mint.

After mining exhaustion, automatic player buyback burns 30% of acquired PPL
and sends 70% to the player. This does not alter native bucket accounting.

## 2. Game admission and concurrent exposure

**VERIFIED in `contracts/PolyPlinkoGame.sol`:** `playPlinko` calculates
`maxPayout = _calculateMaxPayout(config)` and requires:

```text
maxPayout <= max(houseBankroll - lockedBankroll, 0)
```

Only then does it add `maxPayout` to `lockedBankroll`. The current rule also
enforces `MAX_BET_PER_BALL`, `maxBetTotal`, ball/row bounds, and a per-player
active-game limit.

This is a monetary-liability test. It does not rely on the probability of a
large win. Because every accepted game increases the locked amount before the
next admission, aggregate pending exposure is bounded by the available house
bankroll in the current contract model.

**TESTED / MODELLED:** With a 16-row high-risk, 256-ball, 0.01-per-ball
maximum-liability request (`41.225728` units):

| Free house start | Current rule: 20 pending requests | Locked after accepted requests | Remaining free |
|---:|---:|---:|---:|
| 50 | 1 accepted / 19 rejected | 41.225728 | 11.308672 |
| 100 | 2 / 18 | 82.451456 | 22.617344 |
| 250 | 6 / 14 | 247.354368 | 17.852032 |
| 500 | 12 / 8 | 494.708736 | 35.704064 |
| 1,000 | 20 / 0 | 824.514560 | 226.173440 |

These results are from `scripts/treasury-exposure-simulation.cjs` and use
normalized native units, not a live USD price.

## 3. Candidate treasury exposure caps

The candidate policy is an additional admission condition:

```text
maxPayout <= freeHouseBankroll * capPercent / 100
```

The cap applies to each new game's maximum liability, while the existing
`lockedBankroll` check still protects aggregate concurrent exposure.

For a normalized free house bankroll of 100 and the representative maximum
configuration:

| Cap | Maximum liability at start | Approx. maximum bet/ball | Protection from one maximum-liability winner | Availability trade-off |
|---:|---:|---:|---|---|
| 2% | 2 | 0.00048513 | Very strong | Below the current 0.001 minimum bet; this configuration is rejected |
| 5% | 5 | 0.00121283 | Strong | Only very small maximum-risk games fit |
| 10% | 10 | 0.00242567 | Strong, with materially better availability | Conservative upper bound; still rejects the current 0.01/256 request |
| 20% | 20 | 0.00485134 | Moderate | More usable, but materially larger single-event variance |

**MODEL-DEPENDENT:** At low starting balances, a 2% cap may be unusable at
the protocol's current minimum bet for this worst-case configuration. At a
100-unit free bankroll, 5% and 10% remain above the minimum, but impose a
large reduction from the current 0.01-per-ball maximum.

**RECOMMENDATION — OWNER DECISION REQUIRED:** Evaluate a 5–10% range for a
closed alpha, with 10% treated as an upper bound rather than a guarantee of
availability. Do not implement a cap until the owner selects the value and
defines whether it is immutable, owner-configurable, or operationally
enforced through `maxBetTotal`.

## 4. Small-treasury scenarios

**MODELLED:** The simulator evaluates 50, 100, 250, 500, and 1,000 normalized
free-house units; it does not use a USD price or forecast player behavior.
It includes ordinary 10,000-game runs, 20-game pending bursts, and serial
maximum-liability winner attempts across seeds:

```text
0x5eedc0de, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9
```

The current rule preserves maximum availability while admitting only as many
maximum-liability games as free funds support. A 10% cap sharply reduces the
maximum permitted bet but keeps the single-event drawdown bounded by 10% of
the then-free bankroll. A 20% cap is more available but leaves substantially
more variance. A 2% cap is safest mechanically but often conflicts with the
current minimum bet at a small treasury.

The deterministic output digest is recorded by the script and must be used
to detect accidental model drift. Temporary JSON output belongs under `/tmp`
and is not a repository artifact.

### Pending-burst comparison

**MODELLED:** Number accepted from 20 identical maximum-liability requests
before fulfillment:

| Free house start | Current | 2% cap | 5% cap | 10% cap | 20% cap |
|---:|---:|---:|---:|---:|---:|
| 50 | 1 | 0 | 0 | 0 | 0 |
| 100 | 2 | 0 | 0 | 0 | 0 |
| 250 | 6 | 0 | 0 | 0 | 2 |
| 500 | 12 | 0 | 0 | 3 | 8 |
| 1,000 | 20 | 0 | 5 | 16 | 20 |

This table is intentionally a worst-case request shape, not a forecast of
normal player activity. It demonstrates that the cap is an availability and
variance control layered on top of the existing aggregate lock.

## 5. Developer fee

**VERIFIED:** Each accepted wager accrues:

```text
devFee = totalBet / 100       // Solidity integer floor
netBet = totalBet - devFee
```

The fee is added to `devFeesAccrued` as a protected liability. It is not
available to fund player payouts and is not included in the free-house
formula. `withdrawDevFees` is pull-based, restricted to the current
`devAddress`, decrements the liability before the external call, and rejects
amounts above the accrued balance. A reverting developer receiver reverts
only its withdrawal and cannot block game creation.

For the current minimum wager, the 1% fee is nonzero. Sub-unit wagers would
round down as normal Solidity integer arithmetic.

## 6. Owner allocation and mint authority

**VERIFIED:**

| Allocation | Amount | Destination | Future arbitrary mint? |
|---|---:|---|---|
| Dev genesis allocation | 10,000 PPL | Constructor `_devAddress` | No |
| Vault/AMM allocation | 90,000 PPL | Game contract | No separate owner mint |
| Loss-mining allocation | Up to 900,000 PPL | Players through Game | Game-only, capped |

The Game contract owns the token and can call `mintFromLossMining`, but that
function enforces both the mining allocation and `MAX_SUPPLY`. The EOA owner
cannot mint arbitrary PPL or access the mining mint path directly.

## 7. Withdrawal safety and maximum withdrawable amount

**VERIFIED:** `withdrawProfits` can withdraw only:

```text
max(available houseBankroll, 0)
= max(houseBankroll - lockedBankroll, 0)
```

It cannot withdraw AMM reserve, vault funds, pending payout claims, or dev
fees through this path. `emergencyWithdraw` additionally requires the game to
be paused and `lockedBankroll == 0`; it protects reserve, vault, failed
claims, and dev fees against the actual contract balance. The maximum safe
owner withdrawal is therefore the free house amount, subject to the separate
emergency preconditions.

**OPERATIONAL RISK:** A compromised owner key can intentionally withdraw the
free house bankroll, pause gameplay, change `maxBetTotal` subject to its
minimum, and consume vault funds through owner operations. This is a
governance/key-custody risk, not an admission-rule bypass. Production owner
control should be a multisig, with sensitive actions timelocked where
operationally compatible.

## 8. Post-mining burn regression

**VERIFIED / TESTED:** The owner-approved policy remains:

```text
native:       70% buyback / 30% retained
purchased PPL: 30% burn / 70% player
```

The burn is a real supply reduction, uses fixed code constants rather than a
mutable owner setter, and leaves native solvency accounting unchanged. The
existing regression suite verifies exact total-supply delta, reserve delta,
allocation identity, cap, and mining exhaustion.

## 9. Server and key architecture

**RECOMMENDED / OWNER DECISION REQUIRED:**

| Role | Recommended custody | Server access |
|---|---|---|
| Deployer | Offline/short-lived deployment signer | Never stored in web container |
| Contract owner/admin | Multisig; timelock for non-emergency actions | No web-server private key |
| Dev-fee recipient | Separate controlled treasury address | Pull withdrawal performed by controlled operator |
| VRF subscription owner | Separate operational account/multisig | No web-server private key |
| Player transaction signer | User wallet | Browser wallet only |
| Optional relayer | Separate minimally funded, least-privilege key | Only if a future feature proves it necessary |

The production web server should hold no privileged contract private key.
Paid outcomes remain authoritative on-chain; the server may read, cache, and
index, but cannot choose randomness or rewrite settlement.

## 10. Web/server/Docker security baseline

**VERIFIED:** The current Dockerfile uses a multi-stage build, frozen pnpm
install, Next standalone output, a non-root runtime user, and a healthcheck.
Compose uses a bridge network and does not mount the Docker socket. The local
configuration exposes the web service, not Hardhat RPC.

**OPEN / REQUIRED BEFORE INTERNET EXPOSURE:**

- replace placeholder Docker contract-address/network defaults with explicit
  production validation; never allow zero/placeholder addresses;
- terminate TLS at a reverse proxy and expose only 80/443 publicly;
- keep Hardhat RPC 8545, databases, Docker socket, and admin/metrics endpoints
  private or disabled;
- add container resource limits, dropped capabilities, and evaluate a
  read-only filesystem with a writable temporary directory;
- use a distributed rate limiter or edge protection instead of relying only
  on the current in-memory middleware limiter;
- add explicit request-size and RPC timeout/retry controls;
- add a practical CSP and review security headers;
- confirm logs redact RPC credentials, wallet data, and request payloads;
- ensure no private key or server-only RPC credential uses `NEXT_PUBLIC_*`.

### Network design

```text
Internet -> TLS reverse proxy -> Next.js container
                         \-> outbound-only blockchain RPC over TLS
Future indexer/database -> private internal network only
```

Required public inbound ports: 443 (and optionally 80 for redirect). Outbound
access: configured RPC endpoint(s), package/monitoring services only as needed.
Port 8545 must be denied from the public network.

## 11. API and frontend launch controls

**VERIFIED:** API inputs validate addresses and game IDs; history queries are
bounded rather than unconditionally scanning from genesis; nonexistent games
return 404 in the existing regression. Middleware provides an in-process
rate limit.

**OPEN MEDIUM / F-07:** The implementation is not reorg-aware and remains a
future indexing/scalability concern. A single public RPC outage or provider
range/rate limit can degrade reads. Before broad launch, use bounded queries,
timeouts, provider fallback/read health checks, and eventually a reorg-aware
indexer.

**VERIFIED:** Frontend chain/address guards prevent a local address with a
public chain or a public address with a wrong chain from silently submitting a
paid transaction. Public build values must be injected deliberately; the
compose placeholders are not acceptable production configuration.

## 12. Monitoring and manual circuit-breaker plan

**RECOMMENDED / OWNER DECISION REQUIRED:** Alert on:

- actual contract balance and reconciliation surplus;
- free house bankroll and utilization `lockedBankroll / houseBankroll`;
- largest pending liability and total pending requests;
- dev-fee and failed-payout liabilities;
- AMM native/PPL reserves and large swaps;
- total supply, automatic burn total, and mining allocation remaining;
- pending VRF age and callback failures;
- bankroll-based game rejections;
- pause, emergency shutdown, withdrawal, and admin configuration events.

Candidate operational alerts (not protocol parameters): warn at 50% locked
utilization, page at 75%, and stop accepting new invited users at an
owner-selected higher-risk threshold. These percentages require owner
approval and must not be confused with the proposed per-game exposure cap.

The current pause controls provide a manual circuit breaker. VRF liveness
remains an accepted open medium risk: a request that never fulfills can keep
liability locked. This must be resolved before broad public real-money launch.

## 13. Launch tiers

| Tier | Status | Conditions |
|---|---|---|
| Local development | **READY** | Existing local chain/mock VRF and regression gates |
| Private server, no real money | **READY WITH CONDITIONS** | Explicit non-production config, no exposed RPC, no privileged server key |
| Small closed real-money alpha (~$100 house) | **NOT READY** | Select cap, validate production VRF/deployment, harden server/key custody, monitoring, and specialist compliance review |
| Broad public real-money launch | **NOT READY** | All alpha conditions plus reorg-aware indexing, stuck-VRF handling, stronger MEV/liquidity controls, governance, and legal/compliance clearance |

## 14. Unresolved risks and external blockers

### Open technical/operational risks

1. **OPEN MEDIUM — VRF liveness:** a stuck request can leave funds pending.
2. **OPEN MEDIUM — AMM spot-price/MEV manipulation:** the internal AMM is
   shallow/manipulable; do not claim MEV safety.
3. **OPEN MEDIUM — future reorg-aware indexing/scalability (F-07).**
4. **OWNER DECISION REQUIRED — additional per-game treasury cap** (2%, 5%,
   10%, or 20% candidate analysis above).
5. **SERVER HARDENING REQUIRED** before internet exposure.

### External launch requirements

**EXTERNAL / LEGAL-COMPLIANCE:** Specialist review is required because the
product combines wagering, a transferable token, rewards for losses,
AMM/liquidity, and owner revenue. Review should cover gambling rules, age and
geographic restrictions, AML/KYC obligations, token classification,
treasury/custody, responsible gaming, and required disclosures. This is not a
legal conclusion.

## 15. Reproducibility and evidence

The executable model is:

```text
scripts/treasury-exposure-simulation.cjs
```

Run:

```text
node scripts/treasury-exposure-simulation.cjs
```

The model uses the current high-risk 16-row/256-ball maximum-liability path,
the contract's 1% fee convention, deterministic seeds, and the liability
admission formula. It does not use USD prices or claim to predict user
behavior. `scripts/reconcile.ts` is the on-chain reconciliation command and
now exposes the same free-house and accounting categories.
