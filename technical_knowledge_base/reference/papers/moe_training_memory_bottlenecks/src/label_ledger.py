"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the MoE memory bottlenecks page before the light pass;
adapted from the Proactive Memory Agent page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key
sits in a closed <details> block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/moe_training_memory_bottlenecks'
DT = 'models_and_training/topic_llm_training_and_post_training/distributed_training'
PM = 'systems_and_performance/topic_hardware/performance_math'
WK = 'systems_and_performance/topic_cuda_and_gpu_programming/writing_kernels'
MOE = 'models_and_training/topic_llm_architecture/mixture_of_experts'
FAT = {}
OWNED = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: a step dies at its single highest peak, so the paper caps all four live sets common MoE parallelism leaves free to grow, by order and granularity only: exact, each term known before launch.', 'a training step dies at its single highest memory peak'),
 ('core', 'Hero: the four live sets, the operator for each, and the measured before/after (dispatch 52.988 to 22.855 GiB, projection 79.521 to 10.622 GiB, whole-step peak 139.790 to 123.728 GiB, optimizer step 3.95 to 1.93 s), then the composed context reach 128K, 32K, 64K against 1M.', 'each live set gets its own operator'),
 ('core', 'New terms: live set, LLEP, PipelinedLLEP, Ring-DTP, checkpoint boundary, SCO, OffloadStreamAdamW, MoP.', 'the tensors that must be resident at one moment'),
 ('core', 'Takeaway softened (2026-10-26): savings are against the authors own LLEP and a full-logit projection, not fused cross-entropy kernels; the end-to-end result is single-run, the whole MoP stack, weak FSDP2 baseline, no ablation.', 'not against fused cross-entropy kernels'),
 ('owned:' + PM, 'AdamW training state is 16 bytes per parameter: 2 weights, 2 gradients, 12 for fp32 master and two moments.', '2 + 2 + 12 = 16 bytes per parameter'),
 ('owned:' + DT, 'ZeRO-Offload moves optimiser state and its update to CPU memory.', 'zero-offload moves optimiser state and its update to cpu memory'),
 ('owned:' + DT, 'Activation checkpointing in general: store only some activations and recompute the rest in backward.', 'instead of storing every activation for backward'),
 ('owned:' + WK, 'The online softmax: a running max and sum, rescaled when a larger value arrives.', 'a running max and sum that rescale when a larger value arrives'),
 ('owned:' + MOE, 'Expert capacity factor as a fixed buffer per expert, a multiple of its average load.', 'a fixed buffer per expert as a multiple of its average load'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ''
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
        print('UNPLACED', x['id'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Same week, beyond the paper" (read 3 October 2026)'
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
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
