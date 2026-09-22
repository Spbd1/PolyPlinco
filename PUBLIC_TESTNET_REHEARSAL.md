# Public Testnet Rehearsal Plan

Target: Polygon Amoy (`chainId 80002`) only after explicit owner
authorization. This document is a plan; no public deployment was performed
for this audit.

## Required inputs

- funded testnet deployer key held off-server;
- `POLYGON_AMOY_RPC_URL`;
- official Amoy VRF coordinator, subscription ID, key hash, confirmations,
  and callback gas limit;
- owner/developer addresses and approved initial liquidity values;
- explorer verification credentials kept outside the web container.

## Sequence

1. Clean checkout at the release commit; run the release gate.
2. Create/fund the VRF subscription and register the future game consumer.
3. Run the guarded deployment script on Amoy with `localMode=false`.
4. Record addresses, deployment block/transaction, constructor args, and bytecode hashes.
5. Verify source on the explorer from the recorded compiler/optimizer settings.
6. Seed only testnet AMM liquidity and bankroll; reconcile all buckets.
7. Build the frontend with exact Amoy chain/address configuration.
8. Execute the matrix below and save transaction hashes/events.
9. Test pause, failed payout claim, 5% admission rejection, dev-fee withdrawal,
   swaps, mining, and post-mining burn characterization.
10. Remove the consumer/funding or pause and document cleanup after rehearsal.

## Test matrix

- wallet connection and wrong-chain hard stop;
- one-ball, 10-ball, 100-ball, and 256-ball games;
- rows 8, 16, and 32; Low/Medium/High risk;
- authenticated VRF request, callback, payout, and event reconciliation;
- concurrent pending games and out-of-order fulfillment;
- loss-mining tier transition and exhaustion fixture where feasible;
- post-mining 70/30 native and 30/70 purchased-PPL burn/player flow;
- PPL buy/sell, 5% fee burn, vault threshold, and owner buyback path;
- 5% free-bankroll rejection at one-wei boundaries;
- pause, failed transaction UX, readiness/RPC outage, and restart.

## Exit criteria

No real-money funding, no mainnet deployment, no unexplained accounting
surplus, no ABI mismatch, no callback authentication failure, and no result
whose authoritative bucket differs from the UI. Real-money launch remains a
separate decision after external and compliance gates.
