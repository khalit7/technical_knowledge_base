"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the page after the contract pass; adapted from
the Agora page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4) consecutive
words of its text that appears verbatim in the built page, and the label is depth when that key sits inside a closed <details>
block, core otherwise. Units added by hand (NEW) cover the owner links and the script-drawn charts, keyed to static text.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/scaffold_computational_separations'
TT = 'models_and_training/topic_llm_landscape/test_time_compute_and_reasoning'
DS = 'models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models'
FAT = {}
KEYS = {78: 'assume nl ⊄ tc⁰'}
NEW = [
 ('owned:' + TT, 'Why a chain of thought adds serial computation to a fixed-depth transformer, in general (Merrill and Sabharwal).', 'test-time compute buys serial depth'),
 ('owned:' + DS, 'Distillation by supervised fine-tuning on a teacher\'s outputs (sequence-level), in general.', 'sft on teacher outputs'),
 ('core', 'Reading: hero graph, complexity ladder and Figures 1, 2b, 3b, 5a and 13c drawn by script, keyed to their static titles.', 'the teacher improves as the tree grows'),
 ('core', 'Lab tab: BFS harness against the squaring reader, and the accuracy sweep, drawn by script.', 'run the harness'),
 ('core', 'Tables tab: decoded figures, Tables 1 to 3 and every recomputed check, drawn by script.', 'the paper\'s figures, rebuilt'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
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
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Lab') else 't-read', 'section': 'contract pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
