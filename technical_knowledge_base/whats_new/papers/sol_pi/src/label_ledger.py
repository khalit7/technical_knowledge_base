"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the SoL-Pi page before the light pass;
adapted from the NeoHorse-1 page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Same week, beyond the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/sol_pi'
BH = 'agents_and_retrieval/topic_agentic_harnesses/building_a_harness'
CE = 'agents_and_retrieval/topic_agentic_harnesses/context_engineering'
HT = 'agents_and_retrieval/topic_agentic_harnesses/harnesses_for_training'
FAT = {1: 'old header reading line, replaced by the measured one', 7: 'navigation bar',
       204: 'restated the evidence section (nothing to rerun; search cost not reported)'}
OWNED = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: point an automated research loop at the harness, select only changes that cut cost within score tolerance; four mechanisms kept; 44.7 to 49.0% fewer tokens (mostly re-read cache), about a third less cost than Pi on EdgeBench, at 93.7 to 94.3% of its score, single runs.', 'point an automated research loop at the'),
 ('core', 'Hero: 152 directions, loops on 535 environments, four survivors; where each acts in the agent loop (context, tool call, observation); the full stack against Pi as a share of Pi for tokens, cost and score, both models.', '152 ideas in, four mechanisms out'),
 ('core', 'New terms: Pi, recorded token traffic, constrained efficiency, lineage, add-one, [Efficiency] and [Performance].', 'the open coding harness sol-pi extends'),
 ('core', 'Script-drawn (add-one chart, Table 4): each mechanism alone cuts tokens on both models; scores scatter on both sides of Pi.', 'every mechanism alone cuts tokens on both models'),
 ('core', 'Takeaway softened (2026-10-26): "at parity" became 93.7 to 94.3% of Pi\'s score in single runs; humans steered and refactored; the hourly saving is derived by assuming two-hour tasks; Terminal-Bench 4 15 against 18.', 'is derived by assuming two-hour tasks'),
 ('owned:' + BH, 'The agent loop: the harness sends the model a request, runs the action it asks for and hands back a result; every request re-sends the context.', 'a harness is a loop that sends the model a request'),
 ('owned:' + CE, 'Prompt caching: the provider reuses work on an identical prefix; changing a message rewrites the cache from there on.', 'so the provider reuses its work on the repeated prefix'),
 ('owned:' + HT, 'Self-improving harness search in general and how to judge it (single search arms, transfer to a model the search never saw, search cost).', 'sol-pi checked with opus 5, which its search never saw'),
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
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Same week, beyond the paper" (read 3 October 2026)'
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
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
