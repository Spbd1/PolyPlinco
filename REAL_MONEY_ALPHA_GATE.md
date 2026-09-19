# Real-Money Alpha Gate

The private VPS rehearsal is not approval for real-money operation. The
current no-money mode intentionally disables paid transactions and uses zero
contract addresses.

## Required before any closed real-money alpha

- approved public-chain addresses, bytecode, chain ID, and deployment commit
  verified from an off-server operator environment;
- owner/admin, treasury, developer-fee, deployer, and VRF subscription keys
  kept off the web VPS;
- funded bankroll and AMM state reconciled before opening access;
- monitoring active for balance divergence, free/locked bankroll, pending VRF,
  failed payouts, dev fees, reserves, supply, burns, and rejected games;
- pause and incident procedures exercised from a clean secure machine;
- TLS, DNS, firewall, restore, and rollback checks complete;
- product disclosures and specialist legal/compliance review complete.

## Open protocol/product blockers

- stuck VRF request liveness and safe recovery;
- AMM spot-price/MEV manipulation risk and owner acceptance or mitigation;
- reorg-aware indexing and history consistency;
- public-chain deployment and external verification;
- gambling, token, AML/KYC, age/geographic, custody, and responsible-gaming
  review by qualified specialists.

## Trust boundary

The browser wallet signs user transactions. Contracts determine randomness,
outcomes, payouts, token burns, bankroll admission, and settlement. A
compromised web VPS may deface or censor the UI and return stale/misleading
read-only data, but must not possess a key capable of changing protocol state
or paid outcomes. Users must verify wallet prompts and network; a malicious
website remains a phishing/presentation risk even without keys.
