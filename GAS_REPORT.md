# Local gas benchmark

Measured with Hardhat's local EVM after the pending-request/VRF callback refactor:

| Operation | Gas |
| --- | ---: |
| Local coordinator deployment | 334,477 |
| PolyPlinkoGame deployment | 5,599,970 |
| Create one-ball game/request | 465,461 |
| Fulfill and settle 256-ball game | 1,460,397 |
| MATIC → PPL buy (0.01 POL) | 102,711 |
| PPL → MATIC sell (1 PPL) | 107,908 |
| Loss-mining settlement | 421,763 |

The application maximum is 256 balls. The default production callback gas configuration
is 2,000,000 and must be rechecked against the selected Polygon coordinator/gas lane
before testnet deployment. These are execution measurements, not a guarantee of fees or
block inclusion on Polygon.
