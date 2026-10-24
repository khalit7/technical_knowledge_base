"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Llama 3 page before the light pass;
adapted from the Chinchilla and QLoRA labellers). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/llama_3_herd'
DT = 'models_and_training/topic_llm_training_and_post_training/distributed_training'
AL = 'models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr'
FT = 'systems_and_performance/topic_ml_infra_and_orchestration/fault_tolerance_at_scale'
PW = 'systems_and_performance/topic_hardware/power_cooling_and_reliability'
IC = 'systems_and_performance/topic_hardware/interconnects_and_scaling'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels'}
VOLATILE = {245: 'trains llama 3.1 8b, 70b and 405b with fsdp2', 247: 'meta itself moved to mixture of experts with llama 4'}
OWNED = {}   # id -> (owner path, key on the owner's built page)
KEYS = {125: "every row's percentage is its count over 419"}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: a plain dense Transformer reaches GPT-4 class through data, a scaling-law size, keeping 16,384 H100s busy, and a simple six-round post-training loop.', 'the idea in one sentence: a plain dense transformer'),
 ('core', '', 'Hero: the report as one pipeline (data, sizing, the 16K-GPU job, the schedule, six post-training rounds, result); blue boxes are the report\'s contributions.', 'no box is a new architecture'),
 ('core', '', 'New terms: two-stage forecast, annealing, 4D parallelism, effective training time, rejection sampling.', 'two-stage forecast'),
 ('owned:' + DT, '', 'What each parallelism form splits and sends (tensor cuts every matrix, pipeline cuts the layers, context cuts the sequence, FSDP shards state) is taught on Distributed training.', 'tensor (tp) cuts every matrix'),
 ('owned:' + DT, '', 'The interleaved 1F1B bubble (P - 1)/(V M).', 'interleaved 1f1b'),
 ('owned:' + AL, '', 'The DPO loss and its default beta 0.1 are taught on the alignment page.', 'dpo β = 0.1'),
 ('owned:' + FT, '', 'Checkpoint and recovery designs at Llama 3\'s failure rate (one failure every 3.1 h) are on Fault tolerance at scale.', 'one failure every 3.1 h'),
 ('owned:' + PW, '', 'Power swings of tens of megawatts and fleet failure rates are on Power, cooling and reliability.', 'tens of megawatts'),
 ('owned:' + IC, '', 'RoCE, Clos fabrics and the 1:7 oversubscription between Meta\'s pods are on Interconnects and scaling.', '1:7 between meta'),
 ('depth', '', 'Tables 3, 4, 5, 6 and 7, 15 and 21 (script-rendered) are now closed blocks of the Tables tab.', 'table 21: long-context benchmarks'),
 ('core', '', 'Table 2 and Figure 17 rebuilt (script-rendered) stay open in the Tables tab.', 'figure 17: human evaluations of the 405b'),
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
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block "Later, as of 25 October 2026" in Why it matters'; continue
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
