# Architecture and design decisions

## One full-stack Next.js app

Same deployment model as the reference stack: a single Next.js 15 App Router application, no separate Express server.

```text
app/(pages)            Server components render pages; read data via app/server directly (no self-HTTP calls)
app/components         Client components: CartProvider (localStorage), forms, checkout, Razorpay popup
app/actions            Server actions ('use server'): auth, account, admin — each re-checks the session/role
app/api                Route handlers: quote, checkout, payments, webhook, cron, health, catalogue, serviceability
app/server             Server-only domain layer: catalog, orders, session, rate-limit, razorpay, config
                       + pure, unit-tested rules: pricing, delivery, order-rules, validation, password, signatures
app/lib                Shared DTO types and formatting (paise → ₹, IST dates)
prisma                 Schema, migrations (with CHECK constraints), idempotent seed
```

`server-only` guards modules that touch the database or cookies. Pure rule modules have no I/O, so `npm test` runs them directly. DB integration tests run with `--conditions=react-server`, which turns the `server-only` guard into a no-op outside Next.

## Routes

| Route | Purpose |
| --- | --- |
| `/`, `/shop`, `/category/[slug]`, `/offers`, `/product/[slug]` | Catalogue (search `q`, `sort`, `page`) |
| `/cart` | Basket with server quote |
| `/login`, `/register` | Email + password accounts (`next` = safe same-site return path) |
| `/checkout` | Address, slot, payment method, place order |
| `/account`, `/account/orders`, `/account/orders/[id]`, `/account/addresses` | Customer area: tracking, cancel, pay now, addresses |
| `/admin`, `/admin/orders[/id]`, `/admin/products[/new\|/id]`, `/admin/pincodes` | Store admin (ADMIN role; others get 404) |
| `/help/delivery` | Delivery, payment and cancellation rules, generated from the enforced constants |
| `POST /api/cart/quote` | `{items:[{productId,quantity}]}` → server-priced quote |
| `POST /api/checkout` | Same-origin, signed-in. `{items,addressId,slotId,paymentMethod,idempotencyKey}` → `{orderId, razorpay?}` |
| `POST /api/payments/razorpay/start` | Re-open payment for an order still holding stock |
| `POST /api/payments/razorpay/verify` | Browser handoff; HMAC(order_id\|payment_id) verified before recording payment |
| `POST /api/payments/razorpay/webhook` | Signed (X-Razorpay-Signature over raw body), de-duplicated by event id |
| `GET /api/cron/release-reservations` | Bearer `CRON_SECRET`; cancels expired holds and restocks |
| `GET /api/serviceability?pincode=` | Delivery coverage check |
| `GET /api/products` | Catalogue JSON with pagination envelope |
| `GET /api/health` | Liveness plus DB readiness (503 if database mode and DB unreachable) |

## Data model

`Category`, `Product` (integer paise, `stock` = packs, optional `imageUrl`), `User` (role CUSTOMER/ADMIN, scrypt hash), `Session` (id = SHA-256 of cookie token), `Address`, `ServiceArea` (pincode allowlist), `Order`, `OrderItem` (immutable snapshot), `OrderEvent` (append-only audit trail), `PaymentWebhookEvent` (processed webhook ids), `RateLimit` (fixed-window counters).

The database enforces these with CHECK constraints (see the init migration):

- Price > 0, MRP ≥ price, stock ≥ 0.
- Lower-case emails, 6-digit pincodes.
- Order total = subtotal + delivery, and slot end > slot start.
- Item quantity 1–20, and line total = unit price × quantity.

Customer order numbers come from a sequence starting at VM100001.

## Order lifecycle

```text
COD:       CONFIRMED → PACKING → OUT_FOR_DELIVERY → DELIVERED (payment PENDING → PAID on delivery)
Razorpay:  PENDING_PAYMENT (stock held 15 min) → CONFIRMED (PAID) → PACKING → …
Cancel:    customer: PENDING_PAYMENT/CONFIRMED · admin: up to OUT_FOR_DELIVERY · always restocks
           a PAID order that is cancelled becomes REFUND_DUE → admin records REFUNDED
Expiry:    unpaid hold past reservedUntil → CANCELLED (restocked) by cron / lazily on checkout & order views
```

### Placing an order

1. Validate the basket (1–20 per line, ≤ 50 lines, no duplicates).
2. Check that the address belongs to the customer and its pincode is active.
3. Check that the slot is one of the currently offered slots.
4. Check that the payment method is enabled.
5. If the idempotency key `(userId, key)` already exists, return that order. If the key is reused with different contents, return 409.
6. In one transaction:
   - Re-read the products and compute the quote from server prices.
   - For each line, in a stable id order: `UPDATE … SET stock = stock - q WHERE id = ? AND active AND stock >= q`. Any miss rolls back the whole order.
   - Create the order, its item snapshots and the first event.
7. For Razorpay, create a Razorpay order (amount = server total) once and reuse it on retries.

The conditional `UPDATE` is atomic under PostgreSQL row locking, so concurrent checkouts can't oversell. The integration tests verify this with 8 parallel buyers for 3 units.

### Payments

The browser's success callback is never trusted on its own. Payments are recorded only through `recordRazorpayPayment`, which is reached two ways:

- the verify route, after checking the HMAC signature;
- the signed webhook, after checking the amount and currency.

`recordRazorpayPayment` is idempotent, so calling it repeatedly or concurrently records a payment once. If the hold has already expired, it re-reserves the stock when available. Otherwise the order stays cancelled and is flagged REFUND_DUE. Payments for customer-cancelled orders always become REFUND_DUE.

## Security

- **Sessions**: a 32-byte random token in an `HttpOnly; SameSite=Lax` cookie (`Secure` in production). Only its SHA-256 is stored. Sessions last 30 days and are deleted on logout.
- **Passwords**: scrypt (N=16384, r=8, p=1) with a per-user salt. Comparisons are timing-safe, and unknown emails cost the same as wrong passwords.
- **Rate limits** (PostgreSQL-backed):
  - Login: 8 per 15 min per IP+email, and 40 per IP.
  - Registration: 5 per hour per IP.
  - Checkout: 10 per minute per user.
- **CSRF**: server actions use Next's built-in origin check. JSON mutation routes require a same-origin `Origin` header.
- **Access control**:
  - Every server action re-checks the session or role.
  - Admin pages check the role per page, not only in the layout.
  - Customer data is always queried with `userId`, which prevents IDOR.
- **Input limits**: request bodies are capped; slugs, image URLs, phone numbers and pincodes are validated; admin money input is parsed as rupee strings to integer paise without floats.
- **Headers**: nosniff, DENY framing, strict referrer, Permissions-Policy, HSTS.

## Assumptions (confirmed defaults, change in code if the business differs)

- **Pricing**:
  - INR in integer paise. Displayed prices include taxes; there is no GST breakdown or invoicing yet.
  - Fixed packs only, no variable-weight settlement.
  - ₹35 delivery below ₹499, free from ₹499 (`app/server/pricing.ts`).
- **Delivery**:
  - Coimbatore pincodes 641001–641050 are seeded as serviceable, and admin can edit them.
  - Slots are 7–10, 12–3 and 5–8 IST, 3 days ahead, with a 2-hour cutoff and no capacity limit (`app/server/delivery.ts`).
- **Accounts and inventory**:
  - Login is required at checkout. The guest basket stays on the device and carries over after sign-in.
  - Single-store inventory, with no substitutions.

## Visual system

Forest green `#185a39`, warm cream `#f7f7ef`, orange `#ed7b2e`. The design uses restrained rounded cards, category circles and a grocery hero. On mobile, products reflow into two columns with a bottom navigation bar. Product visuals are emoji illustrations until licensed photos are added through `imageUrl`. The reference images in `docs/references/` are design inputs only.
