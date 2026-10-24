"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the GPT-3 page before the light pass;
adapted from the T5 page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/gpt_3'
PRE = 'models_and_training/topic_llm_training_and_post_training/pretraining'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 31: 'animation manners line, replaced by "Nothing moves until you press play or step"',
       75: 'the predict question on the few-minus-zero gap: the hero figure at the top now shows the answer, so the question was removed (its chart and note became the hero and its caption)'}
VOLATILE = {141: '11 june 2020', 148: '28 september 2026'}
OWNED = {54: (PRE, '2 for the forward pass (a multiply and an add per weight) and 4 for the backward pass')}   # id -> (owner path, key on the owner's built page)
KEYS = {}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: GPT-2 scaled unchanged to 175B takes a task from the prompt alone, and the benefit of examples grows with size, making the prompt the interface.', 'the idea in one sentence: scale gpt-2'),
 ('core', '', 'Hero: Figure 1.3 recomputed from Table H.1, zero-, one- and few-shot mean accuracy over 41 tasks at eight sizes, the gap marked at 125M and 175B.', 'examples in the prompt help more the bigger the model'),
 ('core', '', 'You need and new terms: decoder-only Transformer, scaling laws; in-context learning, zero/one/few-shot, demonstration.', 'one solved example (context and completion) placed in the prompt'),
 ('core', '', 'GPT-3 compute uses the standard 6 FLOPs per parameter per token, which ignores attention; the derivation of 6 is on Pretraining.', 'standard estimate of 6 flops per parameter per token'),
]     # (label, where, text, key) for units the light pass added
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
i0 = body.index('id="t-tables"'); i1 = body.index('id="t-more"')
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
