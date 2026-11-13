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
KEYS = {187: 'when it pays off', 97: 'the usual moe ones',
        # re-pointed in the 2026-11-13 layout rollout (the nav gained Categories; the third predict question became the categories stage
        # and its heatmap moved to the tables tab; the replay's Try line was reworded; Figure 7 moved beside Errors on The paper tab)
        8: 'results categories iterations and effort', 87: 'it rests on 3 of the 85 tasks', 88: 'task counts by category and format, from figure 4',
        202: 'then switch to deepseek-v4-pro on the same rounds', 210: 'with s = 1.9551 / bpb and s ref = 1.5337',
        240: 'counts per error class, decoded from the vector figure 7 (each bar segment lands on a whole number of errors'}
NEW = [
 ('core', 'Core sentence: whole repository, open-ended goal, scored only for beating the expert reference; Claude Opus 5 averages 36.53% of the reward over 85 tasks, a mean reward rather than tasks solved.', 'score it only for beating the expert'),
 ('core', 'Hero: the reward curve on kv-traffic-sol (2.58x scores 0, 4.14x 0.5, 6.656x 1) above Table 2 Full for eight models with the largest possible standard error (about 5 points); the 8.41-point lead is about 1.2 unpaired errors.', 'the largest standard error a mean of 85 rewards in [0, 1] can have (about 5 points)'),
 ('core', 'New terms: KFC, LHI, E2EO, reference anchor, correctness-gated, AB-BA pairs, BPB.', 'baseline and candidate timed alternately, so drift cancels'),
 ('owned:' + AB, 'The harness alone moves an agentic benchmark score by large margins for the same model (Terminal-Bench public board).', 'about 18 points across nine agents'),
 ('owned:' + ES, 'Standard error of one score and paired comparisons.', 'how precise is one score?'),
 ('owned:' + MOE, 'MoE token dispatch, load balancing against router collapse, capacity factor and dropped tokens.', 'capacity factor a fixed buffer per expert'),
 ('owned:' + PR, 'Honest GPU timing: warm up, many runs, median and spread.', 'warm up, flush the cache, many runs, median and spread'),
 # the 2026-11-13 layout rollout: the step lists of the two 3D stages and the replay's stretches
 ('core', 'Formats stage: the harness is the one part of the task package the agent never sees, and alone decides the reward.', 'which the agent never sees and which alone decides the reward'),
 ('core', 'Formats stage: package split by format, KFC 51 ratio-scored and 4 pass or fail, LHI 18 and 2, E2EO 8 and 2.', 'kfc 51 scored on speed or quality ratios and 4 pass or fail, lhi 18 and 2, e2eo 8 and 2'),
 ('core', 'Categories stage: rows fall by Full but not column by column; Claude Sonnet 5 1.5 on System Optimization, DeepSeek-V4-Pro 0.5 on Compression; the highest bar is GLM-5.2.', 'claude sonnet 5 scores 1.5 on system optimization and deepseek-v4-pro 0.5 on compression'),
 ('core', 'Categories stage: Hardware and Edge per model, and the standard-error bound of 13.0 on the best score of 5.4 over 3 tasks, wider than every score in the column.', 'the glass column on the best bar is ±13.0'),
 ('core', 'Categories stage: Full is the task-count-weighted mean of the nine categories, within 0.03 of every printed value.', 'weighting each category by its task count'),
 ('core', 'Replay: Qwen3.7 Max new bests at rounds 14, 17, 22 and 23, a few hundredths each, submissions between 1.7654 and 1.9084.', 'new bests at rounds 14 (1.8021), 17 (1.7936), 22 (1.7930) and 23 (1.7654)'),
 ('core', 'Replay: Opus rounds 9 to 20 stay above the reference recipe 1.2747, reward 0.', 'every one still above the reference recipe\'s 1.2747, so the task\'s reward stays 0'),
 ('core', 'Replay: DeepSeek-V4-Pro rounds 10 to 20 make no new best; valid submissions between 1.4800 and 1.7163.', 'valid submissions between 1.4800 and 1.7163'),
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
            # never a reading-time figure in a key (check_times.py rewrites those; 2026-11-13)
            if len(k) >= 18 and k in vis and not re.fullmatch(r'[\W\d ]+', k) and not re.search(r'\d+ ?min|\bmin\)', k):
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
