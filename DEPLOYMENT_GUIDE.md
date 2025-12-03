# PolyPlinko Deployment Guide

Complete step-by-step guide for deploying PolyPlinko to production.

## Prerequisites

### Required Accounts & Services
- [ ] Polygon mainnet RPC endpoint (Alchemy, Infura, or QuickNode)
- [ ] Polygonscan API key (for contract verification)
- [ ] Chainlink VRF v2 subscription (funded with LINK)
- [ ] WalletConnect project ID (for wallet integration)
- [ ] Funded deployer wallet (at least 2000 MATIC recommended)

### Required Software
- [ ] Node.js 18+
- [ ] npm or yarn
- [ ] Docker & Docker Compose (for production deployment)
- [ ] Git

## Phase 1: Smart Contract Deployment

### Step 1: Environment Configuration

Create `.env` file:

\`\`\`bash
# Network Configuration
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Deployer Wallet
PRIVATE_KEY=0xYourPrivateKeyHere

# Chainlink VRF v2 Configuration
VRF_COORDINATOR=0xec0Ed46f36D6865124Fb0E73dECE0F60360C75cB
VRF_SUBSCRIPTION_ID=your_subscription_id
VRF_KEY_HASH=0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd

# Protocol Configuration - IMPORTANT: Set your admin address for receiving 1% dev fees
DEV_ADDRESS=0xYourDevFeeReceiverAddress  # Separate from contract address
# Recommended: Use Gnosis Safe multi-sig for production

# Initial Liquidity (for seeding)
INITIAL_MATIC_LIQUIDITY=1000
INITIAL_TOKEN_LIQUIDITY=100000
\`\`\`

**Important Notes:**
- VRF_COORDINATOR: Official Chainlink coordinator for Polygon mainnet
- VRF_KEY_HASH: 500 gwei key hash for Polygon
- Create VRF subscription at [https://vrf.chain.link](https://vrf.chain.link)
- Fund subscription with LINK tokens (50 LINK recommended minimum)
- **DEV_ADDRESS**: This address receives 1% of every bet. Choose wisely! See "Dev Fee Configuration" section below.

### Step 2: Compile Contracts

\`\`\`bash
npx hardhat compile
\`\`\`

Expected output: No errors, artifacts generated in `/artifacts`

### Step 3: Run Tests

\`\`\`bash
npx hardhat test
\`\`\`

All tests should pass. If any fail, DO NOT deploy.

### Step 4: Deploy to Testnet First

Deploy to Polygon Amoy testnet for final testing:

\`\`\`bash
# Update .env with Amoy RPC and testnet VRF config
npx hardhat run scripts/deploy.ts --network amoy
\`\`\`

Test the deployment:
- Play a few games
- Test token swap
- Verify loss-mining works
- Test buyback mechanism

### Step 5: Deploy to Mainnet

**IMPORTANT: Triple-check all configurations before mainnet deployment**

**Dev Fee Configuration Options:**

**Option A: Use Deployer Address (Simple)**
\`\`\`bash
# Dev fees go to the account deploying the contract (default behavior)
npx hardhat run scripts/deploy.ts --network polygon
\`\`\`

**Option B: Use Separate Admin Address (Recommended)**
Edit `scripts/deploy.ts` to specify custom dev address:
\`\`\`typescript
// In deploy.ts, replace deployer.address with your admin address
const DEV_ADDRESS = process.env.DEV_ADDRESS || "0xYourAdminAddress"
const game = await PolyPlinkoGame.deploy(DEV_ADDRESS)
\`\`\`

**Option C: Use Multi-Sig Wallet (Production Best Practice)**
\`\`\`typescript
// Deploy Gnosis Safe first on Polygon, then use its address
const SAFE_ADDRESS = "0xYourGnosisSafeAddress"
const game = await PolyPlinkoGame.deploy(SAFE_ADDRESS)
\`\`\`

\`\`\`bash
npx hardhat run scripts/deploy.ts --network polygon
\`\`\`

Save the output contract addresses:
\`\`\`
PolyPlinkoToken deployed to: 0x...
PolyPlinkoGame deployed to: 0x...
Dev fees will be sent to: 0x...  # <- Verify this is correct!
\`\`\`

### Step 6: Verify Contracts on Polygonscan

\`\`\`bash
export NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
export NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=0x...
npx hardhat run scripts/verify-contracts.ts --network polygon
\`\`\`

**Verify Dev Address Configuration:**
1. Go to Polygonscan
2. Navigate to your PolyPlinkoGame contract
3. Click "Read Contract"
4. Find `devAddress` function
5. Verify it shows your intended admin address

### Step 7: Add Game Contract as VRF Consumer

1. Go to [https://vrf.chain.link](https://vrf.chain.link)
2. Select your subscription
3. Click "Add Consumer"
4. Enter your PolyPlinkoGame contract address
5. Confirm transaction

### Step 8: Seed Initial Liquidity

**WARNING: This requires sending MATIC to the contract**

\`\`\`bash
npx hardhat run scripts/seed-liquidity.ts --network polygon
\`\`\`

This will:
- Send 1000 MATIC to contract (or INITIAL_MATIC_LIQUIDITY value)
- Allocate 100k PPL tokens to AMM liquidity
- Set up initial house bankroll
- Enable the game to accept bets

Verify on Polygonscan that:
- Contract received MATIC
- AMM reserves are set
- House bankroll is non-zero

### Step 9: Transfer Ownership to Multi-Sig (CRITICAL)

**NEVER leave a single EOA as owner in production**

**Important**: Dev address and owner address can be different:
- **Owner**: Controls contract settings, can pause, adjust limits
- **Dev Address**: Receives 1% fees from every game

\`\`\`bash
npx hardhat console --network polygon
\`\`\`

\`\`\`javascript
const game = await ethers.getContractAt("PolyPlinkoGame", "0xYourGameAddress")

// Check current configuration
console.log("Current owner:", await game.owner())
console.log("Current dev address:", await game.devAddress())

// Transfer ownership to multi-sig (for contract control)
await game.transferOwnership("0xYourGnosisSafeAddress")

// Optional: Change dev address if needed (requires owner privileges)
// await game.setDevAddress("0xNewDevAddress")
\`\`\`

## Phase 2: Frontend Deployment

### Step 10: Configure Frontend Environment

Create `.env.production`:

\`\`\`bash
# Contract Addresses (from deployment)
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=0x...

# WalletConnect
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=...
\`\`\`

### Step 11: Build Frontend

\`\`\`bash
npm run build
\`\`\`

Verify no build errors.

### Step 12: Deploy to Vercel

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
\`\`\`

Alternative: Connect GitHub repo to Vercel dashboard for auto-deployment.

### Step 13: Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

## Phase 3: Production Infrastructure (Docker Swarm)

### Step 14: Prepare Production Server

Requirements:
- Ubuntu 20.04+ or similar
- 4GB+ RAM
- 50GB+ storage
- Docker & Docker Swarm installed

\`\`\`bash
# SSH into server
ssh user@your-server.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Initialize Swarm
docker swarm init
\`\`\`

### Step 15: Configure Production Environment

Create `.env.production` on server:

\`\`\`bash
# Same as frontend .env.production
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WC_PROJECT_ID=...
\`\`\`

### Step 16: Deploy with Docker Swarm

\`\`\`bash
# Clone repository
git clone https://github.com/yourusername/poly-plinko.git
cd poly-plinko

# Run setup script
chmod +x scripts/setup-swarm.sh
./scripts/setup-swarm.sh

# Deploy stack
docker stack deploy -c docker-stack.yml polyplinko
\`\`\`

### Step 17: Configure Monitoring

Access Grafana:
\`\`\`
http://your-server:3001
\`\`\`

Default credentials:
- Username: `admin`
- Password: `admin` (change immediately)

Import dashboard:
1. Go to Dashboards → Import
2. Upload `monitoring/grafana-dashboard.json`
3. Configure data source to Prometheus

### Step 18: Set Up SSL with Let's Encrypt

\`\`\`bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d polyplinko.com -d www.polyplinko.com

# Auto-renewal is configured automatically
\`\`\`

## Phase 4: Post-Deployment Checks

### Step 19: Smoke Tests

Test all critical functionality:

- [ ] Connect wallet (MetaMask, WalletConnect)
- [ ] View MATIC balance correctly
- [ ] View PPL balance correctly
- [ ] Play game with 1 ball (small bet)
- [ ] Verify game settles and VRF works
- [ ] Check loss-mining tokens are minted
- [ ] Swap MATIC → PPL
- [ ] Swap PPL → MATIC
- [ ] View recent games
- [ ] Check How to Play page loads

### Step 20: Monitor First 24 Hours

Watch for:
- Gas usage patterns
- VRF fulfillment times
- Contract balance (bankroll)
- Any reverted transactions
- User feedback

Set up alerts in Grafana for:
- Low bankroll (< 100 MATIC)
- High gas prices (> 500 gwei)
- VRF request failures
- Contract errors

### Step 21: Marketing & Launch

- [ ] Announce on Twitter/X
- [ ] Post in Polygon community forums
- [ ] Submit to DappRadar
- [ ] Create tutorial video
- [ ] Engage with first users

## Emergency Procedures

### Pause Game

If critical bug found:

\`\`\`bash
npx hardhat console --network polygon
\`\`\`

\`\`\`javascript
const game = await ethers.getContractAt("PolyPlinkoGame", "0xGameAddress")
await game.pauseGame() // From multi-sig
\`\`\`

### Emergency Withdrawal

Only if game is paused and no active games:

\`\`\`javascript
await game.emergencyWithdraw(amount) // From multi-sig
\`\`\`

## Maintenance

### Weekly Tasks
- [ ] Check bankroll balance
- [ ] Review transaction logs
- [ ] Monitor gas costs
- [ ] Check LINK balance in VRF subscription

### Monthly Tasks
- [ ] Review smart contract security
- [ ] Update frontend dependencies
- [ ] Backup contract events/data
- [ ] Review and optimize gas usage

## Troubleshooting

### VRF Not Fulfilling

1. Check LINK balance in subscription
2. Verify game contract is added as consumer
3. Check Polygon network status
4. Increase gas limit in VRF config

### Game Reverts

1. Check bankroll has sufficient funds
2. Verify bet parameters are within limits
3. Check if game is paused
4. Review event logs on Polygonscan

### Swap Fails

1. Check liquidity reserves
2. Verify token approval for PPL→MATIC swaps
3. Check slippage tolerance
4. Ensure sufficient gas

## Security Checklist

- [ ] Ownership transferred to multi-sig
- [ ] Private keys stored securely (never in code/env files in repo)
- [ ] Rate limiting enabled on frontend
- [ ] Monitoring alerts configured
- [ ] Incident response plan documented
- [ ] Bug bounty program announced
- [ ] Smart contract audit completed
- [ ] Emergency pause mechanism tested

## Support

For deployment issues:
- GitHub Issues: [repo-url]/issues
- Discord: [your-discord]
- Email: deploy@polyplinko.app

---

**Final Reminder**: Smart contract deployment is permanent. Triple-check everything before deploying to mainnet.
