# Validation log

What was actually checked for v0.2 (2026-10-12), how, and what was **not** verified. All checks ran on Windows 10, Node 22.16, PostgreSQL 18.6 (private cluster via `npm run db:local:init`).

## Automated

| Check | Result |
| --- | --- |
| `npm run db:validate` | Schema valid |
| `npm run typecheck` | Clean |
| `npm test` (19 unit tests) | Pass: cart parsing, price tampering, delivery threshold, stock limits, rupee→paise parsing, IST slot generation and cutoff (including late-night), pincode/mobile validation, order transitions, payment states, scrypt hashing, Razorpay payment and webhook signatures, registration/address/product validation (image URL injection cases), open-redirect guard (tab/newline/backslash/dot-segment tricks), Razorpay capture check with stubbed API (captured, authorised → captured for the exact amount, failed, wrong order/amount/currency) |
| `npm run test:db` (13 integration tests, real PostgreSQL) | Pass in 3 consecutive runs, fixtures cleaned up. Covers: server prices and snapshots; idempotent replay and key-reuse rejection; **concurrent duplicate submission → same order, not "sold out"**; rollback of partial stock changes; **8 concurrent buyers for 3 units → exactly 3 orders, stock 0**; bad input (empty basket, foreign or unserviceable address, past slot, disabled/unknown payment, bad token, quantity over 20, hidden product); cancellation ownership, double-cancel and status rules; step-by-step fulfilment with COD collected on delivery; online payment recorded once under concurrent calls; amount mismatch refused; expired holds released and restocked; late payment re-reserved, or flagged refund-due when stock is gone; simultaneous verify + webhook for a late payment → settled once, re-reserved once; late payment for a passed delivery slot → refund-due; payment after a customer cancel → refund-due; webhook signature check and event de-duplication |
| `npm run build` | Pass (31 routes), re-run after the review fixes. An earlier `/_not-found` invariant error came from a stale `.next` folder and cleared after deleting it |

## Manual end-to-end (browser, database mode)

1. Pincode checker: 560034 → "We don't deliver…", 641010 → "We deliver…", and the header updated.
2. Added items → basket quote ₹685, free delivery, ₹109 savings (matches MRPs).
3. Registration: invalid input showed four field errors with `aria-invalid`. Valid input signed the customer in and returned them to checkout.
4. Address: pincode 560034 was refused with a clear message; 641002 was saved as the default.
5. Checkout: slots respected the 2-hour cutoff, online payment was disabled without keys, and a COD order was placed. The basket emptied and stock dropped in the database (basmati 20→19, atta 18→17).
6. Sign-out → `/admin` redirected to login. Server HTML for `/admin`, `/admin/orders`, `/admin/products`, `/account/orders` and `/checkout` contained no order or product data when signed out.
7. APIs without a session: checkout 401, cross-origin checkout 403, webhook without secret 503, cron without token 401.
8. Admin: a wrong password showed a generic error. The dashboard showed counts and low stock. The order advanced Confirmed → Packing → Out for delivery → Delivered, with "Cash collected" and audit entries naming the admin.
9. Admin product edit: MRP below price was rejected. Price ₹60.50 and stock 25 were saved and visible on the storefront.
10. Customer cancel: ₹96 + ₹35 delivery = ₹131 order, cancelled → "Not charged", tomato stock restored to 48.
11. Mobile (375 px): order tracking and checkout layouts checked visually; desktop order list checked.
11a. Home hero resized to match the references: 250 px at 1280×720 (was 415 px, 58% of the screen; now 35%), 270 px at ≥1500 px, and a 212 px rounded card on phones (was 346 px). Trust badges and categories are now visible on the first screen. No horizontal scrolling at 375, 768 or 1280 px. This pass also fixed a tablet overflow: the 10 category circles now wrap into two rows of 5.
12. Demo mode on a production build (`CATALOG_SOURCE=demo`): catalogue, search counts, offers, product and help pages render. Accounts, checkout and admin show the "needs the database" notice. Unknown category → noindex not-found. Health reports `database: not-configured`. Security headers are present.

## Independent code review (fixed)

A separate read-only review of checkout, payments, auth and admin found 8 issues, plus 2 it was unsure about. All were confirmed and fixed, and each fix has a regression test or browser check.

| # | Issue | Fix |
| --- | --- | --- |
| 1 | Open redirect: `/login?next=/<TAB>/evil.example`, because browsers strip tabs and `/	/` becomes `//` | `safeNextPath` parses like a browser and requires the same origin and no `//` prefix. Unit tests added; browser-verified: lands on `/account` |
| 2 | Login throttle keyed on a client-supplied `X-Forwarded-For` | IP-independent per-account limit (20 per 15 min). IP taken from the right-most trusted hop (`TRUSTED_PROXY_COUNT`) |
| 3 | Retry after "payment could not be started" replayed the cancelled attempt and emptied the basket | Route returns 409 for a replayed cancelled order. The client uses a new key after definite (4xx/502) failures and keeps it for ambiguous ones |
| 4 | Admin product save overwrote live stock and undid sales made meanwhile | Stock is written only when changed and only if it still equals the loaded value; otherwise a conflict message shows. The field remounts with the live value after a save. Browser-verified in 3 cases |
| 5 | Possible deadlock: restock and late-settle locked rows in basket order | All stock locking sorted by productId |
| 6 | A concurrent duplicate with the same key could get "sold out" | Any failure re-checks the key and replays the original order. DB test added |
| 7 | Cron token of equal string length but different byte length → 500 | Compare byte lengths before `timingSafeEqual` |
| 8 | Concurrent verify + webhook on a late payment → empty 500 | The losing settle backs off cleanly. Verify always returns JSON. DB test added |
| ? | Checkout signature proves authorisation, not capture | Verify fetches the payment from Razorpay, checks order, amount and currency, captures if only authorised, and records PAID only when captured. Unit tests with stubbed API |
| ? | A late payment could revive an order whose slot already passed | Not revived; marked refund-due. DB test added |

## Dependencies

- Fixed with scoped npm `overrides`, same majors, no stack change: `postcss` inside `next` (→ 8.5.29) and `mysql2` inside the `prisma` CLI (→ 3.24.5).
- Remaining `npm audit` items are build/CLI tooling only: Tailwind 3's `chokidar`/`braces`/`micromatch`/`fast-glob`/`postcss-selector-parser`, and `deepmerge-ts` in Prisma's config loader. They only process this repo's own files, never user input. Fixing them means Tailwind 4 or a Prisma downgrade, which are stack changes; re-check when upgrading.

## Not verified

- **Razorpay against the real API**: VeenaMart has no keys. Signatures, webhook handling and late-payment logic were tested with signed fixtures; the order-creation call (`POST /v1/orders`) and the Checkout popup were not exercised.
- **Production deployment**: HTTPS, the `Secure` cookie over TLS, reverse-proxy `X-Forwarded-For` handling, the cron schedule, backups and monitoring.
- **Real devices**: no physical-phone or screen-reader testing beyond the automated accessibility-tree checks.
- **Load testing**: none beyond the concurrency test above.
