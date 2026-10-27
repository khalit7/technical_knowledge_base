"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the NeoHorse-1 page before the light pass;
adapted from the StateM page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/neohorse_1'
DS = 'models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models'
AL = 'models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
GW = 'agents_and_retrieval/topic_agentic_frameworks/gateways_and_routing'
FAT = {1: 'old header reading line, replaced by the measured one', 7: 'navigation bar', 29: 'described the old autoplay; the caption now says it waits for the reader'}
OWNED = {89: (DS, 'on-policy distillation fixes it the way rl does')}
KEYS = {}
NEW = [
 ('core', 'Core sentence: a deployed routing harness already judges how hard each request is, so NeoHorse-1 uses routing records to order and select agent post-training data for Qwen3.5-4B and 9B, gaining +5.93 and +3.44 macro points; no experiment switches the routing curriculum, the distillation or the allocation step off, and the loop ran once.', 'already judges how hard each request is'),
 ('core', 'Hero: the five parts of the recipe in order with whether the paper isolates each (only the data source is compared, Table 3), and the whole recipe measured: 58.94 to 64.87 at 4B, 65.60 to 69.04 at 9B.', 'none of its routing parts is tested on its own'),
 ('core', 'New terms: routing harness, tiers C0 to C3, user turn and subscene, curriculum key, deficiency profile and allocation, RSI.', "the router's four levels of capability demand"),
 ('owned:' + DS, 'Why on-policy distillation: SFT learns from recorded responses but a deployed student conditions on its own prefixes; the student writes and the teacher grades every token (Agarwal et al.).', 'on-policy distillation fixes it the way rl does'),
 ('owned:' + AL, 'The SFT loss mask: which tokens are graded; the others are read but give no gradient.', 'which tokens are graded'),
 ('owned:' + ES, 'Binomial standard error of a score from the number of items.', 'standard error (se)'),
 ('owned:' + GW, 'Routing between models by difficulty: routers and cascades.', 'routing by difficulty: routers and cascades'),
 ('core', 'Script-drawn (gains chart, Tables 1 and 2): NeoHorse-1 minus its base per benchmark, with binomial error bars where the size is known.', 'each bar is neohorse-1 minus its own base'),
 ('core', 'Script-drawn (error table): gains as item counts with binomial standard errors on five benchmarks whose sizes the scores give away; 9B LiveCodeBench and IFBench identical to the item.', 'identical to the item'),
 ('core', 'Script-drawn (data experiments reveal, Figure 7 decoded): the base 69.31 sits between the Toucan run (-4.99) and the harness run (+1.26).', 'the toucan run made the model'),
 ('core', 'Takeaway softened (2026-10-25): allocation is designed, not measured; the parts are not isolated; the loop ran once; the 4B beats the base 9B on 5 of 10; the +6.26 is mostly the public-data run falling below the base.', 'the loop is a design'),
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
