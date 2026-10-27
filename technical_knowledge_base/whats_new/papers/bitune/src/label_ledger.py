"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Bitune page before the light pass;
adapted from the PagedAttention page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/bitune'
FO = 'models_and_training/topic_llm_architecture/families_and_objectives'
TF = 'models_and_training/topic_llm_architecture/the_transformer_from_zero'
PEFT = 'models_and_training/topic_llm_training_and_post_training/peft'
BAT = 'systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling'
FAT = {28: 'wind-up ("This is a known weakness."); the next sentence now opens with the encoders themselves', 43: 'animation-manners line (stops off screen, paused under reduced motion), replaced by "Nothing moves until you press play or step"'}
KEYS = {161: 'zhang et al. 2025 ; kb page'}
NEW = [
 ('core', 'Core sentence: prefill the prompt twice (causal, and bidirectional with its own adapter), mix keys and values per block with learned weights, generate causally; +0.1 to +4.0 over LoRA on five 2B to 8B models for about 3x finetuning time.', 'bidirectionally with its own adapter'),
 ('core', "Hero: the paper's Figure 1 (CC BY 4.0), prefilling with two passes and decoding over the mixed instruction features, with what to notice.", 'only the prompt (the instruction features) is mixed'),
 ('core', 'You need and new terms: instruction features, causal and bidirectional pass, alpha_k and alpha_v, LoRA16, Naive Bidir.', 'the rank-16 baseline with bitune\'s parameter count'),
 ('core', 'Why the two passes have different weights, stated once beside the hero (the ablations test it).', 'instead of pushing them through weights trained on causal ones'),
 ('owned:' + FO, 'Causal and bidirectional masks, the prefix LM (Naive Bidir. is one), encoder and decoder families.', 'a decoder whose prompt is read both ways and continuation causally'),
 ('owned:' + TF, 'Why a KV cache exists (the instruction features are the prompt\'s KV cache).', 'the keys and values of earlier positions, kept during generation'),
 ('owned:' + PEFT, 'LoRA, and merging an adapter into the base weights for serving at the base\'s speed.', "so the model runs at the base's shape and speed"),
 ('owned:' + BAT, 'Prefix caching, which a bidirectional prompt cache cannot use.', 'prefix caching and eviction'),
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
