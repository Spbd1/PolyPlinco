# Pre-Funding Checklist

This gate must be completed from a clean operator machine immediately before
any native or token funding. It is not satisfied by a local mock deployment.

- [ ] Exact chain ID and network confirmed.
- [ ] Git commit, compiler/optimizer settings, bytecode hashes, and constructor args recorded.
- [ ] Game/token addresses copied from deployment output and independently checked on the explorer.
- [ ] Owner, developer address, VRF coordinator, subscription, key hash, confirmations, and callback gas verified.
- [ ] `MAX_SUPPLY=1,000,000`, mining allocation `900,000`, developer fee `1%`, liability cap `500 BPS`, and post-mining burn `3000 BPS` verified on-chain.
- [ ] No arbitrary mint authority exists; owner cannot change the fixed cap/burn constants.
- [ ] Initial AMM token/native seed amounts and house bankroll recorded.
- [ ] `houseBankroll`, `lockedBankroll`, free bankroll, AMM reserves, vault, pending claims, and dev fees reconciled.
- [ ] Frontend build uses the exact expected chain and addresses; no localhost fallback.
- [ ] VRF subscription is funded and consumer registration is verified.
- [ ] Monitoring, alerting, pause procedure, and incident contacts are active.
- [ ] Stuck-VRF, MEV, reorg, external-audit, legal/compliance, and minimum-wager decisions are explicitly accepted or resolved.
- [ ] Funding is performed only after this checklist is signed by the owner.
