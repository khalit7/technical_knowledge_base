"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Chinchilla page before the light pass;
adapted from the Scaling Laws page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/chinchilla'
PRE = 'models_and_training/topic_llm_training_and_post_training/pretraining'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels', 33: 'link-only fragment (the link is still on the page)', 61: 'sentence-split fragment (Eq. 10 is still on the page)'}
VOLATILE = {}
OWNED = {}   # id -> (owner path, key on the owner's built page)
KEYS = {}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: for a fixed budget, grow parameters and tokens equally, about 20 tokens per parameter; Chinchilla 70B on 1.4T beat Gopher 280B at the same compute.', 'the idea in one sentence: for a fixed training budget'),
 ('core', '', 'Hero: Table 1 models in (N, D) space with the 20 tokens per parameter line and Gopher\'s IsoFLOP line; arrow from Gopher to Chinchilla.', 'the 2021 giants sat far below 20 tokens per parameter'),
 ('core', '', 'New terms: compute-optimal, IsoFLOP profile, a and b, cosine cycle.', 'final loss against model size at one fixed budget'),
 ('owned:' + PRE, '', 'Why 6 FLOPs per parameter per token is taught on Pretraining.', '2 for the forward pass (a multiply and an add per weight) and 4 for the backward pass'),
 ('owned:' + PRE, '', 'Over-training a smaller model past the compute-optimal ratio as a planning choice is taught on Pretraining.', 'over-training : training a smaller model past the compute-optimal ratio'),
 ('depth', '', 'Tables A6 and A7 rebuilt per task (script-rendered from tables.json), now in a closed block of the Tables tab.', 'every mmlu and big-bench task (119 rows)'),
 ('depth', '', 'Table A9 rebuilt with parameters recounted (script-rendered), now in a closed block.', 'all 50 model shapes, with their parameters recounted'),
 ('depth', '', 'Every derived number checked, 80 rows from recompute.py (script-rendered), now in a closed block.', 'every derived number, checked (80 rows)'),
]     # (label, where, text, key) for units the light pass added
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
i0 = body.index('id="t-tables"'); i1 = body.index('id="t-then"')
tables = ledger.norm(body[i0:i1])
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
    for k in ('note',):
        x.pop(k, None)
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block in Why it matters'; continue
    if x['id'] in OWNED:
        o, k = OWNED[x['id']]; x['label'], x['key'] = 'owned:' + o, k; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:110]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if (k in det or x['tab'] == 't-tables' or (k in tables and k not in vis.replace(tables, ''))) else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, where, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': where, 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
