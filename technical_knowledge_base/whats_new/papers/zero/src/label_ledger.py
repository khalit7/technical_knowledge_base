"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the page before the light pass).
For every unit not overridden below, the key is the first run of 8 (then 6, then 4) consecutive words of its text that
appears verbatim in the rebuilt page (American "optimizer" read as the page's British "optimiser"), and the label is
depth when that key sits inside a closed <details> block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/zero'
D = 'models_and_training/topic_llm_training_and_post_training/distributed_training'
PM = 'systems_and_performance/topic_hardware/performance_math'
IC = 'systems_and_performance/topic_hardware/interconnects_and_scaling'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels', 6: 'card link text', 7: 'section nav', 16: 'section heading',
       17: 'wind-up sentence', 48: 'pointer to the removed Step tab; the step-through is now inline', 63: 'pointer to the removed Step tab',
       140: 'repeated How it held up (BLOOM, DeepSeek-V3); replaced by a pointer', 160: 'animation manners line, replaced by "Nothing moves until you press play"',
       200: '"every link opens in a new tab"'}
VOLATILE = {138: 'SHARD_GRAD_OP shards gradients and optimiser states'}
NEW = [
 ('core', 'split each of the weights, gradients and optimiser states', 'Core sentence: ZeRO gives each of N_d GPUs a 1/N_d share of the model states and moves pieces just in time; memory falls with N_d, communication stays 2 Psi (3 Psi with stage 3).', 'gives each of the'),
 ('core', '', 'Hero: DDP against ZeRO-3 on 4 GPUs for the 7.5B model, 120 GB against 30 GB per GPU, 2 Psi against 3 Psi per step.', 'Same step, same 4 GPUs'),
 ('core', '', 'You need and new terms: model and residual states, Psi, N_d, P_os / P_os+g / P_os+g+p as stages 1 to 3.', "the paper's names for ZeRO stages 1, 2 and 3"),
 ('owned:' + D, '', 'The pipeline bubble is drawn on the distributed-training page (section 6).', 'bubble'),
 ('owned:' + D, '', 'What activation checkpointing trades is taught on the distributed-training page (section 10).', 'activation checkpointing'),
 ('owned:' + PM, '', 'Training-step memory accounting for any run, bytes per parameter and activations per tensor, belongs to Performance math.', '16 bytes per parameter'),
 ('owned:' + IC, '', 'The ring all-reduce cost model, 2(n-1)/n, belongs to Interconnects and scaling.', '2(n−1)/n'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
def find_key(text):
    w = ledger.norm(text.replace('optimizer', 'optimiser').replace('Optimizer', 'Optimiser')).split(' ')
    for n in (8, 6, 4):
        for i in range(0, max(1, len(w) - n + 1)):
            k = ' '.join(w[i:i + n])
            if len(k) >= 18 and k in vis and not re.fullmatch(r'[\W\d ]+', k):
                return k
    return ''
bad = 0
for x in u:
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block "Where it stands now" (checked 2026-10-02)'; continue
    if x.get('added'):
        continue
    k = find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['text'][:100]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, _, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-24', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
