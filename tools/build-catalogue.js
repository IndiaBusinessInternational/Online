// ══════════════════════════════════════════════════════════════════════════════
// IBI Marketplace — catalogue snapshot & per-product page generator.
//
// Run by .github/workflows/catalogue-snapshot.yml every 30 minutes (and by hand:
// `node tools/build-catalogue.js`). It:
//   1. fetches the live catalogue from the Apps Script backend (getApprovedProducts)
//   2. writes products.json           — the snapshot the storefront seeds from (~50ms
//                                       from the CDN instead of 2–11s from Apps Script)
//   3. generates /p/<slug>/index.html — one REAL static page per product, with full
//                                       SEO head + JSON-LD Product schema, so every
//                                       product has its own URL Google can rank
//   4. rewrites sitemap.xml           — homepage + every product page
//   5. rewrites the block between <!-- IBI:SSR:START --> and <!-- IBI:SSR:END --> in
//      index.html, so the home page a crawler receives contains the actual product
//      cards (the SPA repaints the grid at runtime; the markers live in the SOURCE)
//
// Design rules (do not break):
//   • Slugs come from the title and are remembered in products.json. If a title is
//     edited, the OLD slug keeps a stub page that points at the new URL, so shared
//     links never die. Deleted products lose their folder and sitemap entry.
//   • NO fabricated data in structured markup — the storefront's cosmetic 4.5 stars
//     and random review counts must never appear in JSON-LD (Google penalises it).
//   • HSN codes and product ids are strings. Never parseInt them.
//   • Everything here must run on bare Node 20 (global fetch, no npm deps).
// ══════════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const ORIGIN = 'https://www.indiabusinessinternational.online';
const FEED   = 'https://script.google.com/macros/s/AKfycbyJw77dIdd0f2e8UDJIRefW_f07UH_5KWtoAyJ3iA-i6NaZWCXrCLy4t3IY-_vr7sq9/exec?action=getApprovedProducts';
const BRAND  = 'iINTELLIGENCEi';

// ── small helpers ─────────────────────────────────────────────────────────────
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Same repairs the storefront applies at runtime (ibiNormalizeImgUrl / ibiImgFallback):
// old Google-Drive endpoints no longer serve bytes, and Wix enc_avif can fail to render.
function fixImg(u) {
  u = String(u || '').trim();
  if (!u) return '';
  const m = u.match(/drive\.google\.com\/(?:uc\?(?:[^#]*&)?id=|file\/d\/|open\?id=|thumbnail\?id=)([\w-]{20,})/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600';
  return u.replace(/\/v1\/fill\/([^/]*),enc_avif([^/]*)\//, '/v1/fill/$1,enc_auto$2/');
}

function imagesOf(p) {
  return [p.img].concat(String(p.additionalImgs || '').split(/[|,]/))
    .map(fixImg).filter(u => /^https?:\/\//i.test(u))
    .filter((u, i, a) => a.indexOf(u) === i);
}

// ⚠ Keep IDENTICAL to ibiProductSlug() in index.html — the storefront builds share
// links with its copy and they must land on the pages this file generates.
function slugOf(title) {
  let s = String(title || '')
    .replace(/^iINTELLIGENCEi\s+/i, '')
    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[×x]/g, 'x')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (s.length > 80) s = s.slice(0, 80).replace(/-[^-]*$/, '');
  return s || 'product';
}

function parseVariations(p) {
  try {
    const v = JSON.parse(p.variations || '[]');
    if (v && !Array.isArray(v) && v._matrix) return { matrix: v };
    if (Array.isArray(v) && v.length) return { flat: v };
  } catch (e) {}
  return {};
}

// Price / stock across the whole listing (matrix combos override the base cells).
function pricing(p) {
  const v = parseVariations(p);
  let prices = [], stock = 0;
  if (v.matrix) {
    (v.matrix.combos || []).forEach(c => {
      if (!c || c.on === 0) return;
      const pr = parseFloat(c.price);
      if (pr > 0) prices.push(pr);
      stock += parseInt(c.stock, 10) || 0;
    });
  }
  if (!prices.length) prices = [parseFloat(p.price) || 0];
  if (!stock) stock = parseInt(p.stock, 10) || 0;
  return {
    min: Math.min.apply(null, prices),
    max: Math.max.apply(null, prices),
    mrp: parseFloat(p.mrp) || 0,
    inStock: stock > 0,
  };
}

// ── page template ─────────────────────────────────────────────────────────────
function productPage(p, slug) {
  const imgs   = imagesOf(p);
  const pr     = pricing(p);
  const v      = parseVariations(p);
  const url    = ORIGIN + '/p/' + slug + '/';
  const title  = String(p.title || '').replace(/^iINTELLIGENCEi\s+/i, '');
  const desc   = String(p.description || '').replace(/\s+/g, ' ').trim();
  const metaD  = (desc || title).slice(0, 155);
  const bullets = String(p.bullets || '').split('|').map(s => s.trim()).filter(Boolean);
  const priceTxt = pr.min === pr.max ? '₹' + pr.min : '₹' + pr.min + ' – ₹' + pr.max;
  const off    = pr.mrp > pr.min ? Math.round((1 - pr.min / pr.mrp) * 100) : 0;

  // JSON-LD Product — real data only; no ratings (the storefront's stars are cosmetic).
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: title, image: imgs, description: desc || title,
    sku: String(p.productId || ''), brand: { '@type': 'Brand', name: p.brand || BRAND },
    offers: {
      '@type': pr.min === pr.max ? 'Offer' : 'AggregateOffer',
      url: url, priceCurrency: 'INR',
      availability: 'https://schema.org/' + (pr.inStock ? 'InStock' : 'OutOfStock'),
    },
  };
  if (pr.min === pr.max) ld.offers.price = String(pr.min);
  else { ld.offers.lowPrice = String(pr.min); ld.offers.highPrice = String(pr.max); ld.offers.offerCount = undefined; }

  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'IBI Marketplace', item: ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: title, item: url },
    ],
  };

  let variantRows = '';
  if (v.matrix && (v.matrix.combos || []).some(c => c && c.on !== 0)) {
    variantRows = '<h2>Available options</h2><table class="vt"><tr><th>Option</th><th>Price</th><th>MRP</th></tr>' +
      v.matrix.combos.filter(c => c && c.on !== 0).map(c =>
        '<tr><td>' + esc(c.title || (c.opts || []).join(' / ')) + '</td><td>₹' + esc(c.price || p.price) +
        '</td><td class="mrp">₹' + esc(c.mrp || p.mrp) + '</td></tr>').join('') + '</table>';
  }

  const dims = [];
  if (p.productDimensions) dims.push(['Product size', p.productDimensions]);
  if (p.packageDimensions) dims.push(['Package size', p.packageDimensions]);

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + esc(title.slice(0, 60)) + ' — ' + BRAND + ' | IBI Marketplace</title>\n' +
    '<meta name="description" content="' + esc(metaD) + '">\n' +
    '<link rel="canonical" href="' + url + '">\n' +
    '<meta property="og:type" content="product"><meta property="og:title" content="' + esc(title.slice(0, 70)) + '">' +
    '<meta property="og:description" content="' + esc(metaD) + '">' +
    (imgs[0] ? '<meta property="og:image" content="' + esc(imgs[0]) + '">' : '') +
    '<meta property="og:url" content="' + url + '"><meta property="og:site_name" content="IBI Marketplace">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n' +
    '<script type="application/ld+json">' + JSON.stringify(crumbs) + '</script>\n' +
    '<style>\n' +
    'body{margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#131921;background:#fff}\n' +
    '.top{background:#131921;color:#fff;padding:12px 20px;font-weight:800}.top a{color:#fff;text-decoration:none}\n' +
    '.wrap{max-width:960px;margin:0 auto;padding:20px}\n' +
    '.crumb{font-size:13px;color:#666;margin-bottom:12px}.crumb a{color:#0098c9;text-decoration:none}\n' +
    'h1{font-size:24px;line-height:1.35;margin:0 0 10px}\n' +
    '.gal{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.gal img{width:170px;height:170px;object-fit:contain;border:1px solid #eee;border-radius:10px;background:#fff}\n' +
    '.price{font-size:26px;font-weight:900;color:#131921}.mrp{color:#888;text-decoration:line-through;font-weight:400}\n' +
    '.off{color:#16a34a;font-weight:800;font-size:15px;margin-left:8px}\n' +
    '.stock{display:inline-block;margin:8px 0;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700}\n' +
    '.in{background:#dcfce7;color:#166534}.out{background:#fee2e2;color:#b91c1c}\n' +
    '.cta{display:inline-block;margin:16px 12px 16px 0;padding:13px 30px;background:#f97316;color:#fff;border-radius:10px;font-weight:800;text-decoration:none;font-size:16px}\n' +
    '.cta.alt{background:#fff;color:#131921;border:1.5px solid #ccc}\n' +
    'h2{font-size:17px;margin:22px 0 8px}ul{padding-left:20px}li{margin:6px 0;line-height:1.5}\n' +
    'p.d{line-height:1.65;color:#333}\n' +
    '.vt{border-collapse:collapse;width:100%;max-width:560px}.vt td,.vt th{border:1px solid #e5e7eb;padding:8px 12px;font-size:14px;text-align:left}\n' +
    '.foot{margin-top:36px;padding:18px 20px;background:#131921;color:#bbb;font-size:13px;text-align:center}.foot a{color:#4dd0ff}\n' +
    '</style>\n</head>\n<body>\n' +
    '<div class="top"><a href="/">🛍️ IBI Marketplace — India Business International</a></div>\n' +
    '<div class="wrap">\n' +
    '<div class="crumb"><a href="/">All Products</a> › ' + esc(title.slice(0, 60)) + '</div>\n' +
    '<h1>' + esc(title) + '</h1>\n' +
    '<div class="gal">' + imgs.slice(0, 8).map((u, i) =>
      '<img src="' + esc(u) + '" alt="' + esc(title.slice(0, 60)) + (imgs.length > 1 ? ' — photo ' + (i + 1) : '') + '"' +
      (i ? ' loading="lazy" decoding="async"' : '') + '>').join('') + '</div>\n' +
    '<div class="price">' + esc(priceTxt) +
    (pr.mrp > pr.min ? ' <span class="mrp">₹' + pr.mrp + '</span>' : '') +
    (off ? '<span class="off">' + off + '% off</span>' : '') + '</div>\n' +
    '<span class="stock ' + (pr.inStock ? 'in">✓ In stock' : 'out">Out of stock') + '</span><br>\n' +
    '<a class="cta" href="/?p=' + encodeURIComponent(p.productId || '') + '">🛒 Buy on IBI Marketplace</a>' +
    '<a class="cta alt" href="/">Browse all products</a>\n' +
    (desc ? '<h2>About this item</h2><p class="d">' + esc(desc) + '</p>' : '') +
    (bullets.length ? '<h2>Highlights</h2><ul>' + bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' : '') +
    variantRows +
    (dims.length ? '<h2>Details</h2><table class="vt">' + dims.map(d =>
      '<tr><th>' + esc(d[0]) + '</th><td>' + esc(d[1]) + '</td></tr>').join('') + '</table>' : '') +
    '\n</div>\n' +
    '<div class="foot">' + BRAND + ' · Kanyakumari, Tamil Nadu · <a href="/">indiabusinessinternational.online</a> — eCommerce for the World</div>\n' +
    '</body>\n</html>\n';
}

// A renamed product keeps its old address: tiny stub that sends people (and link
// equity, via the canonical) to the new URL.
function redirectStub(oldSlug, newSlug) {
  const to = ORIGIN + '/p/' + newSlug + '/';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
    '<title>Moved — IBI Marketplace</title>\n' +
    '<link rel="canonical" href="' + to + '">\n' +
    '<meta http-equiv="refresh" content="0;url=' + to + '">\n' +
    '</head>\n<body><p>This product has moved to <a href="' + to + '">' + to + '</a>.</p></body>\n</html>\n';
}

// Home-grid card used in the pre-rendered block. Plain anchors — crawlable with no JS —
// styled by the classes index.html already defines. The SPA repaints over them at runtime.
function ssrCard(p, slug) {
  const imgs = imagesOf(p);
  const pr = pricing(p);
  const title = String(p.title || '').replace(/^iINTELLIGENCEi\s+/i, '');
  return '<a class="product-card ibi-ssr-card" href="/p/' + slug + '/" style="text-decoration:none;color:inherit;display:block;">' +
    '<div class="product-img-wrap">' +
    (imgs[0] ? '<img src="' + esc(imgs[0]) + '" alt="' + esc(title.slice(0, 70)) + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;">' : '') +
    '</div><div class="product-info"><div class="product-brand">' + esc(p.brand || BRAND) + '</div>' +
    '<h3 class="product-title">' + esc(title.slice(0, 90)) + '</h3>' +
    '<div class="product-price"><span class="price-now">₹' + pr.min + '</span>' +
    (pr.mrp > pr.min ? ' <span class="price-mrp" style="color:#888;text-decoration:line-through;font-size:13px;">₹' + pr.mrp + '</span>' : '') +
    '</div></div></a>';
}

// ── main ──────────────────────────────────────────────────────────────────────
(async function main() {
  console.log('fetching catalogue…');
  let feed = null;
  for (let attempt = 1; attempt <= 3 && !feed; attempt++) {
    try {
      const res = await fetch(FEED, { redirect: 'follow' });
      const j = await res.json();
      if (j && j.success && Array.isArray(j.products)) feed = j.products;
    } catch (e) { console.log('  attempt ' + attempt + ' failed: ' + e.message); }
    if (!feed && attempt < 3) await new Promise(r => setTimeout(r, attempt * 3000));
  }
  if (!feed) { console.error('catalogue unreachable after 3 attempts — leaving everything as it is'); process.exit(1); }
  console.log('  ' + feed.length + ' approved products');

  // Seller's arrangement: sortOrder >= 1 first (ascending), unarranged after, feed order.
  const list = feed.map((p, i) => ({ p, i, r: (parseInt(p.sortOrder, 10) || 0) >= 1 ? parseInt(p.sortOrder, 10) : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => (a.r - b.r) || (a.i - b.i)).map(x => x.p);

  // Previous snapshot → old slugs + accumulated redirects.
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8')); } catch (e) {}
  const redirects = Object.assign({}, prev.redirects || {});

  // Assign slugs (unique; keyed by productId so a re-run is stable).
  const slugs = {}, used = new Set(Object.keys(redirects));
  list.forEach(p => {
    let s = slugOf(p.title), n = 2;
    while (used.has(s) && !(slugs[p.productId] === s)) s = slugOf(p.title) + '-' + (n++);
    used.add(s); slugs[String(p.productId)] = s;
  });

  // A title edit moved the product to a new slug → remember the old one as a redirect.
  Object.entries(prev.slugs || {}).forEach(([pid, oldSlug]) => {
    const now = slugs[pid];
    if (now && now !== oldSlug) redirects[oldSlug] = now;
  });
  // Never redirect a slug that is in live use again.
  Object.keys(redirects).forEach(s => { if (Object.values(slugs).includes(s)) delete redirects[s]; });

  // Nothing actually changed? Then write NOTHING. products.json carries a generatedAt
  // stamp, so without this check every half-hourly run would produce a fresh timestamp,
  // a commit and a full Pages redeploy — 48 empty deploys a day.
  const core = JSON.stringify({ slugs, redirects, products: list });
  const prevCore = JSON.stringify({ slugs: prev.slugs || {}, redirects: prev.redirects || {}, products: prev.products || [] });
  if (core === prevCore && fs.existsSync(path.join(ROOT, 'p'))) {
    console.log('catalogue unchanged — nothing to write');
    return;
  }

  // ── write /p/ pages ──
  const pDir = path.join(ROOT, 'p');
  fs.rmSync(pDir, { recursive: true, force: true });
  list.forEach(p => {
    const slug = slugs[String(p.productId)];
    const dir = path.join(pDir, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), productPage(p, slug), 'utf8');
  });
  Object.entries(redirects).forEach(([oldSlug, newSlug]) => {
    const dir = path.join(pDir, oldSlug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), redirectStub(oldSlug, newSlug), 'utf8');
  });
  console.log('  wrote ' + list.length + ' product pages + ' + Object.keys(redirects).length + ' redirect stub(s)');

  // ── products.json ──
  fs.writeFileSync(path.join(ROOT, 'products.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: list.length,
    slugs: slugs,
    redirects: redirects,
    products: list,
  }), 'utf8');

  // ── sitemap.xml ──
  const today = new Date().toISOString().slice(0, 10);
  const urls = [{ loc: ORIGIN + '/', pri: '1.0', freq: 'daily' }]
    .concat(list.map(p => ({ loc: ORIGIN + '/p/' + slugs[String(p.productId)] + '/', pri: '0.8', freq: 'weekly' })))
    .concat([{ loc: ORIGIN + '/privacy-policy.html', pri: '0.3', freq: 'yearly' }]);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + u.loc + '</loc><lastmod>' + today + '</lastmod><changefreq>' + u.freq + '</changefreq><priority>' + u.pri + '</priority></url>').join('\n') +
    '\n</urlset>\n', 'utf8');

  // ── pre-rendered grid + ItemList inside index.html's marker block ──
  const idx = path.join(ROOT, 'index.html');
  const src = fs.readFileSync(idx, 'utf8');
  const S = '<!-- IBI:SSR:START -->', E = '<!-- IBI:SSR:END -->';
  const si = src.indexOf(S), ei = src.indexOf(E);
  if (si < 0 || ei < 0) { console.error('SSR markers missing in index.html — grid not pre-rendered'); process.exit(1); }
  // The app groups the grid by material family (Coconut & Coir, Palmyrah,
  // Aluminium …). Order the pre-rendered block the same way, or the first paint
  // shows the feed order and visibly reshuffles a moment later.
  // ⚠ MIRROR of IBI_PRODUCT_GROUPS / IBI_GROUP_RULES in index.html — both come
  // from the Category column of IBI_Complete_Product_Master_HSN_GST.xlsx. Keep
  // the two in step; a drift only costs a reshuffle on load, never correctness.
  const GRP_ORDER = ['coconut','palmyrah','aluminium','steel','clay','stone','irontools','wood','jewellery',
                     'plants','leaves','spices','food','textile','stationery','garden','pooja','agri','other'];
  const GRP_RULES = [
    ['irontools',  /\b(cast\s*iron|aari\s*work|cobbler|sewing\s*awl|stitching\s*tool|sack\s*needle|dog\s*chain|seed\s*remover|cultivator|trowel)\b/],
    ['wood',       /(rat\s*trap[\s\-|,]*wooden|wooden[\s\-|,]*rat\s*trap|wooden\s+(half\s+)?stool|wood\s+stool)/],
    ['coconut',    /\b(coir|coconut|copra|thengai)\b/],
    ['palmyrah',   /\b(palmyrah|palmyra|palm\s*leaf|palm\s*jaggery|panai\s*ola|koram\s*pai)\b/],
    ['aluminium',  /\b(alumini?um)\b/],
    ['steel',      /\bstainless\b/],
    ['clay',       /\b(clay|terracotta|terra\s*cotta|earthen)\b/],
    ['stone',      /\b(stone|granite|mortar\s*and\s*pestle|ammikkal)\b/],
    ['jewellery',  /\b(jewellery|jewelry|invisible\s*chain|beads\s*chain|bangle|anklet|necklace|earring)\b/],
    ['plants',     /\b(live\s*plant|stem\s*cuttings|sapling|seedling)\b/],
    ['spices',     /\b(spices|chilli\s*powder|coriander\s*powder|turmeric\s*powder|pepper\s*powder|masala)\b/],
    ['agri',       /\b(cow\s*dung|manure|vermicompost|fertiliz|fertilis)\b/],
    ['garden',     /\b(grow\s*bag)\b/],
    ['stationery', /\b(note\s*book|notebook|ruled\s*book|stationery)\b/],
    ['pooja',      /\b(kolam\s*powder|conch|sambrani\s*powder)\b/],
    ['irontools',  /\b(rat\s*trap|iron)\b/],
    ['textile',    /\b(cotton|t-?shirt|tshirt|towel|pillow|scrunchie|apparel|shirt|saree|dhoti|lungi|lunch\s*bag)\b/],
    ['leaves',     /\b(leaves|leaf)\b/],
    ['food',       /\b(jaggery|tamarind|honey|snack|pickle|edible)\b/]
  ];
  const grpIdx = p => {
    const t = ' ' + String(p.title || '').toLowerCase() + ' ';
    for (const [g, re] of GRP_RULES) if (re.test(t)) return GRP_ORDER.indexOf(g);
    return GRP_ORDER.indexOf('other');
  };
  // Sort a COPY — `list` keeps feed/arrangement order so slug assignment above
  // and products.json stay byte-stable run to run.
  const ssrList = list.slice().sort((a, b) => grpIdx(a) - grpIdx(b));

  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: ssrList.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: ORIGIN + '/p/' + slugs[String(p.productId)] + '/' })),
  };
  const block = S + '\n' + ssrList.map(p => ssrCard(p, slugs[String(p.productId)])).join('\n') +
    '\n<script type="application/ld+json">' + JSON.stringify(itemList) + '</script>\n';
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const out = src.slice(0, si) + block.replace(/\n/g, eol) + src.slice(ei);
  if (out.length < src.length * 0.9) { console.error('suspicious shrink — aborting'); process.exit(1); }
  fs.writeFileSync(idx + '.tmp', out, 'utf8');
  if (!/<\/html>\s*$/.test(fs.readFileSync(idx + '.tmp', 'utf8'))) { console.error('lost the tail — aborting'); process.exit(1); }
  fs.renameSync(idx + '.tmp', idx);
  console.log('  index.html grid pre-rendered (' + ssrList.length + ' cards, grouped) · sitemap ' + urls.length + ' urls');
  console.log('done.');
})();
