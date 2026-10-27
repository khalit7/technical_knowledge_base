"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the DiffusionGemma page before the light pass;
adapted from the LLM Modules page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/diffusiongemma_technical_report'
FAM = 'models_and_training/topic_llm_architecture/families_and_objectives'
SPEC = 'systems_and_performance/topic_inference_and_serving/speculative_decoding'
PM = 'systems_and_performance/topic_hardware/performance_math'
MOE = 'models_and_training/topic_llm_architecture/mixture_of_experts'
FAT = {1: 'old header reading-time line (22 min, resources), replaced by the measured "Reading: N min, plus M in closed details."', 16: 'margin-label fragment split by the sentence splitter'}
OWNED = {9: (SPEC, 'a cheap drafter guesses the next k tokens')}
KEYS = {9: 'a cheap drafter guesses the next k tokens'}  # owned unit: its key lives on the owner page
NEW = [
 ('core', 'Core sentence: finetune Gemma 4 26B A4B AR weights to denoise 256-token blocks, same weights as causal encoder and bidirectional decoder; about 20 tokens per pass; a pass costs 2.8 AR steps at one request, so about 7x per-user speed; quality cost small on easy tasks, large on hard reasoning.', 'at one request a pass costs only 2.8 ar steps'),
 ('core', 'Hero: the encode, denoise, append loop of Figure 4 and one 256-token block to scale: 256 x 4.90 = 1,254 ms AR against 13.0 passes x 13.56 = 176 ms (derived from Eq. 12, Section 6, Table 3).', '13.0 passes × 13.56 ms = 176 ms'),
 ('core', 'You need and new terms: canvas, multinomial diffusion, TPF, self-conditioning, SD-RL, dual mode.', 'the previous pass\'s expected embedding fed back in'),
 ('owned:' + PM, 'Why one-request decoding is memory-bound: the roofline, about 1 FLOP per byte at batch 1.', 'arithmetic intensity and the roofline'),
 ('owned:' + SPEC, 'Speculative decoding mechanics: drafter proposes, target verifies in one pass; suffix decay of parallel drafters.', 'suffix decay'),
 ('owned:' + FAM, 'Masked diffusion LMs (LLaDA) and block diffusion (Arriola et al.) as objectives and families.', 'block diffusion ( arriola et al., iclr 2025 )'),
 ('owned:' + MOE, 'Expected distinct experts per layer against batch size, e(1 - (1 - k/e)^b), uniform independent routing.', 'expected distinct experts per layer'),
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
