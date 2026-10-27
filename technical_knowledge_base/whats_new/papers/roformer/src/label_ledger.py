"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the RoFormer page before the light pass;
adapted from the Scaling Laws page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/roformer'
PE = 'models_and_training/topic_llm_architecture/positional_encodings'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels',
       10: 'sentence-split fragment (equation numbers, still on the page)', 45: 'sentence-split fragment', 48: 'sentence-split fragment', 86: 'sentence-split fragment', 184: 'sentence-split fragment',
       74: 'animation manners line, replaced by "Nothing moves until you press play or step"'}
VOLATILE = {}
OWNED = {160: (PE, 'catastrophically high attention scores'),
         161: (PE, 'raise the base instead'),
         162: (PE, '0.1 ln s + 1'),
         163: (PE, 'rotary_pct 0.25')}   # id -> (owner path, key on the owner's built page)
KEYS = {97: 'o( n ²) cost becomes o( n )'}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: rotate each 2D pair of query and key by a position-proportional angle so scores depend only on the offset, each token encoded on its own, no parameters, values untouched.', 'the idea in one sentence: rotate each two-dimensional pair'),
 ('core', '', 'Hero: 4 rotation pairs of one query and key at positions (5, 2) and (43, 40); arrows turn, the angles and the score do not.', 'slide two tokens 38 positions later'),
 ('core', '', 'New terms: rotation pair, frequency theta_i, relative offset, additive encoding.', 'treated as one point in a plane and turned together'),
 ('owned:' + PE, '', 'The one-pair RoPE dial from zero (shift both positions, the dot product stays) lives on Positional Encodings section 3.', 'shift both tokens: both vectors turn, the angle between them does not'),
 ('owned:' + PE, '', 'The long-context methods built on RoPE (bases, PI, NTK, YaRN, partial, M-RoPE) are taught on Positional Encodings sections 4 and 7.', 'functionally equivalent to 1d-rope'),
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
