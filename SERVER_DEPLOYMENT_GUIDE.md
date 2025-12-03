# PolyPlinko Server Deployment Guide

Complete guide for deploying PolyPlinko to production servers with security hardening.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Smart Contract Deployment](#smart-contract-deployment)
4. [Frontend Deployment Options](#frontend-deployment-options)
5. [Docker Deployment](#docker-deployment)
6. [Docker Swarm Cluster](#docker-swarm-cluster)
7. [Security Hardening](#security-hardening)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18+ LTS
- **npm/yarn/pnpm**: Latest version
- **Docker**: v24+ (for containerized deployment)
- **Docker Compose**: v2.20+
- **Git**: For version control
- **SSL Certificate**: For HTTPS (Let's Encrypt recommended)

### Required Accounts

- **Polygon RPC Provider**: Alchemy, Infura, or QuickNode
- **Chainlink VRF**: Subscription for randomness (Polygon mainnet)
- **Domain Name**: For production deployment
- **Cloud Provider**: AWS, DigitalOcean, Hetzner, or similar

### Hardware Requirements

**Minimum (Single Server)**:
- 2 CPU cores
- 4 GB RAM
- 40 GB SSD
- 1 Gbps network

**Recommended (Production)**:
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD
- 1 Gbps network

**High Availability (Swarm Cluster)**:
- 3+ servers with recommended specs
- Load balancer (Nginx, HAProxy, or cloud LB)

---

## Environment Setup

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/yourorg/polyp-linko.git
cd polyp-linko
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment Variables

Create `.env.production`:

\`\`\`env
# Network
NODE_ENV=production
NEXT_PUBLIC_CHAIN_ID=137

# RPC URLs
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Contracts (set after deployment)
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=0x...

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Chainlink VRF
VRF_COORDINATOR=0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed
VRF_KEY_HASH=0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f
VRF_SUBSCRIPTION_ID=your_subscription_id

# Security
DEV_ADDRESS=0xYourDevWallet
PRIVATE_KEY=your_deployment_private_key

# API Keys (optional)
COINGECKO_API_KEY=your_coingecko_api_key
\`\`\`

**Security Note**: NEVER commit `.env.production` to git!

---

## Smart Contract Deployment

### 1. Compile Contracts

\`\`\`bash
npx hardhat compile
\`\`\`

### 2. Deploy to Polygon Mainnet

\`\`\`bash
# Test deployment on Amoy testnet first
npx hardhat run scripts/deploy.ts --network amoy

# After testing, deploy to mainnet
npx hardhat run scripts/deploy.ts --network polygon
\`\`\`

### 3. Verify Contracts

\`\`\`bash
npx hardhat run scripts/verify-contracts.ts --network polygon
\`\`\`

### 4. Seed Initial Liquidity

\`\`\`bash
# Seeds 1000 MATIC + tokens for bankroll and AMM
npx hardhat run scripts/seed-liquidity.ts --network polygon
\`\`\`

### 5. Configure Chainlink VRF

1. Go to https://vrf.chain.link/polygon
2. Create a new subscription
3. Add your game contract as a consumer
4. Fund subscription with LINK tokens (recommended: 10+ LINK)
5. Update contract with subscription ID:

\`\`\`bash
# Set VRF subscription in contract
npx hardhat run scripts/set-vrf-subscription.ts --network polygon
\`\`\`

---

## Frontend Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Connect Repository**:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Configure project settings

2. **Set Environment Variables**:
   - Add all variables from `.env.production`
   - Ensure contracts are deployed first

3. **Deploy**:
   \`\`\`bash
   vercel --prod
   \`\`\`

4. **Custom Domain**:
   - Add your domain in Vercel dashboard
   - Configure DNS records as instructed

### Option 2: Netlify

\`\`\`bash
npm run build
netlify deploy --prod
\`\`\`

### Option 3: Self-Hosted (VPS)

See Docker Deployment section below.

---

## Docker Deployment

### 1. Build Docker Image

\`\`\`bash
docker build -t polyplinko:latest .
\`\`\`

### 2. Run Container

\`\`\`bash
docker run -d \
  --name polyplinko \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  polyplinko:latest
\`\`\`

### 3. Use Docker Compose

\`\`\`bash
docker-compose -f docker-compose.yml up -d
\`\`\`

### 4. Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/polyplinko`:

\`\`\`nginx
upstream polyplinko {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name polyplinko.com www.polyplinko.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name polyplinko.com www.polyplinko.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/polyplinko.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/polyplinko.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req zone=general burst=20 nodelay;

    location / {
        proxy_pass http://polyplinko;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

Enable and restart Nginx:

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/polyplinko /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
\`\`\`

### 5. Setup SSL with Let's Encrypt

\`\`\`bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d polyplinko.com -d www.polyplinko.com
\`\`\`

---

## Docker Swarm Cluster

For high availability and load balancing.

### 1. Initialize Swarm

On manager node:

\`\`\`bash
docker swarm init --advertise-addr YOUR_MANAGER_IP
\`\`\`

### 2. Join Worker Nodes

On each worker:

\`\`\`bash
docker swarm join --token SWMTKN-... YOUR_MANAGER_IP:2377
\`\`\`

### 3. Create Overlay Network

\`\`\`bash
docker network create --driver overlay polyplinko-net
\`\`\`

### 4. Deploy Stack

\`\`\`bash
# Use provided docker-stack.yml
./scripts/setup-swarm.sh
\`\`\`

### 5. Scale Services

\`\`\`bash
docker service scale polyplinko_app=5
\`\`\`

### 6. Update Services (Zero Downtime)

\`\`\`bash
docker service update --image polyplinko:v2 polyplinko_app
\`\`\`

---

## Security Hardening

### 1. Firewall Configuration

\`\`\`bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Docker Swarm (manager nodes only)
sudo ufw allow 2377/tcp  # Swarm management
sudo ufw allow 7946/tcp  # Swarm overlay network
sudo ufw allow 7946/udp
sudo ufw allow 4789/udp  # Overlay network traffic

sudo ufw enable
\`\`\`

### 2. SSH Hardening

Edit `/etc/ssh/sshd_config`:

\`\`\`
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
\`\`\`

\`\`\`bash
sudo systemctl restart sshd
\`\`\`

### 3. Fail2Ban

\`\`\`bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
\`\`\`

### 4. Contract Security

- Multi-sig wallet for owner (Gnosis Safe)
- Time-locked admin actions
- Emergency pause mechanism
- Bankroll limits based on available funds

### 5. API Rate Limiting

Already implemented in `middleware.ts`:
- 100 requests per minute per IP
- Cached responses to reduce load
- Security headers on all responses

### 6. DDoS Protection

**CloudFlare Setup** (Recommended):
1. Add your domain to CloudFlare
2. Enable "Under Attack" mode if needed
3. Configure rate limiting rules
4. Enable Bot Fight Mode

### 7. Regular Security Updates

\`\`\`bash
# Auto-updates for Ubuntu
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
\`\`\`

---

## Monitoring & Alerting

### 1. Setup Prometheus + Grafana

Already configured in `monitoring/` directory.

\`\`\`bash
docker-compose -f docker-compose.monitoring.yml up -d
\`\`\`

Access Grafana at `http://your-server:3001` (default: admin/admin)

### 2. Key Metrics to Monitor

- **Application**:
  - Request latency
  - Error rates
  - Active connections

- **Blockchain**:
  - Contract balance
  - Locked bankroll ratio
  - Game frequency
  - Loss-mining tier

- **System**:
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network traffic

### 3. Alerting Rules

Configure alerts for:
- Low contract balance (< 100 MATIC)
- High error rate (> 5%)
- Server down
- Abnormal bet patterns
- Locked bankroll > 80% of total

### 4. Log Aggregation

\`\`\`bash
# Install Loki for log collection
docker run -d --name=loki -p 3100:3100 grafana/loki:latest
\`\`\`

---

## Backup & Recovery

### 1. Database Backups

Not applicable (all data on-chain), but backup:

- Environment variables
- Configuration files
- SSL certificates
- Deployment scripts

### 2. Contract State

Create off-chain backups of:
- Game history (events)
- Player statistics
- AMM snapshots

\`\`\`bash
# Automated backup script
npm run backup:events
\`\`\`

### 3. Disaster Recovery Plan

1. Keep private keys in cold storage
2. Document recovery procedures
3. Test recovery process quarterly
4. Maintain emergency contacts list

---

## Troubleshooting

### Common Issues

#### 1. **Container won't start**

\`\`\`bash
docker logs polyplinko
# Check for environment variable errors
\`\`\`

#### 2. **VRF requests failing**

- Ensure LINK balance in subscription
- Check consumer is added
- Verify network and key hash

#### 3. **High gas costs**

- Increase gas limit in contract
- Use multicall for batch operations
- Consider L2 optimization

#### 4. **Slow frontend**

- Enable CDN (CloudFlare)
- Optimize images
- Enable Next.js caching
- Use Redis for API cache

#### 5. **Security alerts**

\`\`\`bash
# Check contract events for unusual activity
npm run monitor:contract

# Pause game if needed
npx hardhat run scripts/emergency-pause.ts --network polygon
\`\`\`

### Health Checks

\`\`\`bash
# Application health
curl https://polyplinko.com/api/health

# Container status
docker ps

# Nginx status
sudo systemctl status nginx

# System resources
htop
df -h
\`\`\`

---

## Production Checklist

Before going live, verify:

- [ ] Smart contracts deployed and verified on Polygonscan
- [ ] Chainlink VRF configured and funded
- [ ] Initial liquidity seeded (1000+ MATIC)
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall rules configured
- [ ] Monitoring and alerting set up
- [ ] Backup procedures documented and tested
- [ ] Multi-sig wallet configured for owner
- [ ] Rate limiting and DDoS protection enabled
- [ ] Security audit completed by third party
- [ ] Emergency procedures documented
- [ ] Team trained on emergency response
- [ ] Legal compliance checked (gambling regulations)
- [ ] Terms of service and privacy policy published
- [ ] Bug bounty program considered

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs
- Check contract balance
- Review unusual bet patterns

**Weekly**:
- Review security logs
- Check SSL certificate expiry
- Update dependencies (security patches)

**Monthly**:
- Full security audit
- Performance optimization review
- Backup verification test

**Quarterly**:
- Disaster recovery drill
- Contract upgrade planning
- Infrastructure scaling review

---

## Support & Resources

- **Documentation**: https://docs.polyplinko.com
- **Discord**: https://discord.gg/polyplinko
- **Email**: support@polyplinko.com
- **Emergency**: emergency@polyplinko.com

---

## License

MIT License - See LICENSE file for details

---

**Last Updated**: 2025-12-01  
**Version**: 1.0.0
