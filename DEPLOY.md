# Deploying Appu's Mart to the shared VPS (without disturbing other pm2 apps)

## Current live deployment (2026-10-12)

- **URL:** https://appusmart.187-126-118-102.sslip.io
  - `sslip.io` maps the name to the server IP, so no domain purchase is needed.
  - The Let's Encrypt certificate auto-renews through certbot.
  - To use your own domain: point its DNS A record at `187.126.118.102`, add it to `server_name` in `/etc/nginx/sites-available/appus-mart`, run `certbot --nginx -d <domain>`, and update `APP_URL` in `.env`.
- **Server:** `root@187.126.118.102` (srv2028332, Ubuntu 26.04). Logged in with the deploy key `~/.ssh/appus_mart_deploy`, which can be removed from `/root/.ssh/authorized_keys` at any time.
- **App:**
  - Folder `/var/www/appus-mart`, pm2 app `appus-mart`, listening on `127.0.0.1:3005`.
  - Settings in `/var/www/appus-mart/.env`, root-only.
- **Database:**
  - PostgreSQL 18 was installed for this app, listening on localhost only.
  - Database and user are both `appus_mart`; nothing else on the server uses PostgreSQL.
- **Admin:**
  - Email: `admin@appusmart.local`.
  - Password: in `.env`; on the server run `grep ADMIN_PASSWORD /var/www/appus-mart/.env`.
- **Other apps:** LMS-Server, lms-client and wowlifestyle were verified unchanged (same pid and restart count). pm2's reboot list now holds all 4 apps; the previous list is backed up as `/root/.pm2/dump.pm2.before-appus-mart`.
- **Not set up yet:** the reservation cron (§6). It's only needed once Razorpay keys are added.

**Update the live site:**
1. On your PC, run `node scripts/package-deploy.mjs`.
2. Copy the package over: `scp -i ~/.ssh/appus_mart_deploy appus-mart-deploy.tar.gz root@187.126.118.102:/tmp/`.
3. On the server, unpack it over `/var/www/appus-mart` (`.env` is kept).
4. Run `bash deploy/server-deploy.sh`. It reloads only `appus-mart`.

The server already runs `LMS-Server`, `lms-client` and `wowlifestyle` under pm2. Appu's Mart is fully separate:

| | Appu's Mart |
| --- | --- |
| Folder | `/var/www/appus-mart` |
| pm2 name | `appus-mart` (only ever started/reloaded by name) |
| Port | `3005`, bound to `127.0.0.1` (nginx in front). The deploy script refuses to start if the port is taken |
| Database | its own PostgreSQL database `appus_mart` with its own user |
| Domain | its own nginx server block + HTTPS certificate |

Never run `pm2 restart all`, `pm2 delete all`, `pm2 kill` or `pm2 update` for this deploy.

## 0. Prerequisites on the server (check, don't change)

```bash
node -v                      # needs 20.9+ (22 recommended)
pm2 ls                       # note the other apps; they must look the same after the deploy
ss -ltnp | grep -E ':3005|:5432'
free -h                      # next build needs ~1 GB free
```

## 1. Database (one time)

If PostgreSQL is already installed, add a new user and database (other apps' databases are not touched):

```bash
sudo -u postgres psql -c "CREATE USER appus_mart WITH PASSWORD '<strong password>';"
sudo -u postgres psql -c "CREATE DATABASE appus_mart OWNER appus_mart;"
```

If PostgreSQL is not installed, run it in Docker, bound to localhost only on a separate port:

```bash
docker run -d --name appus-mart-db --restart unless-stopped -p 127.0.0.1:5434:5432 \
  -e POSTGRES_USER=appus_mart -e POSTGRES_PASSWORD='<strong password>' -e POSTGRES_DB=appus_mart \
  -v appus-mart-db:/var/lib/postgresql/data postgres:18
```

With Docker, use port 5434 in `DATABASE_URL`.

## 2. Upload the code

On your PC, the upload package is `appus-mart-deploy.tar.gz`. It's made by `node scripts/package-deploy.mjs` and leaves out `node_modules`, `.next`, `.env` and `.pgdata`:

```bash
scp appus-mart-deploy.tar.gz root@<server>:/tmp/
ssh root@<server> "mkdir -p /var/www/appus-mart && tar -xzf /tmp/appus-mart-deploy.tar.gz -C /var/www/appus-mart"
```

## 3. Configure (one time)

```bash
cd /var/www/appus-mart
cp deploy/env.production.example .env
nano .env        # DATABASE_URL, APP_URL=https://<domain>, ADMIN_EMAIL/ADMIN_PASSWORD, CRON_SECRET (openssl rand -base64 32)
chmod 600 .env
```

## 4. Build and start

```bash
bash deploy/server-deploy.sh
```

This runs these steps in order:
1. Installs dependencies.
2. Generates the database client and applies migrations.
3. Seeds the database (idempotent).
4. Builds the app.
5. Starts or reloads only `appus-mart`.
6. Runs `pm2 save` and checks `/api/health`.

Run `pm2 ls`: the other three apps keep the same pid/uptime.

## 5. Domain and HTTPS

Customer sign-in cookies are `Secure`, so the shop must be served over HTTPS.

1. Point a DNS A record (e.g. `shop.yourdomain`) at the server.
2. Install `deploy/nginx-appus-mart.conf`, with the domain filled in, as described in its header.
3. Run `sudo nginx -t && sudo systemctl reload nginx`. A reload keeps the other sites running.
4. Run `sudo certbot --nginx -d <domain>`.

## 6. Release unpaid online-payment holds (cron)

```bash
( crontab -l 2>/dev/null; echo '*/5 * * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3005/api/cron/release-reservations >/dev/null' ) | crontab -
```

## Updating later

Upload a new package to the same folder (`.env` stays), then run `bash deploy/server-deploy.sh` again.

To roll back, restore the previous folder copy and run `pm2 reload appus-mart`.
