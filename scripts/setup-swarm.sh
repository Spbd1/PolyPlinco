#!/bin/bash

# PolyPlinko Docker Swarm Setup Script
# Usage: ./scripts/setup-swarm.sh

set -e

echo "🐳 PolyPlinko Docker Swarm Setup"
echo "================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if running as swarm manager
if ! docker info | grep -q "Swarm: active"; then
    echo -e "${YELLOW}⚠️  Docker Swarm not initialized${NC}"
    read -p "Initialize Docker Swarm? (yes/no): " init_swarm
    
    if [ "$init_swarm" = "yes" ]; then
        echo "Initializing Docker Swarm..."
        docker swarm init
        echo -e "${GREEN}✅ Docker Swarm initialized${NC}"
    else
        echo "Please initialize Docker Swarm first: docker swarm init"
        exit 1
    fi
fi

# Create overlay network if not exists
if ! docker network ls | grep -q "polyplinko-network"; then
    echo "Creating overlay network..."
    docker network create --driver overlay polyplinko-network
    echo -e "${GREEN}✅ Network created${NC}"
fi

# Check for required environment variables
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found${NC}"
    echo "Create .env.production with the following variables:"
    echo "  NEXT_PUBLIC_GAME_CONTRACT_ADDRESS"
    echo "  NEXT_PUBLIC_PPL_CONTRACT_ADDRESS"
    echo "  DOCKER_IMAGE"
    echo "  ACME_EMAIL"
    echo "  TRAEFIK_BASIC_AUTH"
    echo "  GRAFANA_PASSWORD"
    exit 1
fi

# Load environment
source .env.production

echo ""
echo "Deploying PolyPlinko stack..."
docker stack deploy -c docker-stack.yml polyplinko

echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "Monitor deployment:"
echo "  docker service ls"
echo "  docker service logs polyplinko_polyplinko-web"
echo ""
echo "Access points:"
echo "  App: https://polyplinko.com"
echo "  Traefik Dashboard: https://traefik.polyplinko.com"
echo "  Grafana: https://metrics.polyplinko.com"
echo ""
echo "Scaling:"
echo "  docker service scale polyplinko_polyplinko-web=5"
echo ""
echo "Update (zero-downtime):"
echo "  docker service update --image \$DOCKER_IMAGE polyplinko_polyplinko-web"
