# PolyPlinco Economic Invariants

Audit baseline: `bddc08376f7c7dd05239e8e2febd60f3402587d4`
Scope: local Hardhat/mock-VRF execution only. No deployment was performed.

## Owner-approved post-mining policy update

The native accounting invariant remains 70% buyback / 30% retained. After the
buyback, purchased PPL is now split into 30% real burn and 70% player using
fixed basis-point arithmetic. This changes token supply only; it does not
change native protected-liability accounting.

## Native accounting

**VERIFIED** from `PolyPlinkoGame.sol` and `scripts/reconcile.ts`:

```text
protectedNative = houseBankroll
                + reserveMatic
                + vaultMatic
                + totalPendingWithdrawals
                + devFeesAccrued

protectedNative <= address(game).balance
lockedBankroll <= houseBankroll
reserveToken <= PPL.balanceOf(game)
totalSupply <= MAX_SUPPLY
miningEmitted <= MINING_SUPPLY
```

`houseBankroll` includes the locked portion; `lockedBankroll` is a subcategory,
not an additional amount to add to the native equation.

## Operation effects

| Operation | Native effect | Protected-accounting effect |
|---|---|---|
| Seed | balance increases; half becomes AMM reserve and half house | exact initial split |
| Game request | total bet enters; 1% dev fee and 99% net bet are recorded; max payout is locked | liabilities remain backed |
| Settlement | payout leaves balance or becomes a claim; max lock is released | claim is explicitly reserved on failure |
| Dev-fee withdrawal | balance and `devFeesAccrued` decrease equally | pull liability preserved until transfer |
| Native buy | 95% enters AMM reserve, 5% enters vault | exact fee separation |
| Token sell | AMM reserve pays output; token input is added minus burned fee | token reserve and supply update together |
| Post-mining buyback | house debits 70%; AMM native reserve increases by the same amount; 30% remains in house | no double addition |
| Emergency withdrawal | only free balance after reserve/vault/claims/dev fees and with no locked game funds | protected categories cannot be withdrawn |

## Token invariants

**VERIFIED:** genesis allocation is 10,000 PPL to dev plus 90,000 PPL to the
game, and future mining is capped at 900,000 PPL. These sum exactly to the
1,000,000 PPL maximum. Only the game address can call loss-mining minting and
the token enforces both the global cap and mining cap.

**TESTED:** contract suite, mining tier tests, post-mining accounting test,
supply-bound stress checks, and the independent tier simulation.

## Limitations

**ASSUMED:** native donations received through `receive()` are intentionally
available to house accounting and are not separately classified.

**NOT TESTED:** real Chainlink VRF, real Polygon execution, flash-loan/MEV
conditions on a public mempool, or an independent economic audit.

**TESTED:** The owner-approved post-mining split preserves
`burnedPPL + playerPPL == purchasedPPL`, reduces totalSupply by exactly the
real burn, and leaves the native reconciliation unchanged.
