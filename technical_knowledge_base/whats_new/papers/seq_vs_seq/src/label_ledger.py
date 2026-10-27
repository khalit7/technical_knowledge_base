"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Seq vs Seq (Ettin) page before the light pass;
adapted from the PagedAttention page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/seq_vs_seq'
FO = 'models_and_training/topic_llm_architecture/families_and_objectives'
EM = 'agents_and_retrieval/topic_rag_and_retrieval/embedding_models'
PM = 'systems_and_performance/topic_hardware/performance_math'
FAT = {24: 'animation-manners line (stops off screen, paused under reduced motion), replaced by "Nothing moves until you press play or step"'}
KEYS = {}
NEW = [
 ('core', 'Core sentence: exact encoder and decoder pairs at six sizes, then conversion with 2.5% more training; encoder wins classification and retrieval, decoder wins generation at every size; native encoder beats decoders up to about 2.7x its size; conversion does not close classification at any size or generation from 150M up, retrieval to within noise.', 'only the attention mask and the objective differ'),
 ('core', "Hero: the paper's Figure 1 (CC BY 4.0), MNLI, retrieval and generation against size for all four kinds, with what to notice.", 'solid lines never cross'),
 ('core', 'You need and new terms: Ettin, MNTP, encoder-from-decoder and decoder-from-encoder, cross-objective budget.', "llm2vec's way to make a decoder bidirectional"),
 ('owned:' + FO, 'Causal and bidirectional masks, CLM and MLM objectives, model families (the Idea section keeps only what Ettin does with them).', 'mlm, span corruption predict hidden tokens'),
 ('owned:' + EM, 'What an encoder does in retrieval: the bi-encoder.', 'query and document encoded separately by one model'),
 ('owned:' + PM, 'MFU accounting behind the derived utilisation of the training runs.', 'memory, mfu and hfu, prefill and decode'),
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
        print('UNPLACED', x['id'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Since the paper" (sources read 3 October 2026)'
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
