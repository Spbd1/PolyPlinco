# Amoy readiness checklist

No Amoy transaction is performed by local validation.

Target network: Polygon Amoy, chain ID `80002`.

The current Polygon RPC directory lists `https://polygon-amoy.drpc.org` as the
Amoy endpoint. The former Polygon-operated `rpc-amoy.polygon.technology` endpoint
was deprecated in July 2026; set `POLYGON_AMOY_RPC_URL` explicitly to a current
provider before deployment.

Before deployment, provide server/deployment-only values for `POLYGON_AMOY_RPC_URL`,
`VRF_COORDINATOR`, `VRF_SUBSCRIPTION_ID`, `VRF_KEY_HASH`,
`VRF_REQUEST_CONFIRMATIONS`, and `VRF_CALLBACK_GAS_LIMIT`. Keep `PRIVATE_KEY` outside
all `NEXT_PUBLIC_*` variables and outside version control.

Deployment order:

1. Create and fund a Chainlink VRF v2.5 subscription with test POL/LINK as required by
   the selected Polygon coordinator and add the game as a consumer.
2. Deploy `PolyPlinkoGame` with the coordinator and subscription configuration and
   `localMode=false`.
3. Verify the deployed game/token addresses and configured coordinator on-chain.
4. Initialize local/test liquidity with a deliberately bounded bankroll.
5. Submit one small game, confirm it remains pending, then wait for the coordinator
   callback and verify `GameSettled`, payout, token accounting, and reserves.
6. Exercise both swap directions and failed-payment claim handling.

Failure handling: stop new games, preserve pending liabilities, inspect coordinator
request status and callback gas, and use the owner pause/emergency controls. Do not
withdraw funds while locked bankroll or claimable payouts remain. Rollback means
pausing the deployment and abandoning the testnet instance; contracts are not
upgradeable.

Build-time configuration: `NEXT_PUBLIC_*` contract addresses are embedded in the
Next.js client bundle during `pnpm build`. Inject target addresses before building
the image; changing only runtime container variables does not rewrite an existing
client bundle. Compose exposes matching Docker build arguments.

Remaining risks before Amoy are external coordinator/subscription configuration,
production RPC reliability, independent contract audit, and testnet-specific gas and
liquidity validation. Mainnet requires governance/multisig ownership, funded VRF,
operational monitoring, economic review, and an independent security audit.
