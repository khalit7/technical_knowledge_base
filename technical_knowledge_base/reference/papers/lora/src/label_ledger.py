"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-24 from the LoRA page before the light pass;
adapted from the DDPM page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/lora'
PEFT = 'models_and_training/topic_llm_training_and_post_training/peft'
SERVE = 'systems_and_performance/topic_inference_and_serving/llm_serving_in_production'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 33: 'animation manners line, replaced by "Nothing moves until you press play or step"', 134: 'a bold lead-in split off as its own sentence; its bullet is unit 135'}
VOLATILE = {}  # id -> key; filled below by text match (the dated closed block "Where LoRA runs now")
OWNED = {148: ('owned:' + PEFT, 'exactly the same at the beginning of training')}
KEYS = {}  # id -> key chosen by hand where the automatic run of words fails
NEW = [
 ('core', 'Core sentence: freeze the pretrained weights, learn each adapted matrix change as BA of rank 1 to 8; on GPT-3 4.7 million trained numbers instead of 175 billion, matches full fine-tuning, no inference cost once merged.', 'learn each adapted matrix\'s change as the product of two thin matrices'),
 ('core', "Hero: the paper's Figure 1 redrawn with GPT-3's numbers: frozen d x d W0 (151M numbers), A from d to r and B from r to d in parallel, summed; r = 4 is 98,304 numbers, 0.065% of the matrix.", '98,304 trainable numbers, 0.065%'),
 ('core', 'You need and new terms: r, A and B, alpha, adapter layer, prefix tuning, phi.', 'a 0 to 1 overlap between two subspaces'),
 ('owned:' + PEFT, '', 'QLoRA mechanics in general (NF4, double quantisation, paged optimisers) are taught on the PEFT page.', 'double quantisation : the per-block scales'),
 ('owned:' + PEFT, '', 'The memory of full fine-tuning, LoRA and QLoRA for any model: the PEFT calculator.', "does qlora's 65b fit one 48 gb card"),
 ('owned:' + PEFT, '', 'DoRA as magnitude and direction, taught on the PEFT page.', 'dora: magnitude and direction'),
 ('owned:' + SERVE, '', 'How a server batches requests for different adapters (Punica kernel, S-LoRA memory pool): LLM serving in production.', 'serving thousands of adapters on one gpu'),
 ('core', '', 'Tables tab, drawn by script: every number in the text checked, 21 claims with verdicts.', 'every number in the text, checked'),
 ('core', '', 'Tables tab, drawn by script: the parameter recount of every configuration from the formulas and the Hugging Face configs.', 'model shapes from the hugging face configs'),
 ('core', '', 'Tables tab, drawn by script: Tables 2, 3 and 4 with LoRA minus FT deltas, binomial standard errors and the RTE share.', 'show binomial standard errors'),
 ('depth', '', 'Tables tab, drawn by script: Table 15, every GPT-3 configuration.', 'every method and budget behind figure 2 and table 4'),
 ('depth', '', 'Tables tab, drawn by script: every inconsistency between the paper tables with where each value is printed.', 'every inconsistency, with where each value is printed'),
 ('core', '', 'Train tab, drawn by script: how far to trust the toy (overlap, quantisation, engine check, seeds).', 'how far to trust the toy'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
m = re.search(r'Where LoRA runs now.*?</details>', body, flags=re.S); dated = ledger.norm(m.group(0)) if m else ''
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
        print('UNPLACED', x['id'], x['text'][:100]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['where'] = ''; x['note'] = 'dated closed block "Where LoRA runs now" (checked 2 October 2026)'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for row in NEW:
    lab, text, key = (row[0], row[1], row[2]) if len(row) == 3 else (row[0], row[2], row[3])
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-24', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
