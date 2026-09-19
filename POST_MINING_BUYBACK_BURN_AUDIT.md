# Post-Mining Buyback/Burn Audit

Date: 2026-09-19
Release candidate: `bddc08376f7c7dd05239e8e2febd60f3402587d4`
Scope: current local implementation only. No contract or tokenomics changes were made.

> **OWNER-APPROVED UPDATE (2026-09-19):** This document preserves the prior 0% implementation characterization. The approved implementation now keeps native 70% buyback / 30% retained and applies purchased PPL as 30% real burn / 70% player. The current post-change characterization is recorded below.

## Executive result

**VERIFIED / TESTED:** The automatic post-mining player buyback does **not** burn PPL. It buys PPL from the AMM, decreases the AMM PPL reserve, and transfers the acquired PPL to the losing player. In the local characterization transaction:

- net loss: `0.003347` native;
- 70% buyback amount: `0.0023429` native;
- PPL bought: `4.217022398764438695 PPL`;
- player PPL balance increased by exactly that amount;
- AMM PPL reserve decreased by exactly that amount;
- game-held PPL reserve decreased by exactly that amount;
- `totalSupply` delta: **0**.

**VERIFIED / TESTED:** A separate owner-triggered `buybackAndBurn()` path does perform a real burn. In the same local characterization harness, it burned `8.964163953320713283 PPL`, and totalSupply decreased by exactly that amount.

**CONCLUSION:** The current system is a **hybrid model**, not an automatic post-mining deflationary player-buyback model. Buyback alone is not burn. Post-mining totalSupply is currently flat unless a user calls `PPL.burn`, a PPL-to-native swap burns its fee, the vault-triggered automatic burn runs, or the owner manually calls `buybackAndBurn()`.

No burn percentage was selected or implemented.

## Repository and simulation state

**VERIFIED:** Current repository state:

- branch: `main`;
- HEAD: `bddc08376f7c7dd05239e8e2febd60f3402587d4`;
- the release-candidate commit is the requested ancestry point;
- no deployment or push occurred.

**VERIFIED:** `scripts/economic-sustainability.cjs` exists, but it is currently an untracked working-tree file and has no Git history entry. It was not present in `git ls-files scripts/` or `git log --all -- scripts/economic-sustainability.cjs`. The prior report described a working-tree artifact, not a committed release-candidate file.

**TESTED:** The script was executed twice from the repository and produced identical SHA-256 output:

```text
5d38bfd4168d41c40a93483d28418738ee0faf253b1607799f523c4ef9135034
```

It calculates current formulas rather than embedding the prior report’s output. It includes the actual current burn classes: PPL-to-native fee burns, owner/automatic buyback burns, and no burn in player post-mining buybacks.

## Exact current post-mining flow

**VERIFIED from `contracts/PolyPlinkoGame.sol`:**

1. A game settles through the authenticated VRF callback.
2. `netBet = totalBet - totalBet / 100`.
3. If `netBet > totalPayout`, `netLoss = netBet - totalPayout`.
4. After mining exhaustion, `_handleLossReward()` calls `_buybackToPlayer()`.
5. `buybackAmount = netLoss * BUYBACK_PERCENT / 100`, where `BUYBACK_PERCENT = 70`.
6. The AMM formula computes `tokensBought = buybackAmount * reserveToken / (reserveMatic + buybackAmount)`.
7. `houseBankroll` is debited by `buybackAmount`.
8. `reserveMatic` increases by `buybackAmount`.
9. `reserveToken` decreases by `tokensBought`.
10. `IERC20(pplToken).safeTransfer(player, tokensBought)` transfers the bought PPL to the player.
11. No `_burn`, `burn`, or `burnFrom` call occurs in `_buybackToPlayer()`.

The remaining 30% of the net loss remains represented in house accounting. The previous double-counting fix remains intact.

## Local post-mining characterization

**TESTED:** Local Hardhat harness:

```text
scripts/post-mining-buyback-audit.ts
```

The harness sets `miningEmitted` to `MINING_SUPPLY` in a local-only storage fixture, seeds 90,000 PPL and 100 native units, then plays one game and fulfills the mock VRF with seed `1`. The result is a genuine losing game and executes the post-mining branch.

### Before/after values

All token values below are ERC-20 base units; native values are wei.

| Quantity | Before | After | Delta |
|---|---:|---:|---:|
| totalSupply | 100,000 PPL | 100,000 PPL | 0 |
| AMM PPL reserve | 90,000 PPL | 89,995.782977601235561305 PPL | -4.217022398764438695 PPL |
| AMM native reserve | 50 | 50.0023429 | +0.0023429 |
| Game PPL balance | 90,000 PPL | 89,995.782977601235561305 PPL | -4.217022398764438695 PPL |
| Player PPL balance | 0 | 4.217022398764438695 PPL | +4.217022398764438695 PPL |
| Dev PPL balance | 10,000 PPL | 10,000 PPL | 0 |
| House bankroll | 50 | 50.0010041 | +0.0010041 |
| Dev fee liability | 0 | 0.0001 | +0.0001 |
| Actual game native balance | 100 | 100.003447 | +0.003447 |

The settlement emitted:

```text
netLoss       = 0.003347 native
maticUsed     = 0.0023429 native
tokensBought  = 4.217022398764438695 PPL
totalPayout   = 0.006553 native
```

**VERIFIED:** Native reconciliation holds:

```text
houseBankroll + reserveMatic + devFeesAccrued
= 50.0010041 + 50.0023429 + 0.0001
= 100.003447
= actual contract native balance
```

The 70/30 native behavior therefore remains PASS and was not changed.

## All current PPL burn paths

| Burn path | Caller/trigger | Amount | TotalSupply decreases? | Automatic? |
|---|---|---:|---|---|
| `PolyPlinkoToken.burn(amount)` | Token holder calls directly | Caller-selected balance | Yes, via OpenZeppelin `_burn` | User-triggered |
| `PolyPlinkoToken.burnFrom(address(this), amount)` in PPL→native swap | User executes token sale through game | 5% token-side swap fee | Yes | User-triggered protocol fee |
| `_autoBuybackAndBurn()` | Native swap causes vault to reach `MAX_VAULT_BALANCE` | All PPL purchased by that automatic vault buyback | Yes, via `burnFrom` | Automatic threshold-triggered |
| `buybackAndBurn()` | Owner only, using `vaultMatic` | All PPL purchased in that owner operation | Yes, via `burnFrom` | Manual/admin |
| `_buybackToPlayer()` | Post-mining losing game | 0 burn; bought amount sent to player | No | Automatic player buyback |

No dead-address transfer was found. No PPL token transfer to an address merely called “dead” is used as a substitute for burning.

## Separate owner buyback-and-burn characterization

**TESTED:** The same local harness first generated vault fees with a native-to-PPL swap, then called owner-only `buybackAndBurn()`.

| Quantity | Before | After | Delta |
|---|---:|---:|---:|
| totalSupply | 100,000 PPL | 99,991.035836046679286717 PPL | -8.964163953320713283 PPL |
| vaultMatic | 0.005 | 0 | -0.005 |
| BuybackAndBurn event | — | 8.964163953320713283 PPL burned | exact |

The emitted event reported:

```text
maticSpent    = 0.005 native
tokensBurned = 8.964163953320713283 PPL
```

This path is `onlyOwner`; it is not the player’s automatic post-mining reward path.

## Implementation/design comparison

**VERIFIED:** The current implementation matches this model:

- post-mining player loss: buy PPL and transfer it to player;
- PPL-to-native swap: burn the 5% token fee;
- vault threshold or owner operation: buy PPL and burn the purchased amount;
- direct holder burn: available to token holders.

**OWNER DECISION REQUIRED:** If intended product behavior is “some portion of every post-mining player buyback is burned,” the current implementation does not match that intent. The current code burns **0%** of `_buybackToPlayer()` purchases, while its separate buyback-and-burn paths burn 100% of the amount they purchase.

## Economic simulation comparison

**SIMULATED:** The reproducible simulation confirms the source behavior:

- mining exhaustion reaches 900,000 emitted PPL and the 1,000,000 cap;
- post-mining player buybacks reduce AMM PPL reserves and send PPL to players;
- post-mining player buybacks do not reduce totalSupply;
- modeled supply reduction occurs only when an actual burn path is invoked;
- immediate loss → PPL → sell remains loss-making in the tested AMM states.

The report’s previous statement that player post-mining buybacks do not automatically burn PPL is therefore consistent with current source and execution.

## Safe future implementation options

No option is selected. A future owner-approved patch could use one of these minimal models:

### Option A — burn all player-buyback PPL

Buy PPL from the AMM, burn the entire acquired amount, and do not transfer PPL to the player. TotalSupply decreases by the bought amount; AMM PPL reserve decreases; player receives no PPL. This changes the user reward semantics substantially.

### Option B — burn an owner-approved fixed percentage

Buy PPL, burn an explicitly selected percentage, and transfer the remainder to the player. TotalSupply decreases only by the burned amount; AMM reserve decreases by the full purchase; player receives the remainder. The percentage must be an explicit product/economic decision and must not be inferred from the existing 70/30 native split.

### Option C — burn a fixed percentage and route the remainder to an existing protocol reserve

Buy PPL, burn the selected portion, and retain the remainder in a clearly defined existing protocol balance. This has the strongest accounting/governance implications because retained PPL must not be double-counted as AMM reserve, house bankroll, or player liability.

## Required regression tests for any future patch

**OWNER DECISION REQUIRED / NOT IMPLEMENTED:** Any future burn change should add tests for:

- exact `totalSupplyBefore - totalSupplyAfter == burnAmount`;
- burn amount never exceeding PPL bought;
- AMM PPL reserve decreasing by the full amount purchased;
- native 70/30 reconciliation unchanged;
- treasury and game PPL balances reconciled;
- MAX_SUPPLY and mining-cap invariants;
- post-mining branch cannot mint;
- repeated buybacks produce cumulative exact burns;
- zero-liquidity and tiny-buyback rounding;
- large buyback and reserve-impact limits;
- no double-burn;
- no unauthorized burn path;
- player destination and event amounts matching the selected policy.

## Final determination

| Question | Result |
|---|---|
| Economic simulation reproducible? | **YES**, script exists in working tree and two runs matched byte-for-byte; it is currently untracked |
| Post-mining player buyback buys PPL? | **YES**, when liquidity and loss conditions permit |
| Post-mining player buyback automatically burns PPL? | **NO** |
| Current automatic burn percentage on player buyback | **0%** |
| Does totalSupply decrease automatically after post-mining player buyback? | **NO** |
| Separate owner buyback-and-burn exists? | **YES** |
| Does owner buyback-and-burn reduce totalSupply? | **YES**, exact acquired amount |
| 70/30 native accounting | **PASS** |
| Supply-cap/mining-cap invariants | **PASS** under existing regression suite and current characterization |
| Current implementation match intended partial-burn design? | **NO / OWNER DECISION REQUIRED** |

The next owner decision is whether automatic player post-mining buybacks should remain non-burning, or whether an explicitly chosen burn policy should be specified. No percentage should be implemented until that decision is made.

## Current implementation after owner approval

The preceding sections are historical pre-change evidence. The owner-approved
implementation now uses `POST_MINING_BURN_BPS = 3000` and
`BPS_DENOMINATOR = 10000`:

- native: 70% buyback / 30% retained;
- purchased PPL: 30% real burn / 70% player.

The post-change local characterization with the same seed bought
`4.217022398764438695 PPL`, burned `1.265106719629331608 PPL`, and sent
`2.951915679135107087 PPL` to the player. TotalSupply decreased by exactly the
burn amount. AMM PPL/native and native house-accounting deltas remained the
same as the pre-change characterization. This was an owner-approved product
decision, not an audit-discovered security fix.
