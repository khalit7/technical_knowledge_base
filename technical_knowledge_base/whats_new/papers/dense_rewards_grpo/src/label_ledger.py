"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 16 November 2026 from the finished page; adapted from the
Fair Cast page's labeller). Units inside the "Since the paper" block are labelled volatile. For every unit not overridden below, the key is
the first run of 8 (then 6, then 4) consecutive words of its text that appears verbatim in the built page, and the label is depth when that
key sits inside a closed <details> block, core otherwise. Units added by hand (NEW) cover the owner links.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/dense_rewards_grpo'
RL = 'models_and_training/topic_rl/rl_for_llms'
PG = 'models_and_training/topic_rl/policy_gradients_and_actor_critic'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
TT = 'models_and_training/topic_llm_landscape/test_time_compute_and_reasoning'
FAT = {44: 'sentence fragment from a link label (Eq. 1 and 2)', 203: 'sentence fragment: margin label and heading'}
KEYS = {}
NEW = [
 ('owned:' + RL, "GRPO's group advantage, why uniform groups give no update, DAPO's dynamic sampling and verifier failures during RL, in general.", 'dynamic sampling'),
 ('owned:' + PG, 'The score-function estimator and why a state-dependent baseline leaves it unbiased, in general.', 'baseline'),
 ('owned:' + ES, 'Paired comparisons over seeds, multiple-comparison corrections and equivalence testing, in general.', 'paired'),
 ('owned:' + TT, 'Process reward models used as selectors at inference time.', 'process reward'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
vol = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="mist"><summary>Since the paper.*?</details>', body, flags=re.S))
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
    x['label'] = 'volatile' if k in vol else 'depth' if k in det else 'core'
    if x['label'] == 'volatile': x['where'] = PAGE
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'owner links 2026-11-16', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
