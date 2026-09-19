# Private No-Money Server Deployment Checklist

## PRE-DEPLOY

- [ ] Confirm release commit and review `git status --short`.
- [ ] Confirm no private key, `.env.local`, RPC credential, or runtime log is
      in the build context.
- [ ] Create a private-local or staging configuration explicitly; never use
      implicit chain-1337 fallback for production.
- [ ] Confirm nonzero Game/PPL addresses and expected chain ID.
- [ ] Confirm the server has no deployer, owner, treasury, dev-fee, or VRF
      subscription private key.
- [ ] Confirm RPC URLs used by the browser contain no private credential.
- [ ] Review image digest and scan results.
- [ ] Confirm firewall allows only 80/443 for the public deployment.

## DEPLOY

- [ ] Build with `docker compose -f docker-compose.production.yml build` and
      explicit required build arguments.
- [ ] Start the reverse proxy and web container on the internal network.
- [ ] Mount TLS certificates read-only; do not put certificates or keys in the
      image.
- [ ] Do not expose port 3000, 8545, Docker, database, or metrics ports.
- [ ] Confirm resource limits, dropped capabilities, read-only filesystem,
      tmpfs, non-root web user, and restart policy.

## VERIFY

- [ ] `GET /api/health` returns liveness `ok`; `GET /api/health?ready=1`
      returns readiness `ready` and verifies the configured RPC chain ID.
- [ ] Homepage and static assets load through HTTPS.
- [ ] Security headers and CSP are present.
- [ ] API requests are bounded and rate-limited.
- [ ] Read-only contract state matches the expected chain and addresses.
- [ ] Demo flow works locally without a wallet transaction.
- [ ] Wallet transaction path requires the expected chain and nonzero code.
- [ ] Wrong-chain and zero-address configurations hard-stop paid submission.
- [ ] Stop/restart the web container and confirm on-chain state remains the
      source of truth.
- [ ] Simulate RPC outage and confirm APIs fail safely without claiming
      settlement.

## SECURITY VERIFY

- [ ] Inspect container processes and confirm the web process is non-root.
- [ ] Confirm no container has `/var/run/docker.sock` mounted.
- [ ] Confirm public listening ports are only 80/443.
- [ ] Confirm 8545, 3000, databases, and metrics are unreachable externally.
- [ ] Confirm logs contain no environment dump, private key, RPC token, or
      wallet secret.
- [ ] Confirm owner/admin actions are performed from an off-server secure
      environment.
- [ ] Confirm monitoring covers free bankroll, locked liabilities, pending
      VRF, failed payouts, dev fees, reserves, and accounting divergence.

## ROLLBACK

- [ ] Stop routing traffic to the current image.
- [ ] Roll back to the last approved image digest.
- [ ] Keep contract state untouched unless an off-server incident procedure
      explicitly authorizes a pause.
- [ ] Re-run health, configuration, and reconciliation checks.
- [ ] Record the incident, image digests, logs, and any admin transaction
      hashes.
