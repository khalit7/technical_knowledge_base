"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Agora page as built before the light pass;
adapted from the EnvHarness page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the hero, the real image, the owner links and the script-drawn tables and charts, keyed to static text.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/agora'
BA = 'models_and_training/topic_rl/bandits_and_exploration'
MA = 'agents_and_retrieval/topic_agentic_frameworks/multi_agent_patterns'
EV = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
BE = 'models_and_training/topic_llm_architecture/beyond_attention'
FAT = {132: 'autoplay note; replaced by "the animation never plays by itself"'}
KEYS = {105: 'four two-token clause starters', 174: 'the dag endpoint had returned at most 200'}
NEW = [
 ('core', 'Core sentence: no planner; every claim a Git commit; scored by what other accounts built on it; ranked; 3.39 to 1.899 in 12 days; about 98% on day one; no comparison against agents without Agora.', 'nothing was compared against agents without agora'),
 ('core', 'Hero (redrawn; arXiv non-exclusive): the workers loop, an illustrative commit DAG with Table 2 weights, the Table 4 descent with the 98% bracket; store, score, steer.', 'the graph is the memory, the score and the to-do list'),
 ('core', 'You need (bandits) and new terms: contribution, evidence score, analyze, k_eff, the three slots, bits per byte, Stage A.', 'the winning recipe\'s factorised bigram prior'),
 ('core', 'Real image: the repository version of Figure 4 (Apache 2.0), the winner ancestry as one spine; its 1.89899 label against the cutoff best 1.899044.', 'one long spine (orange) carries the winner'),
 ('core', 'Open summary of What it takes to use this.', 'nothing is released, so using agora means rebuilding it'),
 ('volatile', 'Since the paper, checked 25 October 2026: no code, the repository unchanged, nvlabs/agora 404, arXiv still v4, website and README still v1.', 'checked 3 october and again 25 october 2026'),
 ('owned:' + BA, 'UCB and its exploration bonus in general (Eq. 3 is a UCB rule plus a novelty term).', 'upper confidence bound (ucb)'),
 ('owned:' + MA, 'Multi-agent coordination patterns in general: orchestrator-workers, blackboard, shared against isolated context.', 'a shared store every agent reads and writes; nobody assigns'),
 ('owned:' + EV, 'Bootstrap and paired standard errors in general (used for the 200-text noise).', 'paired bootstrap, permutation'),
 ('owned:' + BE, 'Mamba blocks and hybrids in general (the target simplifies a Mamba block).', 'the selective scan, blelloch'),
 ('core', 'Reading: frontier calculator, Figure 2 bars, Stage B band map and Table 4 descent animation drawn by script, keyed to their static captions.', 'illustrative graph; formulas and constants are the paper'),
 ('core', 'Rebuild tab: ladder, rank explorer, replay and noise table drawn by script.', 'the ladder: our measurements beside the paper'),
 ('core', 'Tables tab: Tables 1 to 5, Figure 2 table, version changes and every check drawn by script.', 'every derived number, checked'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="more"><summary>Since the paper.*?</details>', body, flags=re.S))
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
