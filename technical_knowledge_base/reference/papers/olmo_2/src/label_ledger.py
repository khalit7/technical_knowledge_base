"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the OLMo 2 page as committed before the light pass;
adapted from the DeepSeekMath page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links, and script-drawn tables whose captions carry a key.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/olmo_2'
NORM = 'models_and_training/topic_llm_architecture/normalisation_residuals_and_stability'
ONP = 'models_and_training/topic_llm_landscape/other_notable_providers'
FAT = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: a lab can publish every byte of its pipeline and still land on or near the open-weights compute frontier, with stability fixes, a short curated anneal that adds about 10 points, and Tülu 3 post-training.', 'a lab can publish every byte of its pipeline'),
 ('core', 'Hero (drawn by script, static): OLMo 2 7B stages to scale in tokens (3.90T pretraining, 3 x 50B anneals souped), what each bought (spike score 0.40 to 0.03; average 53.0 to 62.9; GSM8K 24.1 to 67.5; instruct suite 51.4 to 56.5), beside the 7B-to-9B models of Table 6 on average against FLOPs.', 'most of the compute buys a stable base'),
 ('core', 'You need and new terms: normalisation, optimisers and alignment pages linked; spike score, mid-training, microanneal, souping, Dolmino, OLMES, GSM*.', 'a few-billion-token anneal to test one data source'),
 ('owned:' + NORM, 'z-loss in general: a penalty on the log of the output softmax normaliser that keeps output logits from growing.', 'z-loss penalises it'),
 ('owned:' + NORM, 'Output ("reordered") norm and QK-norm in general: where each norm sits and what it bounds.', 'output norm ("reordered")'),
 ('owned:' + NORM, 'Why decayed embeddings raise early-layer gradients (Takase et al.): the argument in general.', "olmo 2 team's argument for not weight-decaying it"),
 ('owned:' + ONP, 'OLMo 1.7 against OLMo 2 stability over whole runs, from the released W&B logs.', "olmo 1.7's gradient norm spikes"),
 ('owned:' + ONP, 'Olmo 3, the successor, and the OLMo lineage after this paper.', 'a reasoning model from 6x fewer tokens'),
 ('core', 'Tables tab: Qwen 2.5 32B by 6ND is 35.1 x 10^23, not Table 6\'s 16.0.', 'qwen 2.5 32b by 6 nd'),
 ('core', 'Tables tab: the parameter, token and 6ND recount reproduces Table 6\'s FLOPs (1.77, 4.61, 12.87).', '1.77, 4.61, 12.87'),
 ('core', 'Tables tab: Figure 1 is read on a square-root FLOPs axis fitted to its gridlines.', 'square-root flops axis fitted to its 11 labelled gridlines'),
 ('core', 'Tables tab: Table 6 averages recomputed from each row, with flags where a value disagrees.', 'the last column recomputes the average from the row'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Since the paper</b> \(dated.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['tab'], x['text'][:160]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Since the paper (dated: checked 25 October 2026)" in Why it matters'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read' if not text.startswith('Tables tab') else 't-tables', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
