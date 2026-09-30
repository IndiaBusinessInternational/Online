"""Marketplace release bump: python tools/bump_release.py v19.13 v19.14 "v19.14 — NOTE TEXT"
Shifts the 12-entry version-note chain, sets IBI_VERSION / DATE / NOTE, bumps sw.js CACHE_NAME, prepends the CHANGELOG entry.
Make the code change first (Edit tool), then run this, then `node check_syntax.mjs`. Apostrophes in the note are escaped here;
CRLF line endings are preserved."""
import io, os, re, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
CR = chr(13)
old, new, NOTE = sys.argv[1], sys.argv[2], sys.argv[3]
assert NOTE.startswith(new + ' — '), 'note must start with the new version and an em dash'
DATE = datetime.date.today().strftime('%d %b %Y').lstrip('0')

def rw(path, fn):
    s = io.open(path, encoding='utf-8', newline='').read(); s2 = fn(s); assert s2 != s, path
    tmp = path + '.tmp'; io.open(tmp, 'w', encoding='utf-8', newline='').write(s2); os.replace(tmp, path)
def once(s, a, b):
    assert s.count(a) == 1, (a[:70], s.count(a)); return s.replace(a, b)
def setline(s, name, text):
    pat = re.compile("^(window\\.IBI_VERSION_NOTE%s = ')(.*)(';)(%s?)$" % (re.escape(name), CR), re.M)
    assert pat.search(s), name
    return pat.sub(lambda mo: mo.group(1) + text + mo.group(3) + mo.group(4), s, count=1)
def index(s):
    s = once(s, "window.IBI_VERSION      = '%s';" % old, "window.IBI_VERSION      = '%s';" % new)
    s = re.sub(r"^window\.IBI_VERSION_DATE = '.*?';", "window.IBI_VERSION_DATE = '%s';" % DATE, s, count=1, flags=re.M)
    m = re.search("^window\\.IBI_VERSION_NOTE = '(.*)';%s?$" % CR, s, re.M); cur = m.group(1); assert cur.startswith(old + ' ')
    prev = {}
    for i in range(1, 13):
        mm = re.search("^window\\.IBI_VERSION_NOTE_PREV%02d = '(.*)';%s?$" % (i, CR), s, re.M); assert mm, i; prev[i] = mm.group(1)
    s = setline(s, '', NOTE.replace("\\'", "'").replace("'", "\\'"))
    s = setline(s, '_PREV12', cur)
    for i in range(11, 0, -1):
        s = setline(s, '_PREV%02d' % i, prev[i + 1])
    return s
rw('index.html', index)
rw('sw.js', lambda s: once(s, "const CACHE_NAME  = 'ibi-marketplace-%s';" % old.replace('.', '-'), "const CACHE_NAME  = 'ibi-marketplace-%s';" % new.replace('.', '-')))
def changelog(s):
    NL = '\r\n' if '\r\n' in s else '\n'
    return once(s, '## ' + old, '## ' + new + NL + NL + NOTE.split(' — ', 1)[1] + NL + NL + '## ' + old)
rw('CHANGELOG.md', changelog)
print(new, 'applied,', DATE)
