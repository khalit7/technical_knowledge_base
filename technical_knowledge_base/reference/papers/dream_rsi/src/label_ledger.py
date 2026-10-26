"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Dream-RSI page as built before the light pass;
adapted from the EnvHarness page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links, and the script-drawn tables and charts, keyed to static text.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/dream_rsi'
MB = 'models_and_training/topic_rl/model_based_rl_and_planning'
FAT = {}
KEYS = {20: 'optimises the search strategy online and pays exactly this cost', 205: 'spends 51,200 generations per problem by default'}
NEW = [
 ('core', 'Core sentence: a finished run is an exact record; revised policies scored by replay at no new calls; replay can only re-order what was recorded; better results must come from the next online run.', 'anything better has to come from the next online run'),
 ('core', 'Hero (redrawn; arXiv non-exclusive, repository figures unlicensed): record, dream, redeploy on an illustrative 6 x 6 grid (18 of 36 attempts, same best), the ceiling, and the Lasso and VGG16 numbers with their caveats.', 'same best node, fewer paid attempts'),
 ('core', 'You need (model-based RL) and new terms: discovery loop, exploration policy, discovery tree or world, dreaming, development agent, Recursive Fixed Exploration, discovery cost.', 'discovery-agent calls, not counting the development agent'),
 ('core', 'The replay stepper moved from the Dream tab into Method, with its illustrative-world caption.', 'watch the rule work'),
 ('core', 'Open summary of the policy prompt rules.', 'one "beta" knob trades width and patience'),
 ('core', 'Open summary of What it takes to use this.', 'you would build a layer that logs every attempt'),
 ('volatile', 'Since the paper, checked 25 October 2026: code released (google-research/dream-rsi, Apache 2.0, 6 October); arXiv v2 (6 October): Pareto hypervolume objective, M = 4, harness task 0.7247 to 0.8090, history ablation 1.90 at 786 against 1.59 at 430, PACEvolve appendix; Hugging Face 334 upvotes.', 'google-research/dream-rsi'),
 ('volatile', 'arXiv v2 changes listed in the dated block.', 'normalised hypervolume'),
 ('owned:' + MB, 'Model-based RL in general: Dyna, Dreamer, planning against a model.', 'planning in the background (dyna)'),
 ('core', 'Reading: the round-by-round race animation and predict reveals drawn by script, keyed to static captions.', 'each round\'s budget as a bar, to scale'),
 ('core', 'Dream tab: the dream sweep and the online deployment drawn by script.', 'what the toy shows, and what it cannot'),
 ('core', 'Tables tab: Figure 3(a), Table 1, Figure 4, Figures 5 and 6 and the checks drawn by script.', "the paper's tables and figures, rebuilt"),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="more" id="s-since"><summary>Since the paper.*?</details>', body, flags=re.S))
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
