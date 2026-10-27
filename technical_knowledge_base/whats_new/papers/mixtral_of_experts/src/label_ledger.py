"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Mixtral page before the light pass;
adapted from the Chinchilla and QLoRA labellers). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/mixtral_of_experts'
MOE = 'models_and_training/topic_llm_architecture/mixture_of_experts'
PM = 'systems_and_performance/topic_hardware/performance_math'
AL = 'models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr'
AV = 'models_and_training/topic_llm_architecture/attention_variants'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels'}
VOLATILE = {132: 'mistral deprecated the hosted open-mixtral-8x7b'}
OWNED = {}
KEYS = {}
NEW = [
 ('core', '', 'Core sentence: 8 FFN experts per layer, top-2 routing; 46.7B held, 12.9B per token; Llama 2 70B and GPT-3.5 quality at 13B-class compute, memory and mid-batch serving pay for all 46.7B.', 'the idea in one sentence: replace every feed-forward block'),
 ('core', '', "Hero: the paper's Figure 1 (CC BY 4.0), the MoE layer, router to 2 of 8 experts, weighted sum.", 'the other six experts do no work for that token'),
 ('core', '', 'New terms: sparse (total) parameters, active parameters, top-2 routing, positional locality.', 'positional locality'),
 ('owned:' + MOE, '', 'Generic MoE machinery (routers, load balancing, capacity factor, expert parallelism) is taught on Mixture of experts.', 'capacity factor a fixed buffer per expert'),
 ('owned:' + PM, '', 'The roofline, arithmetic intensity and the memory-bound decode step are on Performance math.', 'arithmetic intensity flops done per byte moved'),
 ('owned:' + AL, '', 'DPO itself is taught on the alignment page.', 'dpo β = 0.1'),
 ('owned:' + AV, '', 'Grouped-query attention is owned by Attention variants.', 'grouped-query'),
 ('depth', '', 'Parameter recount, Llama 2 paper comparison, Table 4, Figure 5, Figure 6 as win probabilities, and the eleven checks (script-rendered) are closed blocks of the Tables tab.', 'checks on the paper\'s own numbers'),
 ('core', '', 'Table 2, Figure 3 rebuilt, Table 3 provenance, Figures 7 and 9 decoded, Table 5 and Figure 10 stay open in the Tables tab.', 'figures 7 and 9, decoded'),
]
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
