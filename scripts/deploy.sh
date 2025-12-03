#!/bin/bash

# PolyPlinko Deployment Script
# Usage: ./scripts/deploy.sh [testnet|mainnet]

set -e

NETWORK=${1:-testnet}

echo "🎲 PolyPlinko Deployment Script"
echo "================================"
echo "Network: $NETWORK"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Copy .env.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ "$NETWORK" = "mainnet" ]; then
    echo -e "${YELLOW}⚠️  MAINNET DEPLOYMENT${NC}"
    echo "This will deploy to Polygon Mainnet (Chain ID: 137)"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
    
    # Check for mainnet requirements
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}❌ PRIVATE_KEY not set in .env${NC}"
        exit 1
    fi
    
    if [ -z "$VRF_COORDINATOR" ]; then
        echo -e "${RED}❌ VRF_COORDINATOR not set for mainnet${NC}"
        exit 1
    fi
fi

echo ""
echo "Step 1: Installing dependencies..."
npm ci

echo ""
echo "Step 2: Compiling contracts..."
npx hardhat compile

echo ""
echo "Step 3: Running tests..."
npx hardhat test

echo ""
echo "Step 4: Deploying contracts to $NETWORK..."
npx hardhat run scripts/deploy.ts --network $NETWORK

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env with deployed contract addresses"
echo "2. Verify contracts on Polygonscan:"
echo "   npx hardhat verify --network $NETWORK <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>"
echo "3. Seed initial liquidity:"
echo "   npx hardhat run scripts/seed-liquidity.ts --network $NETWORK"
echo "4. Test the dApp thoroughly on $NETWORK"

if [ "$NETWORK" = "mainnet" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  MAINNET CHECKLIST:${NC}"
    echo "□ Contracts verified on Polygonscan"
    echo "□ Chainlink VRF subscription funded"
    echo "□ Initial liquidity seeded (min 1000 MATIC)"
    echo "□ Multi-sig wallet set as owner"
    echo "□ Monitoring dashboard configured"
    echo "□ Emergency pause procedures documented"
    echo "□ Third-party security audit completed"
fi
