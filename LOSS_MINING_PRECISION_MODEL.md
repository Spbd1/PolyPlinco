# Loss-Mining Precision Model

This document records the arithmetic used by the loss-mining implementation.
It does not change the approved tokenomics: the nine tiers, tier capacities,
prices, 900,000 PPL mining allocation, and positive-net-loss definition remain
unchanged.

## Units

- `netLoss`: native-asset wei.
- `pricePerToken`: native-asset wei per one whole PPL. Dividing scaled loss by
  this value returns PPL smallest units.
- `remainingLossX18`: native-asset wei scaled by `1e18`.
- token quantities and `miningEmitted`: PPL smallest units.

The calculation starts with:

```text
remainingLossX18 = netLoss * 1e18
tokensAffordable = remainingLossX18 / pricePerToken
tokensToMint = min(tokensAffordable, tierRemaining)
costX18 = tokensToMint * pricePerToken
remainingLossX18 -= costX18
```

The loss remains scaled while crossing tiers. It is not converted back to
integer native wei between tiers. A minting iteration therefore cannot mint a
positive amount while consuming zero scaled loss: a positive token amount and
positive tier price imply `costX18 > 0`, and the affordability division makes
`costX18 <= remainingLossX18`.

The loop is explicitly bounded by `NUM_TIERS`. When mining reaches its final
allocation, only `remainingLossX18 / 1e18` whole native wei can enter the
post-mining buyback path. A sub-wei remainder is discarded conservatively and
cannot create an extra transferable wei.

## Independent reference model

`scripts/loss-mining-reference.cjs` implements the loss-centric model and the
former reverse-conversion model independently of Solidity. The focused tests
use it for deterministic multi-tier, dust, progress, and differential cases.
