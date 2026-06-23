# CLAUDE.md — IBI eCommerce Marketplace

> Project memory for Claude Code. Loaded automatically at the start of every session.
> Owner: Dr. T. Sasimurugan, Founder & CEO, India Business International (IBI).
> **This is a live production system. Do not break working functionality.**

---

## What this project is

A multi-vendor eCommerce marketplace ("IBI eCommerce Marketplace") for the Indian market — Amazon-style storefront + seller portal + admin panel. Currently ~20 sellers, targeting 100+. GST-compliant. Deployed via GitHub Pages on `indiabusinessinternational.online`.

## Tech stack (important: this is a serverless / low-cost architecture)

- **Frontend:** `index.html` — a single ~9,000-line vanilla-JS single-page app (no build step, no framework). Storefront, customer accounts, cart, seller dashboard, all in one file.
- **Auth (internal tools only):** `ibi-auth-worker.js` — a Cloudflare Worker protecting internal staff subdomains (finance/gstr/erp/settlement) with ONE master password (SHA-256 hash + HMAC-signed session cookie). **This is NOT marketplace per-user auth.** Customer/seller login is handled separately via the backend.
- **Backend:** `IBI_Seller_Backend.gs` — a Google Apps Script web app (`doGet`/`doPost`) that reads/writes a Google Sheet as its database. This is the data layer.
- **Image hosting:** Wix (product images), plus ImgBB upload and base64-to-Apps-Script upload paths.
- **PWA:** `manifest.json` + `sw.js` (cache `ibi-marketplace-v2`).

## File map

| File | Role |
|------|------|
| `index.html` | The entire storefront + customer + seller SPA |
| `admin.html` | Admin panel (seller/product/order approval & management) |
| `print.html` | GST invoice / order PDF generator |
| `IBI_Seller_Backend.gs` | Apps Script backend (local mirror — see caveat below) |
| `ibi-auth-worker.js` | Cloudflare Worker, single-password gate for internal tools |
| `ibi-password-generator.html` | Generates the Cloudflare password hash + secret key |
| `manifest.json`, `sw.js` | PWA config + service worker |
| `icon.svg` | App icon |

## Backend API surface (Apps Script actions)

Seller: `register`, `checkStatus`, `getStats`, `addProduct`, `editProduct`, `getSellerProducts`, `getProduct`, `pauseProduct`, `deleteProduct`, `getApprovedProducts`, `getSellerOrders`, `getSellerEarnings`.
Admin: `adminGetSellers`, `adminGetProducts`, `adminGetCustomers`, `adminEditSeller`, `adminEditProduct`, `adminUpdateSellerStatus`, `adminUpdateProductStatus`, `adminUpdateProduct`, `getAdminOrders`, `adminUpdateOrderStatus`, `adminUpdateOrderPayout`.
Orders/other: `saveOrder`, `uploadImage`, `createZohoPaymentLink`, `trackVisit`, `saveTicket`.
(No endpoints yet for reviews, coupons, returns/refunds, Q&A, or address book.)

---

## ⚠️ CRITICAL GOTCHAS — read before editing

1. **The `PCOL` column map MUST stay in exact sync with the product-row write.** A past multi-symptom bug came from `PCOL` describing 18 columns while the write used 23. Symptoms were: product images not displaying, approval-column data misaligning between old/new rows, and variations collapsing to a single option. **The product sheet is 23 columns.** If you change the product schema (add/remove/reorder columns), you MUST: (a) update `PCOL`, (b) update every read/write that indexes columns, and (c) update or re-run `migrateProductRows()` to realign legacy rows.
2. **`getApprovedProducts` must return `additionalImgs` and `variations`** — the storefront parses these for multi-image galleries and the variation selector.
3. **Wix image URLs:** `enc_avif` URLs can fail to render; the front-end has `ibiImgFallback()` that rewrites to `enc_auto`. Preserve this when touching image rendering. Truly blank image cells in the sheet need a manual valid direct URL — they can't be fixed in code.
4. **Google Drive image URLs:** seller file-uploads are stored in Drive by `uploadImageToDrive` and embedded via `<img>`. Google's old `drive.google.com/uc?export=view&id=…` endpoint **no longer serves image bytes for hotlinking** (it returns an HTML/redirect page) — using it makes every uploaded image render blank. Use `drive.google.com/thumbnail?id=…&sz=w1600` instead (file must be shared `ANYONE_WITH_LINK`). The front-end `ibiNormalizeImgUrl()` repairs any legacy Drive URL shape at load time, so existing broken rows self-heal without a sheet migration — preserve it when touching image rendering. (Drive is only pilot-grade as an image host; for scale, prefer ImgBB/a real CDN.)
5. **The `.gs` file here is a LOCAL MIRROR.** The live backend runs inside the Google Apps Script editor. Editing `IBI_Seller_Backend.gs` here does NOT update production — the human must paste it back into Apps Script and redeploy (see deploy sequence). You cannot reach the Google Sheet or the Cloudflare Worker directly.

## Deploy sequence (backend changes)

When the `.gs` changes, the human follows this order — reflect it in any instructions you give:
1. Back up the **Products** sheet tab.
2. Apply and save the new `.gs` in the Apps Script editor.
3. Run `migrateProductRows()` **once** (only if the product schema/columns changed).
4. Redeploy the Web App as a **new version**.
5. Upload the new `index.html` (front-end) to the repo.

---

## Conventions

- **Versioning (bump on EVERY release — never skip):** In `index.html`, bump `window.IBI_VERSION` — minor for small patches (`v4` → `v4.1`), major for big features (`v4.x` → `v5`) — and update `IBI_VERSION_DATE` + `IBI_VERSION_NOTE`. On a **major** release also bump `CACHE_NAME` in `sw.js`. The top-left storefront badge renders version + date from these (changelog in its tooltip). **Current: v4.13 (23 Jun 2026).**
- **Date/time format (exact):** `28 May 2026, Thursday, 01:38:00 PM`.
- **Brand — two identities (intentional, for now):**
  - *Internal tools* (`ibi-auth-worker.js`, `ibi-password-generator.html`): cyan `#00c5ff` text on black `#000`, fonts Roboto / Roboto Condensed.
  - *Storefront* (`index.html`): Amazon-style palette — navy `#131921`, orange `#f97316`, purple `#8B5CF6`, gold accents; fonts Rajdhani / Hind.
  - If asked to "unify the brand," that means theming the storefront toward the cyan-on-black Roboto identity — confirm scope before doing it (it's a large pass across 9,000 lines).
- **No build step.** `index.html` is static — to preview, just open the file. No npm/Node needed for the storefront.
- **Match the existing style** of whichever file you're editing; keep diffs minimal and reviewable.

## Architectural constraints (know the ceiling)

- **Google Sheets is the database.** It has no real concurrency or transactions and Apps Script has execution/quota limits. Fine for the pilot; will not safely carry 100+ sellers. Flag this when a change assumes database-grade behaviour.
- **Single-password Cloudflare auth is for staff tools, not customer/seller accounts.**
- **Payments:** never mark an order paid without server-side gateway signature verification. Current flow is Zoho payment links + UPI + WhatsApp/email — basic, pilot-grade.
- **Passwords** must be hashed server-side (never plain text in a sheet). Customer PII in a shared sheet is a data-protection risk as the platform grows.

## Current priorities / known gaps (vs an Amazon-style marketplace)

- **P1:** customer-written reviews & ratings (currently display-only stars); returns/refunds/replacement flow; saved address book; real payment gateway (Razorpay/Cashfree) with server-side verification.
- **P2:** coupons/promo codes; recommendations / "frequently bought together"; seller KYC document-verification gate; logistics integration (Shiprocket/Delhivery).
- **P3:** product Q&A; product comparison; recently-viewed; in-app notification centre.
- **Foundation (before scaling past pilot):** migrate Sheets → managed DB (Firestore/Supabase), adopt real per-user auth, then KYC + logistics.

## How to work here

- Build features as **drop-in additions** to the existing files; do not rewrite `index.html` wholesale.
- When changing the product schema, the `PCOL`-sync rule above is non-negotiable.
- Surface the deploy steps the human needs to run (esp. the Apps Script paste + redeploy) since you can't deploy for them.
- This is production — prefer Plan mode for anything non-trivial, and keep changes easy to review in the diff.
