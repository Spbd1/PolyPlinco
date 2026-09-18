# Local Release Candidate Status

Date: 2026-09-18 (dependency remediation complete)
Baseline checkpoint: `04bc12d9b0d8f7e524478d2b8413cdd1932f2952`
Scope: local chain and local application only; no Amoy/mainnet deployment.

## Gate summary

| Area | Status | Evidence |
|---|---|---|
| Contract tests | PASS | 29 passing |
| Stateful stress | PASS | 10 deterministic seeds, 1,000 attempts each; 9,994 successful, 6 expected bankroll rejections, 0 unexpected failures |
| Accounting | PASS | Protected native/token reconciliation passed |
| Local VRF | PASS | Authenticated request mapping, exactly-once settlement, unknown-request rejection |
| AMM | PASS | Local buy/sell, fees, slippage and reserve checks passed |
| Independent RTP | PASS | 75 configurations, 90.03%–90.48% |
| Callback gas | PASS with margin | 256-ball measurement 1,462,695 gas against 2,000,000 configured limit |
| Click-to-Drop browser regression | PASS | Lightweight Chromium/CDP test passed default-off, confirmation/cancel/persistence, left/right origin, pointer path, existing demo controls and paid separation |
| TypeScript | PASS | `pnpm typecheck` |
| ESLint | PASS | `pnpm lint` |
| Next production build | PASS | `pnpm build` |
| CI security gating | PASS | Mandatory pnpm production audit, lint and secret steps gate successfully; Snyk/Slither/Mythril remain explicitly optional external scanners |
| Docker | PASS (prior unchanged validation) | No Docker files changed in this pass |
| Dependency security | FIXED for production gate | Production audit: 0 Critical, 0 High, 3 Moderate, 0 Low. Full graph retains 18 build/dev-only High records. |
| Complete history/indexing | OPEN / ACCEPTED RISK | F-07 bounded recent-window behavior; reorg-aware indexer remains a pre-production requirement |

## Findings status

- Critical protocol findings: 0.
- High protocol findings: 0 open; F-01, F-02 and F-03 remain covered by
  regression tests.
- Medium findings: F-06 **FIXED for the production release gate**; F-07
  **OPEN / known limitation** (bounded history). F-04 and F-05 are fixed.
- Low findings: in-memory rate limiting and admin `transfer` operability remain
  documented; neither was changed in this pass.

## External dependencies and blockers before Amoy

1. Decide the operational scope for the bounded history view and provide an
   indexed/reorg-aware history service before claiming complete production
   history.
2. Complete current official Chainlink VRF v2.5 Amoy configuration,
   subscription/funding, callback, latency and explorer verification work.
3. Obtain an independent contract/economic/security audit and establish
   production multisig/timelock administration.
4. Confirm the intentionally unchanged 70% buyback / 30% retained economic
   decision with the owner.

The release-candidate dependency condition is **MET**. F-07 remains an open
future scalability/reorg-hardening item and is intentionally not implemented in
this pass.
