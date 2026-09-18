# Dependency Security Review

Date: 2026-09-18 (remediation pass)
Package manager: pnpm 9.15.0
Registry: `https://registry.npmjs.org/`

## Before and after

| Graph | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|
| Production, before | 3 | 37 | 61 | 9 |
| Production, after | 0 | 0 | 3 | 0 |
| Full graph, after | 0 | 18 | 42 | 6 |

The mandatory `pnpm audit --prod --audit-level=high` command exits successfully
after remediation. The full-graph High records are all build/dev-only
Solidity, Hardhat, compiler, or test paths; none is in the production graph.

## Critical advisories

| Advisory | Before | Patched/resolved | Path and disposition |
|---|---|---|---|
| 1111368 | `next@16.0.3`, direct production (also via `@vercel/analytics`) | `next@16.3.3` | React Flight RCE; **FIXED**, production audit clear |
| 1193676 | `next@16.0.3`, direct production | `next@16.3.3` | Windows-hosted server RCE; **FIXED**, production audit clear |
| 1193732 | `next@16.0.3`, direct production | `next@16.3.3`, `sharp@0.35.4` | AVIF/image optimization RCE; **FIXED**, production audit clear |

There are zero unresolved reachable or potentially reachable production
Critical advisories.

## High advisory disposition

Before remediation, the High records included Next.js, sharp, ws, nested
OpenZeppelin, serialize-javascript, undici, tmp, adm-zip, and PostCSS paths.
The production-relevant families were remediated as follows:

| Advisory/family | Before -> after | Classification after | Evidence |
|---|---|---|---|
| Next.js: 1111383, 1112646, 1116375, 1117930, 1118938, 1118949, 1118953, 1118955, 1118959, 1118961, 1124170, 1124171, 1124184, 1124192 | `next@16.0.3` -> `16.3.3` | **FIXED** | No production High record remains. |
| sharp: 1124066, 1193725 | `0.34.5` -> `0.35.4` | **FIXED** | Resolved through the Next production tree; no production High record remains. |
| ws: 1123259 | `8.18.0` -> `8.21.0` | **FIXED/REDUCED** | pnpm override resolves the patched version; no production High record remains. |
| OpenZeppelin / OpenZeppelin-upgradeable: 1088892, 1088893, 1089255, 1089256, 1089264, 1089265, 1090186, 1090187, 1091838, 1091839 | nested Chainlink/Arbitrum sources | **BUILD/DEV ONLY — OPEN** | `@chainlink/contracts` and OpenZeppelin sources are now devDependencies and are not installed in the production graph. |
| serialize-javascript: 1113686; undici: 1114638, 1114640, 1121245; tmp: 1120654; adm-zip: 1123686 | Hardhat/solc/test paths | **BUILD/DEV ONLY — OPEN** | Not shipped by the Next standalone runtime; independent upgrades risk compiler/test compatibility. |

The remaining 18 full-graph High records are explicitly classified as
**BUILD/DEV ONLY**, not silently marked harmless. No production Critical or
High remains. The production graph retains three Moderate wallet-connector
advisories for future dependency hygiene.

## Exact changes

- `next`: 16.0.3 -> 16.3.3
- `eslint-config-next`: 16.0.3 -> 16.3.3
- resolved `sharp`: 0.34.5 -> 0.35.4
- resolved `ws`: 8.18.0 -> 8.21.0 via pnpm override
- Solidity/Hardhat/compiler/test-only packages moved from `dependencies` to
  `devDependencies` without changing their requested versions
- no major upgrade was required

The lockfile was regenerated and a subsequent `pnpm install --frozen-lockfile`
completed successfully. The full application gate also passed with Next 16.3.3.

This is dependency triage and compatibility validation, not an independent
security audit. F-07 remains a separate bounded-history/indexing limitation.
