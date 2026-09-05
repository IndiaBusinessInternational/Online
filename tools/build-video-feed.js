#!/usr/bin/env node
// ============================================================================
// build-video-feed.js — Watch & Shop feed from the IBI YouTube channel (v19.1)
//
// Lists EVERY upload on @IndiaBusinessInternational (UCo-wwOkYxCPaG60XVQ_xD4w),
// joins each video to the catalogue product it shows, and writes
// /videos-feed.json at the repo root. The backend's syncVideoFeed() (called from
// the admin desk, and lazily by getVideos every 6 h) upserts that file into the
// Videos sheet as Published house-brand videos — so a new product video appears
// in Watch & Shop without anyone typing it in.
//
// How a video finds its product, in order of trust:
//   1. "#product-PROD-…" or "/p/<slug>/" in the description (Social Flow writes
//      one of these into every video it publishes) — exact.
//   2. Title match: the video title with its marketing tail removed ("at ₹…",
//      "| …", "#Shorts", "— Product Overview", "- Video") against every product
//      title without the brand word. Accepted when the video's words are ≥ 70 %
//      covered by one product and that product beats the runner-up clearly.
//   A video that matches nothing is listed in the report and left out of the
//   feed (a video with no product is not shoppable).
//
// Credentials: none of its own. It reuses the YouTube OAuth the IBI Social Flow
// app already holds on this laptop (client id/secret in its .env, refresh token
// in its SQLite db) — read-only listing of our own channel. Nothing is written
// to YouTube. Run on the laptop only.
//
// Usage:  node tools/build-video-feed.js            # writes videos-feed.json
//         node tools/build-video-feed.js --report   # matching report, no write
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const SOCIAL = path.resolve(ROOT, '..', 'IBI Social Flow');
const CHANNEL_UPLOADS = 'UUo-wwOkYxCPaG60XVQ_xD4w';   // uploads playlist = channel id with UC→UU
const SELLER_ID = 'IINTELLIGENCEI';
const REPORT_ONLY = process.argv.includes('--report');

function env() {
  const out = {};
  for (const line of fs.readFileSync(path.join(SOCIAL, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}
async function accessToken() {
  const e = env();
  const db = new DatabaseSync(path.join(SOCIAL, 'data', 'ibi.db'), { readOnly: true });
  const row = db.prepare("select refresh_token from platforms where id='youtube'").get(); db.close();
  if (!row || !row.refresh_token) throw new Error('Social Flow has no YouTube refresh token — connect YouTube there first');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: e.YOUTUBE_CLIENT_ID, client_secret: e.YOUTUBE_CLIENT_SECRET, refresh_token: row.refresh_token, grant_type: 'refresh_token' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('token refresh failed: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}
async function listUploads(token) {
  const items = []; let pageToken = '';
  do {
    const q = new URLSearchParams({ part: 'snippet,contentDetails', playlistId: CHANNEL_UPLOADS, maxResults: '50' }); if (pageToken) q.set('pageToken', pageToken);
    const r = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?' + q, { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json(); if (!j.items) throw new Error('playlistItems failed: ' + JSON.stringify(j).slice(0, 300));
    for (const it of j.items) {
      const s = it.snippet || {}; if (!s.resourceId || s.resourceId.kind !== 'youtube#video') continue;
      // private/deleted uploads come back with no thumbnails and a placeholder title
      if (/^(Private|Deleted) video$/i.test(s.title || '')) continue;
      items.push({ id: s.resourceId.videoId, title: s.title || '', description: s.description || '', publishedAt: s.publishedAt || (it.contentDetails || {}).videoPublishedAt || '',
        thumb: ((s.thumbnails || {}).high || (s.thumbnails || {}).medium || (s.thumbnails || {}).default || {}).url || '' });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return items;
}
// visibility: the playlist lists unlisted/private uploads too; only PUBLIC videos belong on the shop
async function publicIds(token, ids) {
  const ok = new Set();
  for (let i = 0; i < ids.length; i += 50) {
    const q = new URLSearchParams({ part: 'status', id: ids.slice(i, i + 50).join(','), maxResults: '50' });
    const r = await fetch('https://www.googleapis.com/youtube/v3/videos?' + q, { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json(); for (const v of (j.items || [])) if (v.status && v.status.privacyStatus === 'public' && v.status.uploadStatus === 'processed') ok.add(v.id);
  }
  return ok;
}

// ── matching ──
// words that carry no product identity — in the video title OR the listing title
const STOP = new Set(['for', 'and', 'with', 'the', 'of', 'in', 'a', 'to', 'at', 'by', 'on', 'or', 'qty', 'pack', 'set', 'piece', 'pc', 'video', 'short', 'yt', 'product', 'overview', 'full', 'review', 'unboxing',
  'ibi', 'iintelligencei', 'india', 'business', 'international', 'online', 'buy', 'shop', 'now', 'best', 'price', 'off', 'mrp', 'free', 'delivery', 'sale', 'available', 'model', 'type', 'colour', 'color', 'size',
  'capacity', 'beautiful', 'premium', 'natural', 'traditional', 'handmade', 'new', 'making', 'make', 'season', 'brand', 'grade', 'certified', 'bi', 'isi', 'marked', 'home', 'kitchen', 'use', 'usage', 'quality',
  'live', 'demo', 'youtube', 'purchase', 'www', 'elegant', 'style', 'modern', 'girl', 'women', 'woman', 'men', 'man', 'kid', 'beauty', 'enhancing', 'need', 'regular', 'carrying', 'latest', 'authentic', 'indian', 'craftsmanship', '1qty',
  // colours name a variant, not a listing — a video "Hydro Crystal Beads Chain Black and Yellow" shows the beads-chain listing
  'black', 'white', 'red', 'green', 'yellow', 'blue', 'pink', 'purple', 'orange', 'brown', 'grey', 'gray', 'gold', 'golden', 'silver', 'multicolor', 'multicolour', 'multi', 'turquoise', 'emerald', 'cobalt', 'light', 'dark']);
// spellings that differ between old video titles and the listings
const ALIAS = { dosai: 'dosa', aluminum: 'aluminium', hydrocrystal: 'hydro crystal', mangowood: 'mango wood', broomstick: 'broom stick', broomsticks: 'broom sticks', nonstick: 'non stick', tshirt: 't shirt', tshirts: 't shirts', biryani: 'biriyani', rambai: 'biriyani', korai: 'koram', korampa: 'koram pai', mices: 'mice' };
function coreTitle(t) {
  return String(t || '').replace(/\s+at\s+₹[\d,]+.*$/i, '').replace(/\s*\|.*$/, '').replace(/#\w+/g, '').replace(/\(\d+% ?off\)/i, '').replace(/₹[\d,]+/g, '')
    .replace(/\s*[—–-]\s*(product overview|full overview|yt video|video|shorts?|in \w+)\s*$/i, '').replace(/\s*\b(available\s+)?for\s+online\s+sales?(\s+available)?\b.*$/i, '')
    .replace(/\s*\b(yt\s+)?video\s*$/i, '').replace(/\s+/g, ' ').replace(/^[\s\-–—,]+|[\s\-–—,]+$/g, '').trim();
}
// light stemming so "diyas" meets "diya", "cups" meets "cup", "t-shirts" meets "t-shirt"
function stem(w) { if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y'; if (w.length > 3 && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2); if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1); return w; }
function tokens(s) {
  const out = new Set(); const raw = String(s || '').toLowerCase().replace(/iintelligencei/g, ' ').replace(/[^a-z0-9]+/g, ' ').split(' ').map(w => ALIAS[w] || w).join(' ').split(' ');
  for (const w of raw) { const t = stem(w); if (t.length > 1 && !STOP.has(t) && !STOP.has(w) && !/^\d+$/.test(t)) out.add(t); }
  return out;
}
// A video can show several near-identical listings (a chain in six colours, three rice-pot sizes):
// every product that covers the title as well as the best one is pinned, up to four.
function matchProduct(video, products, slugs) {
  const d = video.description || '';
  let m = d.match(/#product-(PROD-[A-Z0-9-]+)/i); if (m) { const p = products.find(x => x.productId.toUpperCase() === m[1].toUpperCase()); if (p) return { ps: [p], how: 'link' }; }
  m = d.match(/\/p\/([a-z0-9-]+)\//i); if (m && slugs[m[1]]) { const p = products.find(x => x.productId === slugs[m[1]]); if (p) return { ps: [p], how: 'slug' }; }
  const vt = tokens(coreTitle(video.title)); if (vt.size < 2) return null;
  const scored = products.map(p => { const pt = tokens(p.title); let hit = 0; for (const w of vt) if (pt.has(w)) hit++; const cover = hit / vt.size; return { p, cover, score: cover * 0.75 + (hit / Math.max(1, pt.size)) * 0.25 }; })
    .sort((a, b) => b.score - a.score);
  const best = scored[0]; if (!best || best.cover < 0.7) return null;
  const ps = scored.filter(x => x.cover >= 0.7 && best.score - x.score < 0.12).slice(0, 4).map(x => x.p);
  return { ps, how: 'title ' + Math.round(best.cover * 100) + '%' + (ps.length > 1 ? ' x' + ps.length : '') };
}
function dateText(iso) { const d = new Date(iso); if (isNaN(d)) return ''; const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const ist = new Date(d.getTime() + 330 * 60000); return ('0' + ist.getUTCDate()).slice(-2) + ' ' + M[ist.getUTCMonth()] + ' ' + ist.getUTCFullYear(); }

(async () => {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
  const products = (cat.products || []).filter(p => p.productId && String(p.sellerId || '').toUpperCase() === SELLER_ID);
  const slugs = {}; for (const [pid, slug] of Object.entries(cat.slugs || {})) slugs[String(slug)] = pid;   // products.json maps productId → slug; the matcher needs slug → productId
  const token = await accessToken();
  const uploads = await listUploads(token);
  const pub = await publicIds(token, uploads.map(u => u.id));
  const feed = [], unmatched = [], hidden = [];
  for (const v of uploads) {
    if (!pub.has(v.id)) { hidden.push(v); continue; }
    const hit = matchProduct(v, products, slugs);
    if (!hit) { unmatched.push(v); continue; }
    feed.push({ url: 'https://www.youtube.com/watch?v=' + v.id, ytId: v.id, title: coreTitle(v.title) || hit.ps[0].title.replace(/^iINTELLIGENCEi\s*/i, ''), kind: 'youtube', thumb: v.thumb,
      sellerId: SELLER_ID, recordedOn: dateText(v.publishedAt), publishedAt: v.publishedAt, products: hit.ps.map(p => ({ productId: p.productId })), _how: hit.how, _product: hit.ps.map(p => p.title.replace(/^iINTELLIGENCEi\s*/i, '').slice(0, 48)).join(' + ') });
  }
  feed.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const byHow = {}; for (const f of feed) { const k = f._how.split(' ')[0]; byHow[k] = (byHow[k] || 0) + 1; }
  console.log(`uploads ${uploads.length} | public ${pub.size} | matched ${feed.length} (${JSON.stringify(byHow)}) | unmatched ${unmatched.length} | not public ${hidden.length}`);   // ASCII only: the task log is cp1252
  const distinct = new Set(); feed.forEach(f => f.products.forEach(x => distinct.add(x.productId))); console.log(`products covered: ${distinct.size} of ${products.length}`);
  if (REPORT_ONLY) {
    console.log('\n-- title matches (verify these) --'); for (const f of feed.filter(x => x._how.startsWith('title'))) console.log(`  [${f._how}] ${f.title.slice(0, 60)}  =>  ${f._product}`);
    console.log('\n-- unmatched (best candidate shown) --');
    for (const v of unmatched) { const vt = tokens(coreTitle(v.title)); const c = products.map(p => { const pt = tokens(p.title); let h = 0; for (const w of vt) if (pt.has(w)) h++; return { p, cover: h / Math.max(1, vt.size) }; }).sort((a, b) => b.cover - a.cover)[0];
      console.log(`  ${v.id}  ${coreTitle(v.title).slice(0, 55)}  [${[...vt].join(' ')}]  ~${c ? Math.round(c.cover * 100) + '% ' + c.p.title.replace(/^iINTELLIGENCEi\s*/i, '').slice(0, 40) : ''}`); }
    return;
  }
  // no timestamp in either file: the nightly task commits only when the CONTENT changed
  const out = { channel: 'UCo-wwOkYxCPaG60XVQ_xD4w', count: feed.length, videos: feed.map(({ _how, _product, publishedAt, ...rest }) => rest) };
  const dest = path.join(ROOT, 'videos-feed.json'); const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(out, null, 1)); fs.renameSync(tmp, dest);
  fs.writeFileSync(path.join(ROOT, 'tools', 'video-feed-report.txt'), [`uploads ${uploads.length} | public ${pub.size} | matched ${feed.length} | unmatched ${unmatched.length}`, '', 'UNMATCHED (no product found — give the video a product link in its YouTube description):', ...unmatched.map(v => `  ${v.id}  ${v.title}`), '', 'TITLE MATCHES:', ...feed.filter(x => x._how.startsWith('title')).map(f => `  [${f._how}] ${f.title}  =>  ${f._product}`)].join('\n'));
  console.log('wrote videos-feed.json + tools/video-feed-report.txt');
})().catch(e => { console.error('build-video-feed failed:', e.message); process.exit(1); });
