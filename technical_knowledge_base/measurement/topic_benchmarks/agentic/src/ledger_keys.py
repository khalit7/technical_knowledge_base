"""Draft labels and keys for src/ledger.json against the rebuilt page (run once after the rebuild; hand edits follow).
For each unit: the first 6-word run of its text (then 4-word, then a number token) found verbatim in the new page's
visible text becomes its key; the label is core when the key is outside closed <details>, depth inside one, volatile
inside the dated table. Units with no key are printed for review. usage (from the repo root):
python3 technical_knowledge_base/measurement/topic_benchmarks/agentic/src/ledger_keys.py"""
import html, json, re, sys
from pathlib import Path
P = Path(__file__).resolve().parent.parent
s = (P / 'index.html').read_text()
s = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)
norm = lambda t: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t))).strip().lower()
dated = ''.join(re.findall(r'<details class="dp" id="rd-dated">.*?</details>', s, flags=re.S))
dets = ''.join(re.findall(r'<details.*?</details>', s, flags=re.S))
core = re.sub(r'<details.*?</details>', ' ', s, flags=re.S)
N_all, N_core, N_dated = norm(s), norm(core), norm(dated)
units = json.loads((P / 'src' / 'ledger.json').read_text())
miss = 0
for u in units:
    if u.get('label') and u.get('key'):
        continue
    words = norm(u['text']).split()
    key = None
    for n in (7, 5, 4):
        for i in range(0, max(1, len(words) - n + 1)):
            w = ' '.join(words[i:i + n])
            if len(w) > 18 and w in N_all:
                key = w; break
        if key: break
    if not key:
        for t in words:
            t = t.strip('.,;:()"')
            if re.search(r'\d', t) and len(t) >= 3 and t in N_all:
                key = t; break
    if not key:
        miss += 1; print('MISS', u['id'], u['tab'], '|', u['text'][:160]); continue
    u['key'] = key
    if not u.get('label'):
        u['label'] = 'volatile' if key in N_dated and key not in N_core else ('core' if key in N_core else 'depth')
(P / 'src' / 'ledger.json').write_text(json.dumps(units, indent=1, ensure_ascii=False) + '\n')
print('missing', miss, 'of', len(units))
