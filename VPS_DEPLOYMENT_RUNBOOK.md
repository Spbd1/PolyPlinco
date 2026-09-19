# VPS Deployment Runbook — No-Money Internet-Facing Rehearsal

This runbook prepares a disposable VPS for public demo/read-only mode. It
does not fund contracts, deploy contracts, or authorize real-money play.

## Host preparation

Use a supported Ubuntu/Debian image and an existing provider console. Create a
non-root sudo user, install security updates, and confirm a second login
before changing SSH policy:

```sh
sudo apt-get update && sudo apt-get dist-upgrade -y
sudo adduser --disabled-password --gecos '' polyplinco
sudo usermod -aG sudo,docker polyplinco
sudo timedatectl set-ntp true
```

Install Docker from supported packages, then install and enable
`unattended-upgrades` and `fail2ban` where supported. Configure disk-space
monitoring and Docker log rotation (for example, bounded `json-file` size and
file count in the daemon configuration). After confirming key-based recovery,
apply the firewall:

```sh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Keep only the required services enabled, synchronize time with the host's
chrony/systemd-timesyncd policy, and alert before the application filesystem
or Docker log filesystem is full.

Use SSH keys only. After verifying a second sudo session, disable password and
root SSH login in a reviewed SSH drop-in and reload SSH. Do not make those
irreversible changes without console/sudo recovery.

## Deployment directory and files

```sh
sudo install -d -o polyplinco -g polyplinco -m 0750 /opt/polyplinco
sudo -u polyplinco git clone <approved-repository-source> /opt/polyplinco
cd /opt/polyplinco
sudo install -o polyplinco -g polyplinco -m 0600 /dev/null .env.vps
```

Populate `.env.vps` from `.env.vps.example` with
`APP_ENV=public-readonly`, a public chain ID, zero contract addresses, and
`NEXT_PUBLIC_PAID_MODE_ENABLED=false`. Never add a private key, mnemonic, or
RPC credential. Store future TLS material outside the image at `ssl/`, mode
0700, mounted read-only.

## Build and start

```sh
git rev-parse HEAD
docker compose --env-file .env.vps -f docker-compose.vps-no-money.yml config --quiet
docker compose --env-file .env.vps -f docker-compose.vps-no-money.yml build --pull
docker image inspect polyplinco-polyplinko-web --format '{{.Id}}'
docker history polyplinco-polyplinko-web
docker compose --env-file .env.vps -f docker-compose.vps-no-money.yml up -d
```

The no-money stack publishes only proxy ports 80/443. The web service has no
host port, no Docker socket, no host network, and no privileged key.

## Verify and rollback

```sh
docker compose --env-file .env.vps -f docker-compose.vps-no-money.yml ps
curl -fsS -i https://example.com/api/health
curl -fsS -i https://example.com/api/health?ready=1
ss -lntup
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker compose --env-file .env.vps -f docker-compose.vps-no-money.yml logs --tail=200
```

Liveness should be healthy; readiness may report `configuration_incomplete`
because no paid contract addresses are supplied. The page must remain
available and paid controls disabled. Test redirect, headers, oversized
requests, malformed API inputs, nonexistent paths, and rate limiting from an
external test host.

Rollback by checking out the last approved commit or starting its immutable
image digest, then repeat health and port checks. Stop/recreate the VPS if
needed; no on-chain state depends on this deployment.

## TLS and domain placeholders

Set DNS A/AAAA records for the approved hostname before issuance. With a real
domain, use an ACME client such as Certbot or a separately managed renewal
process, then mount renewed certificates read-only and reload Nginx. Do not
claim TLS success for `example.com`; it is a placeholder only.
