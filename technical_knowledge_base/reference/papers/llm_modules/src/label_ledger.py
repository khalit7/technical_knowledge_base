"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the LLM Modules page before the light pass;
adapted from the RocketEval page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/llm_modules'
DI = 'models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models'
PE = 'models_and_training/topic_llm_training_and_post_training/peft'
TZ = 'models_and_training/topic_llm_architecture/the_transformer_from_zero'
FAT = {1: 'old header reading-time line (18 min, resources), replaced by the measured "Reading: N min, plus M in closed details."', 82: 'animation-manners line (stops off screen, paused under reduced motion), replaced by "Nothing moves until you press play or step"'}
OWNED = {16: (DI, 'hinton, vinyals and dean (2015)'), 67: (TZ, 'scores of later positions set to minus infinity'), 68: (TZ, 'scores of later positions set to minus infinity')}
KEYS = {128: 'not like for like', 176: 'markers: both'}
NEW = [
 ('core', 'Core sentence: keep the large model frozen and train a small decoder that reads its last hidden states through cross-attention; the toy learns only with a causal mask; as released the loss is measured with the next token visible, so the evidence cannot show it works.', 'a toy rebuild of the released code learns the task only once'),
 ('core', 'Hero: the CombinedModel as model.py builds it (frozen Qwen2-1.5B, bridge 16.4M, random-init GPT-Neo-sized decoder 86.6M, new output layer 116.5M; 1.76B run per token, 219.5M train), with the toy outcomes in the caption.', 'runs the whole frozen large model on every token'),
 ('core', 'You need and new terms: knowledge source, generation module, Enhanced Cross-Attention, CombinedModel, the leak.', 'the bridge lets each position read later tokens during training'),
 ('owned:' + PE, 'Bottleneck adapters in series (Houlsby) among the PEFT methods.', 'in series adapters (houlsby)'),
 ('owned:' + PE, 'QLoRA memory: a 65B model on one 48 GB card.', 'does qlora\'s 65b fit one 48 gb card'),
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
