# VeenaMart

An independent Indian grocery store for Coimbatore: catalogue, basket, customer accounts, checkout with delivery slots, cash on delivery and Razorpay, order tracking, and a store admin. Built with Next.js 15 (App Router), React 18, TypeScript, Tailwind 3 and Prisma 7 on PostgreSQL. The WOW project was looked at only for stack and structure; no code, data, assets or credentials were copied.

## Run locally (Windows / PowerShell)

Node 22.12+ (developed on 22.16).

```powershell
cd C:\WorkSpace\veenamart
npm ci
npm run db:generate
npm run dev            # http://localhost:3001
```

Without a `.env` the store runs in **demo mode**: browse the built-in catalogue and keep a basket on the device. Accounts, checkout and admin show a "needs the database" notice.

### Database mode (full store)

The easiest path on this machine uses the installed PostgreSQL binaries to run a **private** cluster just for VeenaMart (own data folder `.pgdata/`, port 5433, generated password). It never touches any other PostgreSQL database.

```powershell
Copy-Item .env.example .env       # then set CATALOG_SOURCE=database and ADMIN_PASSWORD
npm run db:local:init             # creates .pgdata, the veenamart database, and writes DATABASE_URL into .env
npm run db:deploy                 # applies prisma/migrations
npm run db:seed                   # catalogue, 50 Coimbatore pincodes, admin account (idempotent)
npm run dev
```

After a reboot run `npm run db:local:start` (and `db:local:stop` to stop it). Any other PostgreSQL works too: put its URL in `DATABASE_URL` and skip `db:local:*`. Database mode fails visibly if PostgreSQL is down; it never falls back to demo data.

Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` to reach `/admin`. The seed creates that admin only if it doesn't exist and never resets its password.

### Razorpay (optional)

Leave the `RAZORPAY_*` values empty to sell with cash on delivery only. To enable UPI, cards and netbanking, add **VeenaMart's own** Razorpay test keys (`rzp_test_…`) and a webhook secret. Then point a Razorpay webhook at `/api/payments/razorpay/webhook` with the events `payment.captured`, `order.paid` and `payment.failed`. Live keys are ignored outside production builds. An order counts as paid only once Razorpay reports the payment *captured*; if the account uses manual capture, the server captures exactly the order amount.

## What works

- **Storefront**: home, 10 categories, search, price sort, pagination (24 per page), offers, product pages with stock levels. There's also a pincode delivery checker in the header.
- **Basket**: kept on the device and synced across tabs. Prices always come from the server quote (integer paise).
- **Accounts**: email + password (scrypt hashes) with HTTP-only session cookies, rate-limited login/registration, and saved addresses with Indian mobile/pincode validation.
- **Checkout**:
  - Delivery is limited to serviceable pincodes. The 3-hour slots (7–10, 12–3, 5–8 IST over the next 3 days) close 2 hours before they start.
  - Delivery costs ₹35 below ₹499 and is free from ₹499.
  - Payment is cash on delivery, or Razorpay when keys are configured.
- **Orders**:
  - Each order is created in one transaction. Stock is decremented atomically, so the store can't oversell.
  - Item and address snapshots are stored with the order, and an idempotency key prevents duplicate orders on double-click or retry.
  - Customers can track an order, cancel it before packing (stock is restored), or retry an online payment.
- **Online payments**:
  - Items are held for 15 minutes while the customer pays. Unpaid orders are cancelled automatically and stock is released.
  - A payment counts only after its signature is verified, either in the browser handoff or by the idempotent webhook.
  - Late payments are re-reserved if the stock is still there. Otherwise they are marked "refund due".
- **Admin** (`/admin`, ADMIN role only):
  - Dashboard with low-stock alerts.
  - Orders: filter by status and payment, fulfil step by step (COD is marked collected on delivery), cancel with a reason, record refunds.
  - Products: create and edit price, MRP, stock, visibility, featured flag and photo URL.
  - Delivery pincodes: add, pause and resume.
- **Ops**: `GET /api/health` reports database readiness. `GET /api/cron/release-reservations` (Bearer `CRON_SECRET`) releases expired holds.

## Checks

```powershell
npm run db:validate
npm run typecheck
npm test          # 19 unit tests (pricing, slots, validation, passwords, signatures, order rules, Razorpay client)
npm run test:db   # 13 PostgreSQL integration tests (needs DATABASE_URL; cleans up after itself)
npm run build
```

See `docs/VALIDATION.md` for what was verified and how, and `docs/ARCHITECTURE.md` for the design.

## Not done yet (needs business input or outside services)

- **Razorpay end-to-end**: the code is complete and tested with signed fixtures. It hasn't been run against Razorpay's servers because VeenaMart has no keys yet.
- **Password reset and email/SMS notifications**: these need an email or SMS provider.
- **Product photos**: real, licensed photography is needed. The `imageUrl` field and admin field are ready; emoji illustrations are shown until then.
- **Legal and contact pages**: privacy policy, terms, returns/refund policy and store contact details must come from the business.
- **Invoicing**: there are no GST invoices or tax breakdowns. Prices are treated as tax-inclusive.
- **Slots**: slot capacity limits and substitutions aren't implemented.
- **Deployment**: nothing has been deployed. Production needs HTTPS (session cookies are `Secure`), a scheduled call to the cron endpoint, database backups and monitoring.
