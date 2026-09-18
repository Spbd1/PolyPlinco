# Polygon Amoy Validation

Status: **BLOCKED before external deployment**

Validation date: 2026-09-18  
Repository commit at start: `66582ed74c49beaa20f95a4609f8ec7570be43aa`  
Solidity compiler: `0.8.20`, optimizer enabled, 200 runs  
Hardhat: `2.29.1`  
Chainlink contracts package: `@chainlink/contracts 1.3.0`

## Official network configuration checked

Checked 2026-09-18 against the official documentation, not repository examples:

- Polygon Amoy chain ID: `80002`; current Polygon RPC directory endpoint: `https://polygon-amoy.drpc.org`.
- Chainlink VRF v2.5 coordinator: `0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2`.
- VRF v2.5 Amoy LINK token: `0x0fd9e8d3af1aaee056eb9e802c3a762a667b1904`.
- 500 gwei gas lane/key hash: `0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899`.
- Minimum confirmations: `3`; coordinator maximum callback gas: `2,500,000`.
- Subscription billing supports testnet POL or testnet LINK. The request sets `nativePayment: true`.
- Subscription workflow: create/fund through the Chainlink Subscription Manager, deploy the consumer, then add the deployed consumer to the subscription.
- Configured callback limit for this project: `2,000,000`, below the official coordinator maximum and based on the local 256-ball gas measurement.

Sources: [Polygon RPC endpoints and network details](https://docs.polygon.technology/pos/reference/rpc-endpoints), [Chainlink VRF v2.5 supported networks](https://docs.chain.link/vrf/v2-5/supported-networks), [Chainlink VRF v2.5 getting started](https://docs.chain.link/vrf/v2-5/getting-started), and [Chainlink Subscription Manager](https://vrf.chain.link/).

## External blocker

No Amoy broadcast was made. The deployment-only environment had all of the following missing: `POLYGON_AMOY_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `VRF_SUBSCRIPTION_ID`, `VRF_COORDINATOR`, and `VRF_KEY_HASH`. `NEXT_PUBLIC_WC_PROJECT_ID` and an explorer API key were also unavailable.

The previously configured Polygon-operated endpoint `rpc-amoy.polygon.technology` was unreachable from this runner and is listed by Polygon as deprecated. The current directory endpoint `polygon-amoy.drpc.org` did respond to `eth_chainId` with `0x13882` (80002), but no external deployment, subscription creation, funding, or explorer verification was attempted because deployment credentials/subscription funding were still absent.

Required to resume only the external step:

1. A reachable Amoy RPC URL.
2. A deployment wallet private key supplied only as `DEPLOYER_PRIVATE_KEY`, with enough testnet POL for deployment and controlled smoke tests.
3. A funded Amoy VRF v2.5 subscription ID, with native POL or testnet LINK balance and permission to add the post-deployment consumer.
4. A WalletConnect project ID only for browser wallet testing; an explorer API key only if automated verification is desired.

## Local validation completed

- Solidity compile: PASS.
- Contract tests: PASS, 26 passing.
- ABI drift check: PASS.
- TypeScript: PASS.
- ESLint: PASS.
- Next.js production build: PASS. Build was made network-independent by removing the build-time Google font fetch.
- Expanded invariant stress: PASS; seed `0x5eedc0de`, 1 sequence, 1,000 state transitions, 98 swap actions, 0 failed receivers in this sequence, 0 failures.
- Local mock VRF lifecycle, settlement, AMM, failed-payment protection, and prior RTP/gas validations remain the validated baseline.

The reproducible stress command is:

```sh
node hardhat-run.cjs run scripts/invariant-stress.ts
```

The machine-readable on-chain reconciliation and pending-request diagnostic is:

```sh
node hardhat-run.cjs run scripts/reconcile.ts --network polygonAmoy
```

It reports chain ID, native balance, bankroll, locked bankroll, claim liabilities, AMM reserves, PPL supply, VRF configuration, and pending game/request IDs without exposing credentials.

## Amoy deployment and runtime evidence

Not executed because of the blocker above. Therefore these fields intentionally have no values:

- Game address: not deployed.
- Token address: not deployed.
- Deployment transaction hashes/blocks: none.
- VRF subscription ID used by a deployed consumer: none.
- VRF request/fulfillment transactions: none.
- Fulfillment latency and callback gas: not observed on real VRF.
- Maximum real-VRF ball count: none.
- AMM, frontend, wallet, API, explorer-verification, and recovery tests against Amoy: not run.

## Production-mode review

The deployed path uses `localMode=false`, calls the configured coordinator, authenticates callbacks by coordinator address, maps request IDs to game IDs, rejects unknown/replayed settlement, locks the maximum payout before requesting VRF, and has no owner/user fulfillment method. Pending state is stored on-chain; `scripts/reconcile.ts` provides recovery/observability without injecting randomness.

## Mainnet safety and remaining blockers

Mainnet was not used. Deployment tooling now hard-fails chain mismatches and requires `DEPLOY_MAINNET=YES_I_UNDERSTAND_POLYGON_MAINNET` in addition to the Polygon mainnet chain ID. That flag was not set.

Before any mainnet consideration, the remaining blockers include real Amoy VRF fulfillment evidence through 256 balls, callback-failure/recovery evidence, Amoy accounting reconciliation, AMM and frontend/API smoke tests, operational monitoring, governance/multisig ownership, funded production VRF, economic review, and an independent security audit. This document is not an audit.
