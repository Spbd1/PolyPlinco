# Local gas benchmark

Measured with Hardhat's local EVM after the fixed 5% game-liability admission
cap. The gas fixture uses 0.006 native per ball and a 1,000-unit seed so the
256-ball request remains admissible under the cap; the callback workload is
unchanged by the wager denomination.

| Operation | Estimated gas | Actual gas |
| --- | ---: | ---: |
| Local coordinator deployment | — | 334,477 |
| PolyPlinkoGame deployment | — | 5,802,353 |
| Create one-ball game/request | 476,532 | — |
| Fulfill 1-ball game | 460,870 | 444,380 |
| Fulfill 32-ball game | 579,724 | 561,625 |
| Fulfill 128-ball game | 952,844 | 928,365 |
| Fulfill 256-ball game | 1,462,695 | 1,429,198 |
| Post-mining 256-ball callback | 1,484,715 | 1,450,714 |

The callback limit is 2,000,000 gas. For the worst measured post-mining branch:

```text
estimated headroom = 2,000,000 - 1,484,715 = 515,285 gas
actual headroom    = 2,000,000 - 1,450,714 = 549,286 gas
```

The 515,285 figure is estimated headroom; 549,286 is actual measured
headroom. These are local execution measurements, not a guarantee of fees or
block inclusion on Polygon.
