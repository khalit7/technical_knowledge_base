"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Trained Persistent Memory page as built before the light pass;
adapted from the EnvHarness page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise (the page has no dated news block).
Units added by hand (NEW) cover the light pass's top, the owner links, and the script-drawn tables and charts, keyed to static text.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/trained_persistent_memory'
CE = 'agents_and_retrieval/topic_agentic_harnesses/context_engineering'
PEFT = 'models_and_training/topic_llm_training_and_post_training/peft'
FAM = 'models_and_training/topic_llm_architecture/families_and_objectives'
EV = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {10: 'wind-up: the pilot framing is already stated in the sentence before', 13: 'citation fragment split off by the sentence splitter', 41: 'citation fragment split off by the sentence splitter',
       50: 'citation fragment split off by the sentence splitter', 154: 'citation fragment split off by the sentence splitter'}
KEYS = {4: 'all six score above the stateless baseline', 36: 'the write rules in full', 94: 'two things do not add up'}
NEW = [
 ('core', 'Core sentence: a frozen Flan-T5-XL with a persistent latent bank, written by a fixed never-trained rule and read by a small trained adapter; above zero at 10x, but the score cannot go below zero and the write erases a turn within about 100 turns.', 'a fixed, never-trained rule writes every turn'),
 ('core', 'Hero (redrawn, the paper is arXiv non-exclusive): only the read adapter is trained; the write multiplies the bank by 0.95 each turn; half-life 13.5 turns; a turn 256 back keeps about 2e-6.', 'half-life 13.5 turns'),
 ('core', 'You need and new terms: persistent bank, injection point, write mechanism, delegated or explicit read, conversational learning, memory recall rate, evidence lag.', 'the bank keeps filling at inference, no gradients'),
 ('core', 'All three write rules multiply what is stored by gamma each turn (M.6 only in the slots it picks).', 'm.6 only in the slots it picks'),
 ('core', 'So the experiment trains a decoder-side reader for whatever a random write rule deposits; nothing learns what to store.', 'nothing learns what to store'),
 ('owned:' + FAM, 'How an encoder-decoder decoder reads the encoder through cross-attention, in general.', 'reads the encoder (cross-attention)'),
 ('owned:' + PEFT, 'Prefix tuning and other PEFT methods on a frozen model, in general.', 'prefix tuning: n keys and values per layer'),
 ('owned:' + CE, 'Text-level agent memory and the memory-layer libraries (Mem0, Graphiti, Letta), in general.', 'memory-layer experiment (mem0, graphiti, letta)'),
 ('owned:' + EV, 'Standard errors and seed variance of an eval score, in general.', 'the standard deviation of the score across re-draws of the items'),
 ('core', 'Reading: the method explorer card per method (write, read, trained parameters, recounted counts) drawn by script.', 'pick a method to see where its memory enters and how it writes'),
 ('core', 'Reading: the forgetting curves (Table 3) at 1x and 10x with standard-error bounds, drawn by script.', 'show ± 1 standard-error bound'),
 ('core', 'Reading: F1 with bank zeroed and with bank per method (Table 5), drawn by script in the reveal.', 'f1 with the bank zeroed = 6.44'),
 ('core', 'Simulation tab: decay, distinct rows and slots written per write rule, drawn by script.', 'simulate the memory bank'),
 ('core', 'Tables tab: Tables 2 to 5 and the claim checks, drawn by script.', "the paper's tables, rebuilt"),
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
        print('UNPLACED', x['id'], x['tab'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Simulation') else 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
