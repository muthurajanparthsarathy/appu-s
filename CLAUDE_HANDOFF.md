# Handoff: VeenaMart status (v0.2, 2026-10-12)

Read `README.md`, `docs/ARCHITECTURE.md` and `docs/VALIDATION.md` first. Do not rebuild from scratch.

## Ground rules (unchanged)

- `C:\WorkSpace\wow-mutu'` is a **read-only reference** for stack and patterns. Never copy its code, schema, business logic, `.env`, credentials (its DB is a remote Supabase instance), Razorpay or WhatsApp keys. Never edit it.
- Stack: Next.js 15 App Router + React 18 + TypeScript + Tailwind 3 + Prisma 7/PostgreSQL, as one app. No Express.
- Amounts in integer paise. Never trust client prices or client payment state. No fake reviews, ratings or delivery promises.

## Decisions confirmed with the owner

- Auth: email + password.
- Payments: cash on delivery + Razorpay. Razorpay switches on only with VeenaMart's own keys.
- Delivery: Coimbatore 641001–641050, ₹35 below ₹499, 3 daily slots over 3 days.

Other defaults are listed under "Assumptions" in ARCHITECTURE.md. The owner prefers sensible defaults over repeated questions.

## Phase status

1. Catalogue: pagination, search by name/brand, offers via column comparison, `imageUrl` support with emoji fallback, and pincode checker. **Done.** Real licensed photos are still needed from the business.
2. Database: migration with CHECK constraints, idempotent seed (catalogue, pincodes, admin), private local PostgreSQL scripts. **Done and verified.**
3. Auth: sessions, addresses, admin role, admin catalogue and pincode management. **Done.** Not done: password reset and email verification (needs an email provider); photo upload storage.
4. Checkout and orders: transactional placement, atomic stock, idempotency, snapshots, cancellation and restock, holds and expiry. **Done and verified**, including concurrency.
5. Razorpay: order creation, signature verification, idempotent webhook, late-payment handling, refund-due tracking, admin fulfilment. **Done, but not run against the live Razorpay API** (no keys).
6. Tests: 19 unit tests, 13 PostgreSQL integration tests, a manual browser end-to-end pass, and an independent code review whose 8 findings are all fixed (see VALIDATION.md). **Done.** Deployment prerequisites are still open.

## Local environment notes

- The `.env` (gitignored) points at the private cluster in `.pgdata/` on port 5433, with generated credentials. After a reboot run `npm run db:local:start`.
- Don't run `npm run build` while `npm run dev` is running: both use `.next`, and the build breaks the dev server. Stop dev first, and delete `.next` before restarting dev.
- `npx prisma dev` (PGlite) was tried and dropped. It throws protocol error 08P01 under concurrent connections.
- The dev database still holds sample data from the end-to-end run: test customer `e2e-customer@veenamart.test`, orders VM100046/VM100047, and edited Broccoli/Tomato. To start clean, run `npx prisma migrate reset` (Prisma asks for confirmation) and then `npm run db:seed`.
- Behind a reverse proxy, set `TRUSTED_PROXY_COUNT` to the number of proxies that append to `X-Forwarded-For`. Per-account login limits don't depend on it.

## Suggested next work

1. Add VeenaMart's Razorpay **test** keys and webhook secret. Then test the popup, verify, webhook (use a tunnel), failure and retry, and refunds in the Razorpay dashboard.
2. Pick an email (and optionally SMS) provider. Then add password reset, email verification and order confirmation/status notifications.
3. Business content: licensed product photos (object storage + admin upload), store contact details, privacy/terms/returns pages, GST invoice requirements.
4. Deployment: HTTPS host, managed PostgreSQL + backups, `npm run db:deploy` on release, a cron calling `/api/cron/release-reservations` every 5 minutes, a proxy that overwrites `X-Forwarded-For`, error monitoring.
5. Optional: slot capacity limits, wishlist, coupon rules, multi-admin management UI, Tailwind 4 / Prisma upgrades to clear the remaining dev-tool advisories.

Update this file and `docs/VALIDATION.md` after each completed phase.
