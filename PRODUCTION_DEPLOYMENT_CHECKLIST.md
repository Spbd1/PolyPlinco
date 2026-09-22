# Production Deployment Checklist (No Money by Default)

This checklist is for a future controlled deployment. It does not authorize
public-chain deployment or funding.

## PRE-DEPLOY

- [ ] Confirm exact Git commit and `RELEASE_MANIFEST.json`.
- [ ] Build from a clean checkout with `pnpm install --frozen-lockfile`.
- [ ] Run `npm run release:verify` (or the documented equivalent).
- [ ] Set `APP_ENV=public-readonly` for no-money mode; set paid mode false.
- [ ] Ensure no private keys, mnemonics, `.env` contents, or Docker socket enter the VPS.
- [ ] Install operator-provided TLS certificates only on the host/proxy path.
- [ ] Create a non-root sudo operator; SSH keys only; firewall 22/80/443.
- [ ] Configure log rotation, disk/memory alerts, and readiness monitoring.

## DEPLOY

- [ ] Pull/build the pinned image from the recorded commit.
- [ ] Run `docker compose -p polyplinco-vps -f docker-compose.vps-no-money.yml config --quiet`.
- [ ] Start the stack with the root-owned environment file.
- [ ] Publish only the reverse proxy; keep app/RPC/database/metrics private.

## VERIFY

- [ ] Homepage and `/whitepaper` load through HTTPS.
- [ ] `/api/health` is liveness 200.
- [ ] `/api/health?ready=1` is 503 when no RPC/config is intentionally present.
- [ ] Demo mode works; paid entry is visibly disabled.
- [ ] Invalid API input is bounded and does not trigger an unbounded chain scan.
- [ ] Rate limiting returns 429 under a controlled test.
- [ ] Headers include CSP, frame denial, nosniff, referrer, permissions, and HSTS on HTTPS.
- [ ] `ss -lntup` shows no public app port, RPC, database, Docker API, or metrics port.
- [ ] Restart and destroy/recreate from Git + env template succeed.

## SECURITY VERIFY

- [ ] Inspect image history and runtime environment for secrets.
- [ ] Confirm the container is non-root, read-only where supported, capability-dropped, and resource-limited.
- [ ] Confirm server compromise cannot sign admin or user transactions.
- [ ] Confirm DNS/TLS certificate renewal procedure is documented.

## ROLLBACK

- [ ] Stop the current stack and remove it from traffic.
- [ ] Redeploy the previous pinned image/commit.
- [ ] Recheck liveness, readiness, headers, ports, and logs.
- [ ] Never use an owner key from the VPS during rollback.
