// v20.27 — shopper-facing text clean-up (Google Merchant Center Misrepresentation fixes).
// ⚠ MIRROR: the same functions live in index.html (search "v20.27 CLEAN"). Keep them identical.
// Display only: slugs, the Sheet and the other marketplaces keep the raw text.
//   • "Mars Polo" is another company's name → "Polo" (our brand is iINTELLIGENCEi).
//   • "BIS certified" claims carry no licence number on the site → removed until one is shown.
//   • Clothing titles carried the PACKAGE size and weight as if it were the garment's → removed.
//   • Highlights the Sheet cut off mid-sentence → trimmed to the last complete clause.
'use strict';
function ibiCleanText(s) {
  s = String(s == null ? '' : s);
  s = s.replace(/\bMars Polo\b/gi, 'Polo');
  // BIS: titles and short labels
  s = s.replace(/\bProudly BIS certified, this\b/gi, 'This')
       .replace(/\bBIS certified construction\b/gi, 'Durable construction')
       .replace(/,\s*BIS[\s-]*certified\s*,/gi, ',')
       .replace(/\s+BIS[\s-]*certified\s*,/gi, ',')
       .replace(/,\s*BIS[\s-]*certified\s+(?=[A-Za-z])/gi, ', ')
       .replace(/,\s*BIS\s*,/g, ',')
       .replace(/\bBIS CERTIFIED DURABILITY\b/g, 'DURABLE BUILD')
       .replace(/\bDURABLE BIS CERTIFIED\b/g, 'DURABLE BUILD')
       .replace(/\bPREMIUM BIS[\s-]*CERTIFIED ALUMINIUM\b/g, 'PREMIUM ALUMINIUM')
       .replace(/\band BIS certified for quality assurance\b/gi, 'with care')
       .replace(/\bBuilt to BIS certified standards\b/gi, 'Built to last')
       .replace(/\bBuilt to strict BIS quality standards\b/gi, 'Built to last')
       .replace(/\bThe BIS certified build reflects\b/gi, 'The sturdy build reflects')
       .replace(/\bThe BIS certification guarantees quality and safety,/gi, 'The build is made for everyday cooking,')
       .replace(/\bcarries BIS certification and\b/gi, 'is built for everyday use and')
       .replace(/\bwith BIS certification,/gi, 'with a durable build,')
       .replace(/\bBIS[\s-]*certified\s+(?=[A-Za-z])/gi, '')
       .replace(/\bBIS[\s-]*certification\b/gi, 'quality build')
       .replace(/\bBIS certified\b/gi, '');
  return s.replace(/\s+,/g, ',').replace(/ {2,}/g, ' ').trim();
}
const WEAR_RE = /\b(t-?shirts?|shirts?|polo|kurtas?|kurtis?|sarees?|dhotis?|lungis?|dress(es)?|trousers?|pants|jeans|shorts|shoes?|sandals?|slippers?)\b/i;
function ibiCleanTitle(t, category) {
  t = ibiCleanText(t);
  if ((category == null || /^clothing/i.test(String(category))) && WEAR_RE.test(t) && !/\b(awl|needle|tool|stitching|scrunchie)/i.test(t)) {
    t = t.replace(/,?\s*\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*cm\b/gi, '')
         .replace(/,?\s*\d+(?:\.\d+)?\s*(?:gm|gms|g|kg)\b/gi, '');
  }
  return t.replace(/\s+,/g, ',').replace(/ {2,}/g, ' ').replace(/,\s*$/, '').trim();
}
function ibiCleanBullet(b) {
  b = ibiCleanText(b);
  if (b.length >= 150 && !/[.!?)]$/.test(b)) {
    const c = b.lastIndexOf(','), lastClause = b.slice(c + 1).trim().split(/\s+/).length;
    if (c > 60 && lastClause >= 3) b = b.slice(0, c).replace(/[\s,;:–—-]+$/, '') + '.';
    else b = b.slice(0, b.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '') + '…';
  }
  return b;
}
// <title> / og:title: cut at a word end, never mid-word
function ibiCutAtWord(t, n) {
  t = String(t || '');
  if (t.length <= n) return t;
  const c = t.slice(0, n), i = c.lastIndexOf(' ');
  return (i > n * 0.5 ? c.slice(0, i) : c).replace(/[\s,;:–—-]+$/, '');
}
module.exports = { ibiCleanText, ibiCleanTitle, ibiCleanBullet, ibiCutAtWord };
