# PolyPlinco Token and Protocol Safety Audit

Audit date: 2026-09-18
Audited commit: `bddc08376f7c7dd05239e8e2febd60f3402587d4`
Scope: token, emissions, native solvency, AMM, VRF settlement, economic attack
surface, admin controls, and deployment safety. No Amoy or mainnet activity.

## Owner-approved tokenomics update

The prior audit characterized the post-mining player-buyback path at 0% PPL
burn. The approved implementation now uses a fixed 30% burn / 70% player
split on purchased PPL. The native 70% buyback / 30% retained split and all
other tokenomics remain unchanged. This is a deliberate product decision, not
an audit-discovered security fix.

## Executive summary

**VERIFIED:** the current implementation is supply-bounded and the tested local
native accounting reconciles. No new Critical or High correctness finding was
proven in this focused review. The existing protocol fixes for post-mining
double counting and unknown authenticated VRF requests remain present.

**TESTED:** 29 contract tests pass; the prior 10-seed/10,000-attempt stress
result remains valid; production dependency audit remains 0 Critical / 0 High;
gas measurement remains 1,462,695 for the 256-ball callback against a 2,000,000
limit.

**OPEN MEDIUM:** VRF liveness has no expiry/refund path, and the AMM is exposed
to ordinary public-mempool price manipulation/MEV. F-07 bounded history also
remains open. These require operational or architectural decisions and were
not changed.

## Asset flow map

### Native asset

```text
player bet
  -> 1% devFeesAccrued + 99% houseBankroll
  -> max possible payout added to lockedBankroll
  -> settlement payout OR totalPendingWithdrawals claim

swap input
  -> 5% vaultMatic
  -> 95% reserveMatic

post-mining loss
  -> 70% debited from houseBankroll and added to reserveMatic
  -> 30% remains in houseBankroll

owner withdrawal
  -> only free house balance, or emergency free balance after protected funds
```

**VERIFIED:** reserve, vault, claims, fees, house balance, and locked balance
are represented by separate state variables. Locked bankroll is a subcategory
of house bankroll and is not double-counted in reconciliation.

### PPL token

```text
constructor -> 10,000 PPL dev allocation
constructor initialization -> 90,000 PPL game/AMM allocation
loss mining -> at most 900,000 PPL minted to players
native buy -> PPL leaves AMM reserve to buyer
PPL sell -> PPL enters game; 5% is burned; remainder returns to AMM reserve
buyback/burn -> PPL leaves game reserve and is burned
```

**VERIFIED:** the game owns the token and is the only protocol mint/burn caller;
users can burn their own tokens. Genesis plus mining equals `MAX_SUPPLY`.

## Trust boundaries

| Boundary | Trust assumption |
|---|---|
| Chainlink coordinator | Authenticated callback is the source of paid randomness |
| Owner | Can pause, withdraw free house funds, consume vault via buyback, and trigger emergency shutdown |
| Dev address | Can withdraw accrued developer fees only |
| Player/receiver | Arbitrary calldata and native-token fallback behavior |
| AMM trader | Can observe and order public transactions; no oracle protects spot price |
| Frontend/API/RPC | Untrusted presentation/indexing layer; never authoritative for paid results |

## Token supply and mining

**VERIFIED:** `mintFromLossMining` checks caller, nonzero recipient, positive
amount, global supply cap, and mining allocation cap. `_mintLossMiningTokens`
uses 18-decimal conversion, caps each tier, and stops at exhaustion.

**TESTED/MODELLED:** exact tier boundaries, multi-tier loss, post-exhaustion
transition, repeated cap attempts, and supply invariants. No owner path can
directly mint.

**ECONOMIC OBSERVATION:** loss mining rewards are transferable and can be sold
through the AMM. At seeded local reserves, reward value is below the loss value
before fees/impact. This is a product/economic characteristic, not proof of
future token value.

## Post-mining 70/30 analysis

**VERIFIED/TESTED:** `_buybackToPlayer` computes 70% of net loss, debits that
amount from `houseBankroll`, increments `reserveMatic` by exactly that amount,
decrements `reserveToken`, and transfers tokens to the player. The retained 30%
is not added a second time. The regression test
`keeps post-mining buybacks inside the native accounting envelope` passes.

The 70/30 parameter was not changed.

## Solvency and bankroll admission

**VERIFIED:** the formal local equation is:

```text
houseBankroll + reserveMatic + vaultMatic
  + totalPendingWithdrawals + devFeesAccrued
<= address(game).balance
```

Admission locks the maximum multiplier payout before accepting a game. Pending
games increase both house funds by the net bet and locked capacity by the
maximum payout; cumulative games cannot exceed available bankroll. Settlement
releases the exact lock and debits the actual payout.

**TESTED:** pending games, clustered/out-of-order settlement, failed receivers,
claims, swaps, emergency withdrawal protection, post-mining branch, and the
10-seed stress suite.

## AMM audit

**VERIFIED:** swaps use constant-product-style reserve updates, 5% fees,
30%-of-reserve impact limits, 100 native-unit maximum input/value, slippage
checks, SafeERC20, and nonReentrant. Token reserve is checked against actual
game token balance. AMM native reserve and house bankroll are separate.

**TESTED:** initialization, both directions, fees, burns, slippage, low
liquidity, repeated swaps, reserve reconciliation, and buyback/burn.

**MEDIUM / OPEN:** the AMM has no time-weighted oracle or anti-MEV mechanism.
Large permitted trades can move its spot price up to the configured impact
bound, and post-mining/player buyback transactions are observable. This is not
an immediate solvency break, but public launch requires independent AMM/MEV
review and transaction-order policy.

## Buyback and burn semantics

**VERIFIED:** `burnFrom` calls OpenZeppelin `_burn`, reducing `totalSupply`;
transfers to the game are not described as burns. PPL-to-native swap burns the
5% token fee. Owner and automatic buyback paths burn tokens held by the game.

## VRF and game settlement

**VERIFIED/TESTED:** only the configured coordinator can call the callback;
unknown authenticated requests reject; request/game IDs must match; settled
games cannot settle again; pending game state is recorded before request;
frontend/demo state is not used in payout calculation.

## VRF liveness

**MEDIUM / OPEN:** if VRF never fulfills, the game remains pending and its
maximum payout remains locked indefinitely. There is no expiry/refund path.
Adding one safely requires a protocol design that cannot race with a late
callback or permit a double release, so no automatic change was made.

## Callback gas

**TESTED:** local measurements:

| Path | Gas |
|---|---:|
| One-ball game creation | 476,318 |
| 256-ball callback | 1,462,695 |
| Loss-mining tier-crossing callback | 424,069 |
| Native buy | 102,646 |
| Token sell | 107,860 |

Headroom is approximately 537,305 gas against the configured 2,000,000 limit.
The measurement is local and does not prove real Chainlink callback behavior;
failed receiver and post-mining branches remain operational test requirements.

## Privileged-action matrix

| Function | Actor | Maximum technical impact | Production control |
|---|---|---|---|
| `pauseGame`, `pauseSwap`, shutdown | owner | Freeze gameplay/swaps; shutdown is time-limited cancellation | multisig; monitored emergency role |
| `withdrawProfits` | owner | Withdraw available house funds, not locked funds | multisig/timelock policy |
| `emergencyWithdraw` | owner | Withdraw free native balance after protected categories; requires pause and no locks | multisig with incident procedure |
| `buybackAndBurn` | owner | Consume vault native funds and reduce token supply/AMM reserve | multisig, transparent events |
| `setDevAddress` | owner | Redirect future dev-fee withdrawals | multisig and timelock |
| `setMaxBetTotal` | owner | Change exposure ceiling, with contract minimum | timelock and announcement |
| `withdrawDevFees` | dev address | Withdraw accrued dev-fee liability only | separate controlled recipient |
| token mint/burnFrom | game contract | Protocol issuance/burn under game logic | immutable token/game coupling |
| VRF callback | configured coordinator | Settle a pending game using supplied randomness | coordinator/subscription security |

**VERIFIED:** owner cannot directly mint PPL, alter VRF coordinator, or
withdraw AMM reserves through the free-house withdrawal path. A compromised
owner can still drain free house capital, pause the protocol, consume vault
funds, and alter max-bet policy; this is a mainnet governance blocker.

## Economic attack scenarios

**MODELLED:** loss -> PPL mint -> AMM sale is not mechanically profitable at
the seeded local price; minting is bounded and sale incurs fee/price impact.

**TESTED:** repeated alternating swaps and randomized game/swap sequences did
not violate accounting, supply, or reserve invariants.

**NOT TESTED:** same-block sandwich execution, flash-loan capital, or public
Polygon mempool ordering. These remain MEV/economic review requirements.

## Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| T-01 | MEDIUM | VRF fulfillment has no expiry/refund path; funds can remain locked if the coordinator never fulfills | OPEN; design decision required |
| T-02 | MEDIUM | Custom AMM has bounded but manipulable spot price and no oracle/MEV protection | OPEN; independent AMM review required |
| T-03 | LOW | Owner `transfer`-based withdrawals can fail for contract recipients | OPEN; operability only |
| T-04 | LOW | Deployment script allows unknown non-Polygon network names if explicitly invoked with matching chain metadata | OPEN hardening recommendation; no public deployment performed |
| T-05 | INFO | No independent smart-contract/economic audit or real Polygon execution | EXTERNAL |

No new Critical or High finding was proven. No code or economic parameter was
changed during this focused audit.

## Mainnet blockers

**REQUIRED BEFORE MAINNET:** independent contract/economic audit; multisig or
timelock owner; real Chainlink VRF v2.5 Amoy validation; operational handling
for stuck VRF; AMM/MEV review; monitoring and incident response; resolve the
bounded-history/indexing limitation.

**RECOMMENDED:** immutable/strongly constrained configuration, controlled
treasury roles, staged liquidity, withdrawal runbooks, and public invariant
monitoring.

## External/legal-compliance items

**EXTERNAL / LEGAL-COMPLIANCE:** jurisdiction-specific gambling rules,
token/securities characterization, AML/KYC, age and geographic restrictions,
responsible-gaming controls, RTP/odds disclosures, treasury custody, and
consumer disclosures require specialist review. This audit provides no legal
conclusion.

## Monitoring requirements

**RECOMMENDED:** monitor native balance, house/locked bankroll, all claim and
fee liabilities, pending VRF age and callbacks, AMM reserves, large swaps,
total supply, mining emitted/remaining, buyback/burn events, pause/shutdown,
and failed payout claims. Alerts should fire on reconciliation failure,
unusually old requests, low free bankroll, and reserve imbalance.
