# Server Deployment Audit

Status review of PolyPlinko before final production deployment. Use this alongside the existing launch checklists.

## Observations

- **Security middleware**: API routes enforce 100 req/min per IP and add core security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy). 【F:middleware.ts†L5-L42】
- **Edge protection**: Nginx front end enforces HTTPS redirects, HSTS, CSP, rate limiting (10r/s general, 5r/s API), connection limiting, gzip, cache rules, and a `/health` endpoint for probes. 【F:nginx.conf†L6-L77】【F:nginx.conf†L87-L105】
- **Container orchestration**: Docker Compose/Swarm definitions include replicated Next.js app, Nginx or Traefik ingress, and Prometheus/Grafana for monitoring. Environment variables are currently placeholders for contract addresses, domains, SSL certs, and credentials. 【F:docker-compose.yml†L4-L34】【F:docker-stack.yml†L4-L73】
- **Monitoring config**: Prometheus scrapes the app and node exporter but Alertmanager targets are empty and Grafana admin password is expected via env var. 【F:monitoring/prometheus.yml†L1-L21】【F:docker-stack.yml†L56-L70】
- **Reference checklists**: Final production and server deployment guides outline operational, security, and legal steps that must be completed before launch. 【F:FINAL_PRODUCTION_CHECKLIST.md†L1-L89】【F:SERVER_DEPLOYMENT_GUIDE.md†L3-L73】

## Pre-Deployment Actions

1. **Populate production secrets and env vars**

   - Fill `.env.production` with RPC endpoints, contract addresses, WalletConnect ID, VRF subscription data, and deployment keys as documented. Keep it out of git and load into Compose/Swarm. 【F:SERVER_DEPLOYMENT_GUIDE.md†L35-L71】
   - Set `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS`, `NEXT_PUBLIC_PPL_CONTRACT_ADDRESS`, and network IDs for both Docker Compose and Swarm deployments. 【F:docker-compose.yml†L10-L14】【F:docker-stack.yml†L6-L10】

2. **TLS and ingress hardening**

   - Install real certificates at `/etc/nginx/ssl` for the Nginx path or configure Traefik's Let's Encrypt resolver with `ACME_EMAIL` and secure `TRAEFIK_BASIC_AUTH`. 【F:nginx.conf†L23-L42】【F:docker-stack.yml†L28-L48】
   - Verify domains (`polyplinko.com`, subdomains for Traefik/Grafana) resolve to the ingress hosts before rolling out. 【F:nginx.conf†L17-L21】【F:docker-stack.yml†L32-L47】

3. **Monitoring and alerting readiness**

   - Add Alertmanager targets and alert rules to Prometheus; confirm node exporter endpoints exist for the swarm nodes. 【F:monitoring/prometheus.yml†L1-L21】
   - Configure Grafana admin password (`GRAFANA_PASSWORD`) and provision dashboards/alerts for bankroll, VRF failures, and error rates per the checklists. 【F:docker-stack.yml†L56-L70】【F:FINAL_PRODUCTION_CHECKLIST.md†L61-L86】

4. **Operational validation**

   - Run a production build and container image locally (`npm run build`, `docker build`) to ensure no missing dependencies. 【F:SERVER_DEPLOYMENT_GUIDE.md†L103-L126】
   - Smoke-test the `/health` endpoint through ingress and confirm rate limits behave as expected under load (100 req/min middleware, 10r/s Nginx general / 5r/s API). 【F:middleware.ts†L5-L30】【F:nginx.conf†L9-L44】

5. **Governance & compliance**
   - Complete legal, security, and operational items in the final checklist (multi-sig ownership, ToS/Privacy, emergency procedures, monitoring alerts) before go-live. 【F:FINAL_PRODUCTION_CHECKLIST.md†L5-L118】【F:FINAL_PRODUCTION_CHECKLIST.md†L132-L178】

## Go-Live Checklist (Server Focus)

- [ ] Contracts deployed and addresses injected into environment for frontend/connectivity. 【F:FINAL_PRODUCTION_CHECKLIST.md†L5-L38】【F:docker-stack.yml†L6-L10】
- [ ] Ingress certificates validated; HSTS/CSP and rate limits verified in staging. 【F:nginx.conf†L23-L45】【F:nginx.conf†L60-L77】
- [ ] Swarm/Compose rollout tested with rolling updates and health probes succeeding. 【F:docker-compose.yml†L4-L24】【F:docker-stack.yml†L11-L27】
- [ ] Monitoring stack reachable with populated alerts and secured dashboards. 【F:monitoring/prometheus.yml†L1-L21】【F:docker-stack.yml†L56-L70】
- [ ] Incident runbooks, on-call contacts, and emergency pause procedures documented and distributed. 【F:FINAL_PRODUCTION_CHECKLIST.md†L95-L147】

Use this audit as a gating document: every item above should be checked before final deploy to production servers.
