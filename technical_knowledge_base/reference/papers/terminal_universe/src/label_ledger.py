"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Terminal-Universe page as built before the light pass;
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
PAGE = 'reference/papers/terminal_universe'
HT = 'agents_and_retrieval/topic_agentic_harnesses/harnesses_for_training'
AB = 'measurement/topic_benchmarks/agentic'
EV = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {}
KEYS = {230: 'now reports terminal-bench 4.0', 4: 'scoped on 25 october 2026', 38: 'the animation never plays by itself'}
NEW = [
 ('core', 'Core sentence: a recorded run shows enough of its workspace to rebuild it; teacher re-solves new tasks under its own tests; TB2.1 46.2 to 58.1; re-solving beats imitating by 15 points.', 'a recorded agent run shows enough of the workspace'),
 ('core', 'Hero (redrawn; arXiv non-exclusive): pipeline with printed counts (359,593 traces, 2.9 then 22.4 files, 37,273 sufficient, record counts, 46.2 to 58.1) and Table 4 bars 36.7 / 47.0 / 52.1.', 're-solving beats it by 15.4 points'),
 ('core', 'You need and new terms: replay, completion agent, task-sufficient, the four query types, Full Mixture, MT@4.', "an llm judge's verdict on context, not a build"),
 ('core', 'Open summary of the setup: Qwen3.5-27B on the Full Mixture, TB2.0 and 2.1 (six runs, two scaffolds), EvoCode-Bench v2 MT@4 fail-stop.', 'whose mt@4 is fail-stop'),
 ('core', 'Open summary of What it takes to use this.', 'replay is cheap, the teacher'),
 ('owned:' + HT, 'What an environment for a coding agent contains and how SWE-Gym, SWE-smith and R2E-Gym style environments are built, in general.', 'where tasks come from: real issues and their fixing commits'),
 ('owned:' + AB, 'How Terminal-Bench is run and scored (containers, harness, checker), in general.', 'on terminal-bench 2.0 the checker ran inside the agent'),
 ('owned:' + EV, 'Unpaired standard error of a difference between two means, in general.', '±3.77 unpaired'),
 ('core', 'Reading: Table 13 bars (files, text lines, code lines) drawn by script.', 'means, with medians in the labels'),
 ('core', 'Reading: the funnel drawn by script.', 'the whole funnel, from the pipeline figure'),
 ('core', 'Reading: the multi-round stepper drawn by script.', 'step through the user agent'),
 ('core', 'Reading: Figure 3 bars drawn by script.', 'shares printed on figure 3'),
 ('core', 'Reading: Table 3 dot chart drawn by script.', 'filled dots were measured by the authors'),
 ('core', 'Replay tab and tables tab content drawn by script (traces, histogram, tables, checks), keyed to static headings.', 'replay a real trajectory'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="mist"><summary>Since the paper.*?</details>', body, flags=re.S))
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
