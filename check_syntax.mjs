/* Release gate: every inline <script> block in index.html and admin.html must parse.
 * Why: v19.8 (14 Sep 2026) shipped a version note with an unescaped apostrophe inside a single-quoted string; the whole
 * storefront script (cart, checkout, search, Ask IBI, Seller Central) was dead for hours while the pre-rendered catalogue
 * snapshot made the page LOOK alive. Run `node check_syntax.mjs` before every push. */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
let bad = 0, blocks = 0;
for (const file of ['index.html', 'admin.html']) {
  let html; try { html = readFileSync(file, 'utf8'); } catch { continue; }
  const re = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)<\/script>/gi; let m, i = 0;
  while ((m = re.exec(html))) {
    i++; blocks++; const openTag = m[1], src = m[2]; if (!src.trim()) continue;
    // Only the OPENING TAG decides the type — testing the whole match once skipped the main script because its body contains type="tel" strings.
    if (/type\s*=\s*["'](?!module|text\/javascript|application\/javascript)/i.test(openTag)) continue; // JSON-LD, templates
    const tmp = `.chk_${i}.js`; writeFileSync(tmp, src);
    try { execFileSync('node', ['--check', tmp], { stdio: 'pipe' }); }
    catch (e) { bad++; const line = (html.slice(0, m.index + m[0].indexOf(src)).match(/\n/g) || []).length + 1; console.error(`${file}: script block ${i} (starts at line ${line}) does not parse:\n` + String(e.stderr).split('\n').slice(0, 4).join('\n')); }
    finally { unlinkSync(tmp); }
  }
}
console.log(`${blocks} script blocks checked, ${bad} with syntax errors`);
process.exit(bad ? 1 : 0);
