"""Label src/ledger.json after `python3 html_utils/ledger.py init <page folder>` (teaching-contract.md, Length).

  python3 src/label_ledger.py        (from the page folder's parent or anywhere; paths are relative to this file)

Rules for an article page (page-kinds/article.md, Build): the article's argument, the evidence judgement and the
responses are core; units that sit inside a closed <details> block (provenance, full tables, the authors' list of
uses) are depth; the dated "Since the article" block is volatile (it stays on this page, dated); the Further reading
tab is depth; the header line (reading time, crumb) is fat. Each unit's key is a run of its own words that the
built page contains, so ledger.py check can find it. The next article builder: copy this file unchanged.
"""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
L = json.loads((HERE / 'ledger.json').read_text())
page = (HERE.parent / 'index.html').read_text()
vis = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', ' ', page, flags=re.S)
norm = lambda t: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t))).strip().lower()
V = norm(vis)
# text inside closed details blocks, and inside the Since block
det = norm(' '.join(re.findall(r'<details.*?</details>', vis, flags=re.S)))
since = norm(' '.join(re.findall(r'<details class="mist" id="s-since">.*?</details>', vis, flags=re.S)))


def key(t):
    w = norm(t).split(' ')
    for n in (8, 6, 5, 4):  # the first run of n words that the page contains
        for i in range(0, max(1, len(w) - n + 1)):
            k = ' '.join(w[i:i + n])
            if len(k) > 12 and k in V: return k
    return norm(t)[:40]


for u in L:
    t = norm(u['text'])
    k = key(u['text'])
    u['key'] = k
    if u['tab'] == 'page': u['label'] = 'fat'
    elif u['tab'] == 't-more': u['label'] = 'depth'
    elif k in since: u['label'] = 'volatile'
    elif k in det: u['label'] = 'depth'
    else: u['label'] = 'core'
(HERE / 'ledger.json').write_text(json.dumps(L, indent=1, ensure_ascii=False) + '\n')
from collections import Counter
print(Counter(u['label'] for u in L))
