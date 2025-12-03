# PolyPlinko Implementation Notes

## Smart Contract Architecture

### Key Design Decisions

1. **Monolithic Game Contract**
   - Game logic, AMM, and loss-mining in one contract
   - Reduces cross-contract calls and gas costs
   - Token contract is separate for standard ERC-20 compatibility

2. **Multiplier Precomputation**
   - Binomial weights and multipliers computed in `_initializeMultipliersAndWeights()`
   - Stored on-chain for rows 8, 16, 24, 32 (example subset)
   - Production: Precompute all rows 8-32 off-chain, store via setter function

3. **VRF Simulation**
   - Demo uses pseudo-random for instant results
   - Production: Integrate Chainlink VRF v2
   - Replace `_requestRandomness()` and `_fulfillRandomness()` with actual VRF calls

4. **Loss-Mining Algorithm**
   - Iterates through tiers in `_mintLossMiningTokens()`
   - Handles tier transitions automatically
   - Gas-efficient for typical loss amounts (<1 MATIC)

5. **AMM Deflationary Mechanics**
   - MATIC→PPL: 5% fee to vault (accumulates for buyback)
   - PPL→MATIC: 5% tokens burned immediately
   - `buybackAndBurn()` callable by anyone (incentivized by token holders)

## Front-End Architecture

### Web3 Integration

- **wagmi v2**: Modern React hooks for Ethereum
- **viem**: TypeScript-native Ethereum library (replaces ethers.js)
- Inline wallet connection (no header button)
- Auto-connect on "Play" click

### Game Visualization

- **Canvas-based Plinko board**: Renders pins, slots, multipliers
- **Ball animation**: Uses `plinko-simulator.ts` for deterministic paths
- Matches on-chain randomness using same seed derivation

### State Management

- React hooks for local state
- wagmi hooks for blockchain state (balances, contracts)
- SWR (via TanStack Query) for caching contract reads

## Gas Optimization

### Contract Optimizations

1. **Batch Ball Processing**
   - Single loop in `_calculatePayout()` for all balls
   - Avoids per-ball storage writes

2. **Fixed-Point Math**
   - Uses integers scaled by 10^4 for multipliers
   - Avoids floating-point arithmetic

3. **Cumulative Weight Lookup**
   - Binary search possible for large rows (not implemented in demo)
   - Linear search acceptable for ≤33 slots

4. **Minimal Storage**
   - Game struct packed efficiently
   - Indexes (playerGames) stored separately

### Frontend Optimizations

1. **Batched Animations**
   - For >100 balls, animate subset + show histogram
   - Reduces canvas redraws

2. **Lazy Loading**
   - Recent games fetched on-demand
   - Contract events indexed by The Graph (future)

## Production Enhancements

### Critical TODOs

1. **Chainlink VRF Integration**
   ```solidity
   // Replace in PolyPlinkoGame.sol
   import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
   
   function playPlinko(...) {
     requestId = COORDINATOR.requestRandomWords(...);
   }
   
   function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
     _fulfillRandomness(uint64(requestId), randomWords[0]);
   }
   \`\`\`

2. **Complete Multiplier Initialization**
   - Precompute all rows 8-32 off-chain
   - Deploy via script that calls setter functions
   - Verify against reference RTP calculations

3. **Bankroll Safety**
   - Add max bet limits based on available bankroll
   - Reserve funds for pending games (VRF delay)
   - Emergency pause if bankroll < safety threshold

4. **Event Indexing**
   - Deploy The Graph subgraph for game history
   - Index `GameSettled`, `SwapMaticForPPL`, etc.
   - Frontend queries subgraph instead of full RPC calls

5. **Token Vesting**
   - Implement linear vesting for dev allocation
   - Use OpenZeppelin's `VestingWallet` or custom logic

### Nice-to-Haves

1. **Advanced UI**
   - 3D Plinko board (Three.js)
   - Sound effects
   - Leaderboard (most tokens earned, biggest win)

2. **Mobile Optimization**
   - Touch-friendly controls
   - Responsive canvas sizing
   - WalletConnect v2 for mobile wallets

3. **Analytics Dashboard**
   - House profit over time
   - Token emission rate
   - Swap volume and burn rate

4. **Multi-Token Support**
   - Accept USDC, USDT for bets
   - Multi-pool AMM (MATIC/PPL, USDC/PPL)

## Testing Strategy

### Unit Tests (Hardhat)

\`\`\`javascript
describe("PolyPlinkoGame", function() {
  it("Should correctly calculate 90% RTP", ...);
  it("Should mint tokens based on tier pricing", ...);
  it("Should handle AMM swaps with 5% fee", ...);
  it("Should enforce max supply cap", ...);
});
\`\`\`

### Integration Tests

1. **Full Game Flow**
   - Deploy contracts
   - Seed liquidity
   - Play games with varied configs
   - Verify payouts and token mining

2. **Swap Flow**
   - Swap MATIC→PPL
   - Swap PPL→MATIC
   - Verify reserves updated correctly
   - Check burn amounts

3. **Edge Cases**
   - Max balls (1000)
   - Bankroll exhaustion
   - Tier transitions
   - Slippage protection

### Frontend E2E (Playwright)

\`\`\`typescript
test('Play game and receive payout', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Play")');
  // Connect wallet mock
  // Wait for game result
  // Assert balance changed
});
\`\`\`

## Deployment Checklist

- [ ] Audit smart contracts (Certik, OpenZeppelin)
- [ ] Deploy to Polygon Amoy testnet
- [ ] Test with real VRF requests
- [ ] Verify on PolygonScan
- [ ] Seed 1000+ MATIC liquidity
- [ ] Configure frontend env vars
- [ ] Test all game configurations
- [ ] Stress test AMM with large swaps
- [ ] Deploy frontend to Vercel
- [ ] Set up monitoring (Tenderly, Defender)
- [ ] Announce on social media

## Risk Mitigation

### Smart Contract Risks

1. **VRF Manipulation**: Use Chainlink VRF, not block hashes
2. **Bankroll Insolvency**: Monitor reserves, cap max bet
3. **Re-entrancy**: Already protected via `ReentrancyGuard`
4. **Integer Overflow**: Solidity 0.8+ has built-in checks

### Economic Risks

1. **Token Price Crash**: 5% burn rate provides deflationary pressure
2. **Liquidity Exit**: Lock initial liquidity or use protocol-owned
3. **Loss-Mining Exploitation**: Tier pricing increases cost over time

### Operational Risks

1. **Frontend Downtime**: Deploy to IPFS + ENS as backup
2. **RPC Failures**: Use Alchemy/Infura with fallback
3. **VRF Delays**: Show clear status messages to users

## Future Roadmap

### Phase 1: MVP (Current)
- Basic Plinko game
- Loss-mining
- Simple AMM

### Phase 2: Enhanced Features
- Chainlink VRF integration
- The Graph indexing
- Mobile app (React Native)

### Phase 3: Ecosystem Growth
- Referral program
- Governance (PPL staking)
- Multi-game platform (dice, slots)

### Phase 4: Cross-Chain
- Deploy to Arbitrum, Optimism
- Cross-chain token bridge
- Unified leaderboard

## Contact & Support

- GitHub: [link]
- Discord: [link]
- Twitter: @PolyPlinko
- Docs: docs.polyplinko.com

---

*Built with ❤️ for the Polygon ecosystem*
