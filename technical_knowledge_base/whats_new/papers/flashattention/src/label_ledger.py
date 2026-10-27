"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the FlashAttention page as committed before the light pass;
adapted from the LoRA page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Where it runs now, and the library versions", core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/flashattention'
PM = 'systems_and_performance/topic_hardware/performance_math'
WK = 'systems_and_performance/topic_cuda_and_gpu_programming/writing_kernels'
LT = 'systems_and_performance/topic_cuda_and_gpu_programming/libraries_and_tensor_cores'
FAT = {56: 'link to the old Run tab; the animation now sits right below the paragraph', 168: 'animation manners line, replaced by "Nothing moves until you press play or step"'}
OWNED = {}    # id -> (label, key)
KEYS = {58: 'the third mode is the loop order flashattention-2 switched to', 161: 'step through standard attention and watch s and p fill hbm', 163: 'block size 4 nearly erases the advantage, 16 grows it'}
NEW = [
 ('core', 'Core sentence: attention is slow because the N x N matrix moves through HBM; FlashAttention tiles in SRAM with online softmax and recomputation; 9.2x less traffic, 5.7x faster, 13% more FLOPs.', 'pushes the n × n score matrix through slow high-bandwidth memory'),
 ('core', "Hero: standard attention against FlashAttention, HBM against SRAM, with Figure 2's numbers (40.3 GB, 41.7 ms against 4.4 GB, 7.3 ms).", 'ratios: 40.3 / 4.4 = 9.2× less traffic'),
 ('core', 'You need and new terms: HBM, SRAM, IO-aware, M, B_r and B_c, m and l, recomputation.', 'rebuilding s and p in the backward pass instead of storing them'),
 ('core', 'Photo: a P100 package, GPU die with four HBM stacks beside it on one interposer (CC0).', 'every byte between them crosses the hbm bus'),
 ('owned:' + PM, 'Arithmetic intensity and the roofline in general are taught on Performance math.', 'arithmetic intensity flops done per byte moved'),
 ('owned:' + WK, 'FlashAttention-2, -3 and -4 as kernels, what each changed and why, are on Writing kernels.', 'flashattention-2: three changes'),
 ('owned:' + LT, 'Which attention library runs under SDPA, kept current, is on Libraries and tensor cores.', 'which attention library runs under sdpa'),
 ('core', 'Animation, drawn by script: HBM and SRAM bands, counters for HBM traffic, N x N traffic, extra state, on-chip values and FLOPs, the followed row.', 'one small square per value'),
 ('core', 'Scale panel, drawn by script: block size, traffic ratio, N x N per copy, time at bandwidth and at peak; defaults against Figure 2.', 'time at bandwidth'),
 ('core', 'Tables tab, drawn by script: Figure 3 rebuilt from Tables 9 to 21 and every number in the text checked.', 'every number in the text, checked'),
 ('depth', 'Tables tab, drawn by script: Tables 1 to 7 with recomputed columns, now in closed blocks.', 'table 7: against apex fmha, the kernel it started from'),
 ('core', 'Then and now, drawn by script: FA-1 to FA-4 cards (what the previous version left, loop picture, changes, headline, source).', 'each card says what the previous one left on the table'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Where it runs now, and the library versions \(checked.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
def find_key(text):
    w = ledger.norm(text).split(' ')
    for n in (8, 6, 4):
        for i in range(0, max(1, len(w) - n + 1)):
            k = ' '.join(w[i:i + n])
            if len(k) >= 18 and k in vis and not re.fullmatch(r'[\W\d ]+', k):
                return k
    return ''
bad = 0
for x in u:
    if x.get('added'):
        continue
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in OWNED:
        x['label'], x['key'] = OWNED[x['id']]; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['where'] = ''; x['note'] = 'dated closed block "Where it runs now, and the library versions (checked 3 October 2026)" in Then and now'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
