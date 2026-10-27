"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Phi-Bench page before the light pass;
adapted from the StateM and LCLM labellers). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits in a
closed <details> block, volatile when it sits in the dated industry-context block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/phi_bench'
AB = 'measurement/topic_benchmarks/agentic'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
MOE = 'models_and_training/topic_llm_architecture/mixture_of_experts'
PR = 'systems_and_performance/topic_cuda_and_gpu_programming/profiling_and_correctness'
FAT = {1: 'old header reading-time line, replaced by the measured "Reading: N min, plus M in closed details."', 209: 'old note that the replay started on its own when on screen; it now waits for the reader ("The replay waits for you to press play or step.")'}
OWNED = {97: (MOE, 'capacity factor a fixed buffer per expert')}
KEYS = {187: 'when it pays off', 97: 'the usual moe ones'}
NEW = [
 ('core', 'Core sentence: whole repository, open-ended goal, scored only for beating the expert reference; Claude Opus 5 averages 36.53% of the reward over 85 tasks, a mean reward rather than tasks solved.', 'score it only for beating the expert'),
 ('core', 'Hero: the reward curve on kv-traffic-sol (2.58x scores 0, 4.14x 0.5, 6.656x 1) above Table 2 Full for eight models with the largest possible standard error (about 5 points); the 8.41-point lead is about 1.2 unpaired errors.', 'the largest standard error a mean of 85 rewards in [0, 1] can have (about 5 points)'),
 ('core', 'New terms: KFC, LHI, E2EO, reference anchor, correctness-gated, AB-BA pairs, BPB.', 'baseline and candidate timed alternately, so drift cancels'),
 ('owned:' + AB, 'The harness alone moves an agentic benchmark score by large margins for the same model (Terminal-Bench public board).', 'about 18 points across nine agents'),
 ('owned:' + ES, 'Standard error of one score and paired comparisons.', 'how precise is one score?'),
 ('owned:' + MOE, 'MoE token dispatch, load balancing against router collapse, capacity factor and dropped tokens.', 'capacity factor a fixed buffer per expert'),
 ('owned:' + PR, 'Honest GPU timing: warm up, many runs, median and spread.', 'warm up, flush the cache, many runs, median and spread'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'<details class="mist" id="later">.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Industry context, September 2026" (from the 2026-09-07 and 2026-09-14 tech news issues)'
    else:
        x['label'] = 'depth' if k in det else 'core'
for x in u:
    if x['id'] in OWNED:
        x['label'], x['key'] = 'owned:' + OWNED[x['id']][0], OWNED[x['id']][1]
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
