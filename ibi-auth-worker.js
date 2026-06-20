// =============================================================
//  IBI AUTH WORKER  —  Cloudflare Worker (ES Module)
//  Version : 1.0  |  India Business International
// -------------------------------------------------------------
//  Protects: finance / gstr / erp / orders subdomains
//  Auth    : One master password  (SHA-256 hash in env var)
//  Session : Session cookie  (clears when browser closes)
//  Scope   : Shared across all .indiabusinessinternational.online
// =============================================================
//
//  Required Environment Variables (set in Cloudflare dashboard):
//    IBI_PASSWORD_HASH  — SHA-256 hex hash of your master password
//    IBI_SECRET_KEY     — Random 64-char string for signing tokens
//
// =============================================================

const AUTH_PATH     = '/__ibi_auth__';
const COOKIE_NAME   = 'ibi_session';
const COOKIE_DOMAIN = '.indiabusinessinternational.online';

// ── Main fetch handler ────────────────────────────────────────
export default {
  async fetch(request, env) {

    // Safety check: env vars must be set
    if (!env.IBI_PASSWORD_HASH || !env.IBI_SECRET_KEY) {
      return new Response(
        'Worker misconfigured: IBI_PASSWORD_HASH and IBI_SECRET_KEY environment variables are required.',
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    // ── Handle login form submission ──
    if (url.pathname === AUTH_PATH && request.method === 'POST') {
      return handleLogin(request, env);
    }

    // ── Check for a valid session cookie ──
    const cookieHeader = request.headers.get('Cookie') || '';
    const token = parseCookie(cookieHeader, COOKIE_NAME);

    if (token) {
      const valid = await verifyToken(token, env.IBI_SECRET_KEY);
      if (valid) {
        // Authenticated — pass request straight through to origin
        return fetch(request);
      }
    }

    // ── No valid session — serve the IBI login page ──
    const redirectTo = url.pathname + url.search;
    return serveLoginPage(url.origin, redirectTo, false);
  }
};

// ── Login form handler ────────────────────────────────────────
async function handleLogin(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const password   = formData.get('password') || '';
  const redirectTo = formData.get('redirect') || '/';
  const origin     = new URL(request.url).origin;

  // Hash the submitted password and compare to stored hash
  const submittedHash = await sha256(password);

  if (submittedHash !== env.IBI_PASSWORD_HASH) {
    // Wrong password — show login page with error message
    return serveLoginPage(origin, redirectTo, true);
  }

  // ── Correct password: generate a signed session token ──
  const token = await generateToken(env.IBI_SECRET_KEY);

  // Session cookie:
  //   - No Expires / Max-Age  =>  clears when browser is closed
  //   - Domain=.indiabusinessinternational.online  =>  shared across all subdomains
  //   - HttpOnly  =>  not accessible from JavaScript (XSS protection)
  //   - SameSite=Strict  =>  CSRF protection
  //   - Secure  =>  HTTPS only
  const setCookie = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `Domain=${COOKIE_DOMAIN}`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Secure`
  ].join('; ');

  return new Response(null, {
    status: 302,
    headers: {
      'Location'  : redirectTo,
      'Set-Cookie': setCookie
    }
  });
}

// ── Token: generate ──────────────────────────────────────────
async function generateToken(secretKey) {
  const timestamp = Date.now().toString();
  const payload   = `ibi:${timestamp}`;
  const sig       = await hmacSign(payload, secretKey);
  // Token format:  base64(payload) . hex(hmac-signature)
  return btoa(payload) + '.' + sig;
}

// ── Token: verify ────────────────────────────────────────────
async function verifyToken(token, secretKey) {
  try {
    const dotIdx = token.indexOf('.');
    if (dotIdx === -1) return false;

    const b64Payload = token.slice(0, dotIdx);
    const sig        = token.slice(dotIdx + 1);

    const payload     = atob(b64Payload);
    const expectedSig = await hmacSign(payload, secretKey);

    // Constant-length comparison (mitigates timing attacks)
    if (sig.length !== expectedSig.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── HMAC-SHA256 sign ──────────────────────────────────────────
async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── SHA-256 of password text ──────────────────────────────────
async function sha256(text) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Cookie parser ─────────────────────────────────────────────
function parseCookie(cookieHeader, name) {
  const entry = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(name + '='));
  return entry ? entry.slice(name.length + 1) : null;
}

// ── IBI Branded Login Page ────────────────────────────────────
function serveLoginPage(origin, redirectTo, wrongPassword) {

  const errorBlock = wrongPassword
    ? `<div class="error-msg">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
         Incorrect password. Please try again.
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>IBI Secure Access</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Condensed:wght@700;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:'Roboto',sans-serif;
  background:#000000;
  min-height:100vh;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:24px;
  background-image:radial-gradient(circle,rgba(0,197,255,.055) 1px,transparent 1px);
  background-size:28px 28px;
}
.brand{
  display:flex;align-items:center;gap:14px;
  margin-bottom:32px;
  text-align:left;
}
.lock-box{
  width:52px;height:52px;
  background:rgba(0,197,255,.08);
  border:1.5px solid rgba(0,197,255,.25);
  border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
}
.brand-title{
  font-family:'Roboto Condensed',sans-serif;
  font-size:20px;font-weight:900;
  letter-spacing:2.5px;text-transform:uppercase;
  color:#00c5ff;line-height:1;
}
.brand-sub{
  font-size:10px;font-weight:400;
  letter-spacing:2.5px;text-transform:uppercase;
  color:rgba(0,197,255,.4);
  margin-top:4px;
}
.card{
  width:100%;max-width:360px;
  background:#0d0d0d;
  border:1px solid rgba(0,197,255,.13);
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 16px 48px rgba(0,0,0,.7),
             0 0 0 1px rgba(0,197,255,.04);
}
.card-header{
  background:#000;
  border-left:4px solid #00c5ff;
  border-bottom:1px solid rgba(0,197,255,.1);
  padding:13px 20px;
  font-family:'Roboto Condensed',sans-serif;
  font-size:11px;font-weight:900;
  letter-spacing:3px;text-transform:uppercase;
  color:#00c5ff;
}
.card-body{padding:24px 22px 26px;}
label{
  display:block;
  font-size:11px;font-weight:700;
  letter-spacing:1px;text-transform:uppercase;
  color:rgba(0,197,255,.5);
  margin-bottom:8px;
}
.input-wrap{position:relative;}
input[type=password],input[type=text]{
  width:100%;
  padding:13px 46px 13px 14px;
  font-family:'Roboto',sans-serif;font-size:15px;
  background:#080808;color:#ffffff;
  border:1px solid rgba(0,197,255,.18);
  border-radius:9px;
  outline:none;
  -webkit-appearance:none;appearance:none;
  transition:border-color .2s,box-shadow .2s;
}
input:focus{
  border-color:#00c5ff;
  box-shadow:0 0 0 3px rgba(0,197,255,.12);
}
.toggle-btn{
  position:absolute;right:12px;top:50%;
  transform:translateY(-50%);
  background:none;border:none;cursor:pointer;
  color:rgba(0,197,255,.35);padding:4px;
  line-height:0;
  transition:color .15s;
}
.toggle-btn:hover{color:#00c5ff;}
.error-msg{
  display:flex;align-items:center;gap:7px;
  font-size:12px;color:#f87171;
  background:rgba(248,113,113,.07);
  border:1px solid rgba(248,113,113,.2);
  border-radius:8px;
  padding:10px 12px;
  margin-top:12px;
}
.submit-btn{
  width:100%;margin-top:20px;
  padding:14px;
  font-family:'Roboto Condensed',sans-serif;
  font-size:13px;font-weight:900;
  letter-spacing:2.5px;text-transform:uppercase;
  background:#00c5ff;color:#000000;
  border:none;border-radius:9px;
  cursor:pointer;
  transition:background .2s,transform .1s;
  box-shadow:0 4px 20px rgba(0,197,255,.22);
}
.submit-btn:hover{background:#00aadd;}
.submit-btn:active{transform:scale(.98);}
.footer-note{
  margin-top:22px;
  font-size:10px;letter-spacing:1.5px;text-transform:uppercase;
  color:rgba(255,255,255,.18);
  text-align:center;
}
</style>
</head>
<body>

<div class="brand">
  <div class="lock-box">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c5ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  </div>
  <div>
    <div class="brand-title">IBI Access</div>
    <div class="brand-sub">India Business International</div>
  </div>
</div>

<div class="card">
  <div class="card-header">Secure Authentication</div>
  <div class="card-body">
    <form method="POST" action="${origin}${AUTH_PATH}">
      <input type="hidden" name="redirect" value="${redirectTo}">
      <label for="pwd">Master Password</label>
      <div class="input-wrap">
        <input type="password" id="pwd" name="password"
               placeholder="Enter master password"
               autofocus autocomplete="current-password" required>
        <button type="button" class="toggle-btn" id="toggleBtn"
                onclick="toggleVisibility()" title="Show / hide password" aria-label="Toggle password visibility">
          <svg id="eyeShow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <svg id="eyeHide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
      </div>
      ${errorBlock}
      <button type="submit" class="submit-btn">Unlock Access &rarr;</button>
    </form>
  </div>
</div>

<div class="footer-note">Protected by IBI Security &nbsp;&middot;&nbsp; eCommerce for the World</div>

<script>
function toggleVisibility() {
  var input = document.getElementById('pwd');
  var show  = document.getElementById('eyeShow');
  var hide  = document.getElementById('eyeHide');
  if (input.type === 'password') {
    input.type = 'text';
    show.style.display = 'none';
    hide.style.display = 'inline';
  } else {
    input.type = 'password';
    show.style.display = 'inline';
    hide.style.display = 'none';
  }
}
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
}
