# PolyPlinko Production Launch Checklist

## Pre-Deployment

### Smart Contracts
- [ ] Replace simulated VRF with Chainlink VRF v2 integration
- [ ] Configure Chainlink VRF subscription on Polygon mainnet
- [ ] Fund VRF subscription with LINK tokens
- [ ] Test VRF on Amoy testnet extensively (100+ games)
- [ ] Verify all multipliers sum to exactly 90% RTP across all configs
- [ ] Test all 25 row configurations (8-32) for correctness
- [ ] Third-party security audit completed (Certik, OpenZeppelin, Trail of Bits)
- [ ] Bug bounty program launched
- [ ] Gas optimization review completed
- [ ] Test with 1000-ball games on testnet
- [ ] Verify bankroll locking mechanism prevents withdrawal during games

### Testing
- [ ] Unit tests: 100% coverage for critical functions
- [ ] Integration tests: Full game flow end-to-end
- [ ] Fuzzing tests: Random inputs for 10,000+ iterations
- [ ] Stress tests: Simulate 1000 concurrent games
- [ ] Bankroll stress test: Ensure house never goes bankrupt
- [ ] Loss-mining math verified: All 9 tiers produce correct token amounts
- [ ] Post-mining buyback tested: 80/20 split works correctly
- [ ] AMM swap tested: 5% fee and burn mechanics work
- [ ] Slippage protection tested: Frontrunning scenarios
- [ ] Reentrancy tests: All vulnerable functions checked

### Security
- [ ] Slither static analysis: 0 high-severity issues
- [ ] Mythril symbolic execution: No critical vulnerabilities
- [ ] Manticore formal verification (optional but recommended)
- [ ] Access control audit: Only authorized addresses can call admin functions
- [ ] Integer overflow checks: Solidity 0.8.x protects, but verify edge cases
- [ ] DoS resistance: Gas limits tested for max inputs
- [ ] Time manipulation resistance: No reliance on block.timestamp for critical logic
- [ ] Front-running mitigation: Slippage protection on all swaps

## Deployment

### Infrastructure
- [ ] Domain purchased and DNS configured (polyplinko.com)
- [ ] SSL certificates configured (Let's Encrypt via Traefik)
- [ ] Docker Swarm cluster set up (3+ manager nodes, 5+ worker nodes)
- [ ] Load balancer configured (Traefik with health checks)
- [ ] CDN configured for static assets (Cloudflare, AWS CloudFront)
- [ ] DDoS protection enabled (Cloudflare)
- [ ] Rate limiting configured (10 req/s general, 5 req/s for game plays)
- [ ] Backup strategy: Daily automated backups of monitoring data

### Smart Contracts
- [ ] Deploy PolyPlinkoGame to Polygon mainnet
- [ ] Deploy completes successfully with correct constructor args
- [ ] Token (PPL) deployed and linked to game contract
- [ ] Dev address set correctly
- [ ] Seed initial liquidity: Minimum 1000 MATIC + 90k PPL
- [ ] Verify contracts on Polygonscan with source code
- [ ] Transfer ownership to multi-sig wallet (Gnosis Safe with 3/5 signers)
- [ ] Test game play on mainnet with small bet (0.001 MATIC)
- [ ] Verify VRF callback works on mainnet

### Frontend
- [ ] Update .env.production with mainnet contract addresses
- [ ] Build and test production bundle
- [ ] Deploy to Docker registry
- [ ] Roll out to swarm cluster with health checks
- [ ] Verify app loads and connects to Polygon mainnet
- [ ] Test wallet connection (MetaMask, WalletConnect, Coinbase Wallet)
- [ ] Verify all contract reads work correctly
- [ ] Test full game flow: Connect → Configure → Play → Receive payout
- [ ] Test swap functionality: MATIC ↔ PPL
- [ ] Verify loss-mining rewards display correctly

### Monitoring
- [ ] Prometheus configured and scraping metrics
- [ ] Grafana dashboards set up:
  - [ ] System metrics (CPU, RAM, network)
  - [ ] App metrics (requests, errors, latency)
  - [ ] Blockchain metrics (game count, bankroll, TVL)
  - [ ] Token metrics (price, volume, burns)
- [ ] Alerting configured:
  - [ ] Low bankroll (< 100 MATIC)
  - [ ] High error rate (> 5%)
  - [ ] VRF failure
  - [ ] Large withdrawals
  - [ ] Unusual game patterns
- [ ] Log aggregation (ELK stack, Datadog, or similar)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] On-chain monitoring (Tenderly, Defender)

## Post-Deployment

### Operations
- [ ] Set reasonable maxBetTotal based on current bankroll (e.g., 10% of bankroll)
- [ ] Monitor first 100 games closely
- [ ] Check bankroll ratio: locked/total should be < 50% normally
- [ ] Verify no unusual gas costs
- [ ] Monitor for any contract reverts or errors
- [ ] Track player feedback and bug reports

### Marketing & Community
- [ ] Announcement blog post published
- [ ] Social media accounts created (Twitter, Discord, Telegram)
- [ ] Press release sent to crypto media outlets
- [ ] CoinGecko / CoinMarketCap listing application submitted
- [ ] DeFi aggregator integrations (DeFi Llama, Dapp Radar)
- [ ] Community governance plan announced
- [ ] Referral program launched (optional)

### Legal & Compliance
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Responsible gaming notice displayed
- [ ] Age verification implemented (18+)
- [ ] Geo-blocking for restricted jurisdictions (if required)
- [ ] Legal review completed for target markets

### Contingency Planning
- [ ] Emergency pause SOP documented and tested
- [ ] Multi-sig signers briefed on emergency procedures
- [ ] Backup admin keys secured (hardware wallets, cold storage)
- [ ] Bug bounty program active with clear guidelines
- [ ] Insurance policy considered (Nexus Mutual, etc.)
- [ ] Disaster recovery plan documented

## Ongoing Maintenance

### Daily
- [ ] Check monitoring dashboards for anomalies
- [ ] Review error logs
- [ ] Monitor bankroll levels
- [ ] Check for any stuck VRF requests
- [ ] Respond to community feedback

### Weekly
- [ ] Review game statistics and trends
- [ ] Analyze token metrics (price, volume, burns)
- [ ] Check for any smart contract upgrade needs
- [ ] Review and respond to bug reports
- [ ] Update documentation as needed

### Monthly
- [ ] Financial review: Revenue vs costs
- [ ] Security review: Check for new vulnerabilities
- [ ] Performance review: Optimize slow queries/operations
- [ ] Community governance: Implement approved proposals
- [ ] Marketing review: Adjust strategy based on growth

## Success Metrics

- [ ] 0 critical security incidents
- [ ] 99.9% uptime
- [ ] < 5% error rate
- [ ] Average VRF fulfillment time < 30 seconds
- [ ] Bankroll growth > 10% per month
- [ ] TVL (Total Value Locked) > $100k within 3 months
- [ ] 1000+ unique players within first month
- [ ] Positive community sentiment (Twitter, Discord)

---

**Launch Date**: _____________  
**Launch Team**: _____________  
**Emergency Contacts**: _____________

**Notes**:
- This checklist should be reviewed and updated regularly
- All items must be checked before considering launch "complete"
- Some items (like third-party audits) may take weeks—plan accordingly
- Security is non-negotiable: If any security item is unchecked, DO NOT LAUNCH
