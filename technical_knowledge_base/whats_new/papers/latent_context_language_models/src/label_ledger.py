"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the LCLM page before the light pass;
adapted from the StateM page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits in a
closed <details> block or a predict reveal, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/latent_context_language_models'
LC = 'models_and_training/topic_llm_architecture/long_context'
BK = 'systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling'
LB = 'measurement/topic_benchmarks/long_context_and_multimodal'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {1: 'old header reading-time line ("About 21 min to read The paper tab", resources total), replaced by the measured "Reading: N min, plus M in closed details."'}
OWNED = {}
KEYS = {51: 'eq. 7 to 8'}
NEW = [
 ('core', 'Core sentence: an encoder shrinks the prompt before the decoder (T/N positions prefilled), KV compression evicts only after the full prefill; the only method faster than not compressing, about 2.6 RULER points down at 4x.', 'the only method in the paper faster than not compressing'),
 ('core', 'Hero: a 64K prompt at 4x through no compression (4.47 s, 35.4 GB), FastKVzip (5.19 s, 36.1 GB) and LCLM 4x (1.00 s, 17.4 GB), decoder prefill work to scale (Figure 4).', 'no compression 4.47 s and 35.4 GB, FastKVzip 5.19 s and 36.1 GB, LCLM 4x 1.00 s and 17.4 GB'),
 ('core', 'New terms: latent token, compression ratio N, encoder window W, adapter, TTFT, EXPAND, systems-realisable.', 'a cache saving an engine can actually free'),
 ('core', 'Figure 6 (CC BY 4.0) inline in the agent section: file names as text, contents as numbered latent blocks, one EXPAND brings back one block; its accuracy axis starts at 60.', 'axis starts at 60'),
 ('owned:' + LC, 'KV cache sizing in general and eviction policies (StreamingLLM, H2O, SnapKV) compared.', 'dropping cached entries by a score'),
 ('owned:' + BK, 'What a paged engine can reclaim from compressed caches: savings a paged engine cannot always realise.', 'savings a paged engine cannot always realise'),
 ('owned:' + LB, 'RULER as a benchmark: 13 tasks, effective length.', 'ruler 2024 13 tasks'),
 ('owned:' + ES, 'Standard error of one score, sqrt(p(1-p)/n).', 'how precise is one score?'),
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
        print('UNPLACED', x['id'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
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
