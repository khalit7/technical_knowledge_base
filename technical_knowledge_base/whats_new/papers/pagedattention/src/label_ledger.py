"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the PagedAttention page before the
light pass; adapted from the CLIP page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when
that key sits inside a closed <details> block, volatile when it sits in the dated "vLLM since the paper" block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/pagedattention'
BAT = 'systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling'
VL = 'systems_and_performance/topic_inference_and_serving/vllm'
LC = 'models_and_training/topic_llm_architecture/long_context'
PM = 'systems_and_performance/topic_hardware/performance_math'
DS = 'systems_and_performance/topic_inference_and_serving/distributed_and_disaggregated_serving'
TF = 'models_and_training/topic_llm_architecture/the_transformer_from_zero'
FAT = {68: 'animation-manners line (autoplay on screen), replaced by "Nothing moves until you press play or step"', 204: 'the same line on the simulator tab, replaced likewise'}
KEYS = {11: 'batching shares each weight read across many requests'}
NEW = [
 ('core', 'Core sentence: KV cache in fixed-size blocks through a per-request block table, as OS paging; memory taken as tokens arrive, at most one partly filled block wasted, copy-on-write sharing; bigger batches; paper 2 to 4x, Figure 12 read 1.5 to 2.3x over Orca (Oracle) on ShareGPT.', 'each sequence wastes at most one partly filled block'),
 ('core', "Hero: the paper's Figures 3 and 7 (CC BY 4.0), the same two requests contiguous against paged, with what to notice.", 'notice where the waste goes'),
 ('core', 'You need and new terms: KV block, block table, internal and external fragmentation, reference count and copy-on-write, Orca variants, normalized latency.', 'the authors\' reimplementations of orca reserving the maximum length'),
 ('core', 'Figure 2 against the simulator shown inline in its own card after the predict question.', 'even the oracle wastes most of its memory'),
 ('core', 'Figure 15 against the simulator shown inline in its own card.', 'parallel sampling saves under 10% on alpaca'),
 ('core', 'Figure 18b and the simulated memory side shown inline in its own card.', 'larger blocks leave more of each last block empty'),
 ('owned:' + TF, 'Why a KV cache exists.', 'the keys and values of earlier positions, kept during generation'),
 ('owned:' + LC, 'KV bytes per token for any model; paged-block rounding in the memory budget.', 'paged-block rounding and fragmentation'),
 ('owned:' + PM, 'Why decode is memory-bound (roofline, arithmetic intensity).', 'compute-bound or memory-bound'),
 ('owned:' + BAT, 'Continuous (iteration-level) batching, paging, prefix caching, chunked prefill and preemption as they work today.', 'iteration-level scheduling'),
 ('owned:' + DS, 'Tensor parallelism at serve time and multi-node serving.', 'two all-reduces per layer for every token'),
 ('owned:' + VL, 'vLLM today: V1 engine, recompute-only preemption, governance.', 'there is no swap to cpu memory in this engine'),
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
        print('UNPLACED', x['id'], x['text'][:140]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "vLLM since the paper" (sources read 3 October 2026)'
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
