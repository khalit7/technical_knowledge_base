"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the QLoRA page before the light pass;
adapted from the Chinchilla page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block or in the tables tab, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/qlora'
QP = 'models_and_training/topic_llm_training_and_post_training/quantization_and_precision'
LJ = 'measurement/topic_evaluation_and_llm_judges/llm_as_judge'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 2: 'tab labels', 36: 'old autoplay note (Stops off screen), replaced by: it moves only when you press play or step'}
VOLATILE = {}
OWNED = {32: (QP, 'absmax per 64')}   # id -> (owner path, key on the owner's built page)
KEYS = {159: '= 2,193'}    # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', '', 'Core sentence: NF4 storage with double-quantised constants, BF16 compute, 16-bit LoRA on every linear layer; 65B on one 48 GB GPU, matching 16-bit LoRA on MMLU.', 'the idea in one sentence: store the frozen base model in 4 bits'),
 ('core', '', 'Hero: the paper\'s Figure 1 (CC BY 4.0), full finetuning against LoRA against QLoRA, with paging to CPU.', 'the base model shrinks to a 4-bit transformer'),
 ('core', '', 'New terms: NF4, double quantisation, paged optimizer, storage and computation data type, Guanaco.', 'storage and computation data type'),
 ('owned:' + QP, '', 'Blockwise absmax quantisation as a general recipe (scales per block, granularity) is taught on Quantisation and precision.', 'absmax per 64'),
 ('owned:' + LJ, '', 'LLM-judge biases in general (position, self-preference) with measured sizes across studies are on LLM-as-judge.', 'position bias'),
 ('depth', '', 'Every checkable number checked (recompute.py, recompute_eval.py; script-rendered), now a closed block of the Tables tab.', 'every checkable number, checked (the full list)'),
 ('depth', '', 'Values behind Figures 2, 4 and 6 (script-rendered), now a closed block of the Tables tab.', 'figure values (figures 2, 4 and 6)'),
 ('volatile', '', 'Framework adoption (LLaMA-Factory 3 June 2023, Axolotl, torchtune, Unsloth) moved to a dated closed block.', 'adoption and follow-ups, as of 25 october 2026'),
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
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block in Why it matters'; continue
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
