# PolyPlinko - Provably Fair Plinko on Polygon

A decentralized Plinko gambling dApp with loss-mining rewards and deflationary tokenomics.

## Features

### 🎰 Provably Fair Plinko
- 8-32 rows configuration
- 1-256 balls per game (bounded by VRF callback gas)
- 3 risk levels (Low, Medium, High)
- ~10% house edge (1% dev fee, ~9% to house)
- Chainlink VRF for randomness
- **Demo Mode**: Try the game free with up to 100 balls per day

### 🎮 User Experience
- **No upfront wallet connection required** - connect inline when you play
- **Demo mode** - Test the game without connecting wallet (100 balls/day limit)
- **Minimum bet**: 0.001 POL per ball
- **Instant results mode** - Toggle animations or skip directly to results
- **Realistic ball physics** - Smooth bouncing animations between pins
- **Sound effects** - Audio feedback for drops, wins, and losses
- **Big win celebrations** - Special visual and audio effects for 2x+ wins
- **Optimized board layout** - Less curved pins for better visibility
- **Non-overlapping multipliers** - Clear slot labels that don't topple

### 🪙 PPL Token Economics
- Fixed supply: 1,000,000 PPL
- Loss-mining: Earn tokens from net losses
- 9 tiers: 0.02 → 0.10 MATIC per token
- Post-mining: 70% buyback to losers, 30% retained by the house
- 10k PPL dev allocation (1%)

### 💱 AMM Swap with Deflation
- MATIC ↔ PPL swap
- 5% fee on swaps
- MATIC fees → vault → buyback & burn
- Token fees → immediate burn

### 🎨 Modern UI
- Dark theme with neon accents (purple/blue/cyan)
- Inline wallet connection (no header button)
- Real-time game animation with sound effects
- Token stats dashboard with emission tier tracking
- Comprehensive whitepaper with interactive charts

### 📚 Documentation
- **How to Play** page - Complete game guide and tokenomics explanation
- **Whitepaper** page - Scientific documentation with charts and economic models
- Back buttons on all documentation pages

## Smart Contracts

### Local and testnet operation

Local validation uses `LocalVRFCoordinatorV2PlusMock`, exercising the same request,
pending-game, authenticated callback, and one-time settlement flow as Chainlink
VRF v2.5. The local deploy command never contacts Polygon. For Amoy, configure
the coordinator/subscription variables and deploy with `localMode=false`; see
[AMOY_READINESS.md](AMOY_READINESS.md).

Contract addresses are public build-time configuration: inject them before
`pnpm build` or the Docker build. Changing `NEXT_PUBLIC_*` only at container
runtime does not alter addresses already embedded in the browser bundle.

### PolyPlinkoGame.sol
Main game contract with:
- Plinko game logic with optimized multipliers
- VRF integration for provable fairness
- Loss-mining mechanics (9 tiers)
- Post-mining buyback (70/30 split)
- AMM swap functionality
- Bankroll management with locked reserves

### PolyPlinkoToken.sol
ERC-20 token with:
- Capped supply (1M)
- Minting via game contract only
- Burn functionality for deflation

## Architecture

\`\`\`
contracts/
  ├── PolyPlinkoGame.sol      # Main game + AMM
  └── PolyPlinkoToken.sol     # ERC-20 token

app/
  ├── page.tsx                # Main app with demo mode
  ├── layout.tsx              # Root layout with Web3Provider
  ├── how-to-play/page.tsx    # Game guide
  └── whitepaper/page.tsx     # Technical whitepaper

components/
  ├── header.tsx              # Network + balance
  ├── footer.tsx              # Links and resources
  ├── game-controls.tsx       # Bet config + demo mode toggle
  ├── plinko-board.tsx        # Visual board with effects
  ├── recent-games.tsx        # Game history
  ├── token-panel.tsx         # Token stats + swap UI
  └── whitepaper/             # Chart components
      ├── emission-chart.tsx
      ├── supply-burn-chart.tsx
      └── price-pressure-chart.tsx

lib/
  ├── contracts.ts            # Contract addresses + ABIs
  ├── plinko-simulator.ts     # Client-side ball physics
  ├── wagmi-config.ts         # Web3 configuration
  ├── demo-mode.ts            # Local storage demo tracking
  └── sound-effects.ts        # Web Audio API sound generation

hooks/
  ├── use-game-contract.ts    # Game contract interactions
  ├── use-token-contract.ts   # Token contract interactions
  ├── use-swap-contract.ts    # Swap contract interactions
  └── use-game-events.ts      # Event listening
\`\`\`

## Deployment

### Prerequisites
- Node.js 18+
- Hardhat or Foundry
- Polygon PoS RPC endpoint
- Chainlink VRF subscription

### Steps

1. **Deploy Contracts**
\`\`\`bash
# Deploy PolyPlinkoGame (will auto-deploy token)
npx hardhat run scripts/deploy.js --network polygon

# Note: Update .env with deployed addresses
\`\`\`

2. **Seed Liquidity**
\`\`\`bash
# Approve tokens and seed liquidity
npx hardhat run scripts/seed-liquidity.js --network polygon
\`\`\`

3. **Configure Frontend**
\`\`\`bash
# Set environment variables
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WC_PROJECT_ID=your-walletconnect-project-id

# Run dev server
npm run dev
\`\`\`

## Game Mechanics

### Demo Mode vs Paid Play

| Feature | Demo Mode | Paid Mode |
|---------|-----------|-----------|
| Game Ball Limit | 10 balls | 256 balls |
| Wallet Required | No | Yes |
| Real Money | No | Yes (min 0.01 POL/ball) |
| Token Rewards | No | Yes (PPL on losses) |
| Payout | Simulated | Real MATIC |
| Purpose | Testing & learning | Real gameplay |
| Reset | Daily at midnight | Daily at midnight |

### Demo Mode Details
- **Free to play**: No wallet connection or payment required
- **Daily limit**: 10 balls per day (resets at midnight local time)
- **Tracking**: Uses localStorage to track daily usage
- **Purpose**: Let users test the game before committing real funds
- **Switch to real**: Toggle off demo mode to play with real MATIC

### Instant Results Mode
- **Animation Mode (Default)**: Watch realistic ball physics with bouncing between pins
- **Instant Results**: Skip animations and see final results immediately
- **Best for**: Use animation mode for 1-100 balls, instant results for larger batches
- **Toggle**: Switch available in game controls panel

### House Edge Calculation
- Expected payout: 90% of total bet
- Dev fee: 1% of total bet (immediate transfer)
- Net house edge: ~10% (1% dev + ~9% bankroll)

### Multipliers
Computed using risk-adjusted formulas:
- **Low Risk**: `0.8 + 1.5 * x²` (low variance)
- **Medium Risk**: `0.5 + 3.0 * x²` (moderate variance)
- **High Risk**: `0.2 + 6.0 * x³` (high variance)

Where `x = distance_from_center / max_distance`

All multipliers are scaled to achieve 90% RTP.

### Loss-Mining Tiers (Updated)

| Tier | Tokens Emitted | MATIC per Token |
|------|---------------|----------------|
| 1    | 0-100k        | 0.02           |
| 2    | 100k-200k     | 0.03           |
| 3    | 200k-300k     | 0.04           |
| 4    | 300k-400k     | 0.05           |
| 5    | 400k-500k     | 0.06           |
| 6    | 500k-600k     | 0.07           |
| 7    | 600k-700k     | 0.08           |
| 8    | 700k-800k     | 0.09           |
| 9    | 800k-900k     | 0.10           |

**Post-Mining (after 900k emitted)**:
- 70% of net losses → automatic PPL buyback sent to player
- 30% of net losses → retained by the house

### AMM Formula
Standard constant-product: `k = reserveMatic * reserveToken`

With 5% fee:
- MATIC → PPL: 5% to vault
- PPL → MATIC: 5% burned

## Sound & Visual Effects

### Sound Effects (Web Audio API)
- **Ball drops**: Subtle tone on each pin collision
- **Small wins** (0-1x): Two-note ascending melody
- **Medium wins** (1-2x): Three-note ascending melody
- **Big wins** (2x+): Epic five-note ascending chord
- **Losses**: Somber single tone
- **Toggle**: Mute/unmute button in game controls

### Visual Effects
- **Big win overlay**: Full-screen yellow gradient pulse
- **Animated text**: "BIG WIN!" with bounce animation
- **Sparkles**: Rotating sparkle icons around win text
- **Pin glow**: Purple glow effect on all pins
- **Ball trails**: Blue glow following ball movement

## Security

- ✅ ReentrancyGuard on all external functions
- ✅ Pausable game and swap
- ✅ Bankroll validation before payouts
- ✅ Max supply cap enforcement
- ✅ VRF for randomness (not pseudo-random)
- ✅ Minimum bet enforcement (0.01 POL)
- ✅ Demo mode isolated from real funds
- ✅ Locked bankroll tracking for active games

## Testing

\`\`\`bash
# Run contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Test on Amoy testnet
npx hardhat run scripts/test-game.js --network polygonAmoy
\`\`\`

## Production Checklist

See `PRODUCTION_CHECKLIST.md` for complete pre-launch requirements including:
- Smart contract audit requirements
- VRF configuration
- Multi-sig setup
- Monitoring and alerting
- Emergency procedures

## License

MIT

## Disclaimer

This is a gambling application. Use responsibly. Smart contracts should be audited before production deployment. Deploy at your own risk. Demo mode is for testing purposes only and does not represent real gameplay outcomes.
