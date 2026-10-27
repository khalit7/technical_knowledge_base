"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the DeepSeek-V3 page as committed before the light pass;
adapted from the FlashAttention page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "What came after, and where to run it", core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/deepseek_v3_technical_report'
AV = 'models_and_training/topic_llm_architecture/attention_variants'
MOE = 'models_and_training/topic_llm_architecture/mixture_of_experts'
FO = 'models_and_training/topic_llm_architecture/families_and_objectives'
RL = 'models_and_training/topic_rl/rl_for_llms'
PM = 'systems_and_performance/topic_hardware/performance_math'
FAT = {29: 'sentence-split fragment "13 to 14)." of the gate sentence, which is placed',
       129: 'link to the old Quantise and accumulate tab; the animations now sit in the FP8 section',
       152: 'link to the old Check the bill tab; the utilisation chart now sits right below',
       247: 'animation manners line, replaced by "Nothing moves until you press play or step"',
       254: 'a "Try" instruction for the old tab; the chart now sits in a closed block under the box that states its result',
       262: 'the old tab intro, which the Table 1 paragraph now carries',
       264: 'the old tab intro; every number is labelled where it is shown',
       275: 'heading fragment "What this shows 3."'}
OWNED = {20: ('owned:' + AV, 'rope cannot pass through the absorbed product'),
         34: ('owned:' + MOE, 'this is routing collapse'),
         59: ('owned:' + FO, 'parallel heads (gloeckle et al. 2024)'),
         162: ('owned:' + RL, 'the mean of a group of answers to the same prompt'),
         266: ('owned:' + PM, 'flops: 6nd, and what it leaves out')}
KEYS = {}
NEW = [
 ('core', 'Core sentence: V3 is cheap because 37B of 671B active does a tenth of a dense 405B model\'s arithmetic, and FP8, DualPipe and the all-to-all kernels keep communication from eating that saving; 2.788M H800 GPU hours.', 'does a tenth of a dense 405b model\'s arithmetic'),
 ('core', 'Hero, drawn by script: seven co-designed pieces (MoE, balancing, MLA, MTP; FP8, DualPipe, kernels) with their numbers, adding up to the bill; Llama 3.1 405B took 11.1x the hours for 11.5x the work.', 'seven co-designed pieces, two jobs, one bill'),
 ('core', 'The model row is mostly inherited from V2; new in V3 are the balancing rule, MTP, FP8 at this scale and the system row.', 'what is new in v3 is the balancing rule, mtp'),
 ('core', 'You need and new terms: MoE, MLA, FP8 formats, parallelism forms linked; shared and routed experts, aux-loss-free balancing, MTP, DualPipe, tiles and blocks, promoted accumulation, H800.', 'the export version of the h100'),
 ('core', 'All-to-all diagram, drawn by script: one token, 8 experts on 4 nodes, 3 IB sends instead of 6, NVLink fan-out inside each node.', 'one ib crossing per node, then nvlink does the fan-out'),
 ('core', 'Predict prompt for the parameter breakdown: share of active parameters that is attention.', 'which share of the active parameters is attention'),
 ('core', 'Predict prompt for the utilisation chart: does counting attention and MTP push V3 above or below Meta\'s band.', 'push v3 above or below meta'),
 ('owned:' + FO, 'MTP: parallel heads against the sequential module, drawn on Families and objectives.', 'ways to predict the token after next'),
 ('owned:' + 'systems_and_performance/topic_inference_and_serving/speculative_decoding', 'How drafting and verification work (speculative decoding) is taught on its own page.', 'the acceptance rule and why it is exact'),
 ('owned:' + 'models_and_training/topic_llm_training_and_post_training/quantization_and_precision', 'FP8 formats bit by bit and scaling granularity are taught on Quantization and Precision.', '448, 57,344'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'What came after, and where to run it.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        x['label'] = 'volatile'; x['where'] = ''; x['note'] = 'dated closed block "What came after, and where to run it (checked 3 October 2026)" in Why it matters'
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
