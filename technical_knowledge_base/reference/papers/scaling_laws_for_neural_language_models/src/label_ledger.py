"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the Scaling Laws page before the light pass;
adapted from the T5 page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/scaling_laws_for_neural_language_models'
PRE = 'models_and_training/topic_llm_training_and_post_training/pretraining'
OPT = 'models_and_training/topic_ml_fundamentals/optimisers_and_learning_rate_schedulers'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels',
       46: 'sentence-split fragment of unit 45 (equation and figure numbers, still on the page)', 84: 'animation manners line, replaced by "Nothing moves until you press play or step"'}
VOLATILE = {}
OWNED = {19: (PRE, '2 for the forward pass (a multiply and an add per weight) and 4 for the backward pass'),
         56: (OPT, 'mccandlish et al. 2018 fit this trade-off with one relation')}   # id -> (owner path, key on the owner's built page)
KEYS = {}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: loss is a power law in N, D and C over many orders of magnitude, so it is predictable, and a fixed budget is best spent on a large model stopped well before convergence.', 'the idea in one sentence: language-model test loss'),
 ('core', '', 'Hero: learning curves of five sizes against compute from Eq. 1.6 at the critical batch, with their lower envelope (the compute-efficient frontier).', 'bigger models reach every loss with less compute'),
 ('core', '', 'New terms: power law, non-embedding parameters, critical batch, C_min.', 'the axis the compute law uses'),
 ('core', '', 'This paper applied the trade-off to language models and found B_crit depends only on the loss.', 'a critical batch that depends only on the loss'),
 ('owned:' + PRE, '', 'Compute-optimal allocation today (about 20 tokens per parameter) and over-training for cheaper serving are taught on Pretraining.', 'over-training : training a smaller model past the compute-optimal ratio'),
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
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-24', 'text': text, 'label': lab, 'key': key, 'where': where, 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
