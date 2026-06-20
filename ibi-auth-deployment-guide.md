# IBI Auth Worker — Deployment Guide
**India Business International | Server-Side Authentication**

---

## What This Does

Every request to your protected subdomains is intercepted at **Cloudflare's network level** before it ever reaches GitHub Pages. Without the correct password, the page is never served. This is genuine server-side protection.

**Protected apps after setup:**
- `finance.indiabusinessinternational.online` — Finance Tracker
- `gstr.indiabusinessinternational.online` — GST Report Generator
- `erp.indiabusinessinternational.online` — IBI ERP System
- `settlement.indiabusinessinternational.online` — Settlement Tracker

**Session behaviour:** Shared across all protected apps — login once, access all. Cookie clears when the browser is fully closed.

---

## Files You Have

| File | Purpose |
|---|---|
| `ibi-auth-worker.js` | The Cloudflare Worker code — paste this into Cloudflare |
| `ibi-password-generator.html` | Open in browser to generate your password hash & secret key |
| `ibi-auth-deployment-guide.md` | This file |

---

## Step 1 — Generate Your Credentials

1. **Open `ibi-password-generator.html`** in any browser (just double-click the file — no server needed).
2. Type your desired **master password** in the field.
3. Click **Generate Credentials**.
4. You will see two values:
   - **IBI_PASSWORD_HASH** — a 64-character hex string (SHA-256 hash of your password)
   - **IBI_SECRET_KEY** — a 64-character random hex string (used to sign session tokens)
5. **Copy both values and save them somewhere safe** (e.g. a private note or password manager). You will need them in Step 4.

> ⚠ The Secret Key is randomly generated each time you click the button. If you generate again later, you will get a different key and all existing sessions will be invalidated. Save it now.

---

## Step 2 — Create the Worker in Cloudflare

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** and log in.
2. In the left sidebar, click **Workers & Pages**.
3. Click the **Create** button (top right).
4. Select **Create Worker**.
5. Give it a name: `ibi-auth-worker` (or any name you prefer).
6. Click **Deploy** (this deploys a placeholder — you will replace the code next).

---

## Step 3 — Paste the Worker Code

1. After deploying, click **Edit Code** (or go to the Worker → **Edit** tab).
2. You will see a code editor with a default "Hello World" script.
3. **Select all the existing code** (Ctrl+A / Cmd+A) and **delete it**.
4. **Open `ibi-auth-worker.js`**, select all its content, and **paste it** into the Cloudflare editor.
5. Click **Save and Deploy** (top right of editor).

---

## Step 4 — Add Environment Variables

This is where you store your password hash and secret key securely inside Cloudflare.

1. Go back to your Worker's main page (click the Worker name in Workers & Pages).
2. Click the **Settings** tab.
3. Scroll down to **Variables and Secrets**.
4. Click **Add variable** and add the first one:
   - **Variable name:** `IBI_PASSWORD_HASH`
   - **Value:** Paste the hash you copied in Step 1
   - Click **Save**
5. Click **Add variable** again for the second one:
   - **Variable name:** `IBI_SECRET_KEY`
   - **Value:** Paste the secret key you copied in Step 1
   - Click **Save**

> Both variables should now appear in the list. The values are encrypted and not visible after saving.

---

## Step 5 — Add Worker Routes

This tells Cloudflare which subdomains the Worker should intercept.

1. Go to your Worker's **Settings** tab.
2. Scroll to **Triggers** → **Routes**.
3. Click **Add Route** and add each of the following routes one by one:

| Route Pattern | Zone |
|---|---|
| `finance.indiabusinessinternational.online/*` | indiabusinessinternational.online |
| `gstr.indiabusinessinternational.online/*` | indiabusinessinternational.online |
| `erp.indiabusinessinternational.online/*` | indiabusinessinternational.online |
| `settlement.indiabusinessinternational.online/*` | indiabusinessinternational.online |

For each route:
- Paste the route pattern
- Select `indiabusinessinternational.online` as the Zone
- Click **Save**

---

## Step 6 — Test It

1. Open a **new private/incognito browser window** (to ensure no existing cookies).
2. Visit `https://finance.indiabusinessinternational.online`
3. You should see the **IBI Secure Access login page** (black background, cyan branding).
4. Enter your master password and click **Unlock Access**.
5. You should be redirected to the Finance app — now fully authenticated.
6. Visit `https://orders.indiabusinessinternational.online` — it should open **without prompting again** (shared session cookie).
7. Close the browser entirely and re-open — you should be prompted again (session cleared).

---

## How to Change the Password Later

1. Open `ibi-password-generator.html` in your browser.
2. Type your **new password** and click Generate.
3. Copy the new **IBI_PASSWORD_HASH** value.
4. Go to Cloudflare → Workers & Pages → `ibi-auth-worker` → Settings → Variables.
5. Click the **edit (pencil) icon** next to `IBI_PASSWORD_HASH`.
6. Paste the new hash and save.
7. All existing sessions are immediately invalidated. Users must log in again with the new password.

> You do NOT need to change `IBI_SECRET_KEY` when changing the password.

---

## How to Add More Protected Apps Later

To protect an additional subdomain (e.g., `staff.indiabusinessinternational.online`):

1. Go to Worker → Settings → Triggers → Routes.
2. Click **Add Route**.
3. Enter: `staff.indiabusinessinternational.online/*`
4. Select the zone and save.

That's all. No code changes needed.

---

## How to Remove Protection from an App

1. Go to Worker → Settings → Triggers → Routes.
2. Find the route for that subdomain.
3. Click the **delete (×) icon** next to it.
4. The app is immediately unprotected again.

---

## Understanding the Security

| Layer | What it does |
|---|---|
| **Cloudflare Worker** | Intercepts every HTTP request at the network edge before it reaches GitHub Pages |
| **SHA-256 password hash** | Your actual password is never stored — only its hash. Even Cloudflare cannot reverse it. |
| **HMAC-SHA256 session token** | Each session token is cryptographically signed. Tampered or forged tokens are rejected. |
| **HttpOnly cookie** | JavaScript on the page cannot read or steal the session cookie. |
| **SameSite=Strict** | Prevents cross-site request forgery (CSRF) attacks. |
| **Secure flag** | Cookie is only sent over HTTPS, never plain HTTP. |

---

*IBI Auth Worker v1.0 — India Business International*
