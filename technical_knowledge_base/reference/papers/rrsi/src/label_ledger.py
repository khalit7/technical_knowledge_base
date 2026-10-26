"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the RRSI page as built before the light pass;
adapted from the Dream-RSI page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise. There is no dated block: nothing on this page is volatile follow-up news.
Units added by hand (NEW) cover the light pass's top, the open summaries, the owner links, and the script-drawn charts and tables,
keyed to static text. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/rrsi'
HAR = 'agents_and_retrieval/topic_agentic_harnesses'
HFT = HAR + '/harnesses_for_training'
FAT = {45: 'a sentence-splitter fragment of a citation (Eq. 5, 7), not a unit', 227: 'described the old autoplay; the caption now says nothing moves until you press play or step'}
# unit 13 held the general definition of a harness, now owned by the harnesses root (one sentence and a link stay here)
OWNED = {13: (HAR, 'the harness is everything except the model')}
KEYS = {}
NEW = [
 ('core', 'Core sentence: score-only harness search chases noise, fits the evolve tasks and bloats the harness; RRSI regularises the search, not the edit space, and gives up evolve score for transfer.', 'deliberately giving up evolve-set score to buy transfer'),
 ('core', 'Hero (redrawn; arXiv non-exclusive licence): the loop with RRSI additions, and Table 2 evolve 89.4 / 92.8 / 90.5, OOD 39.7 / 40.3 / 43.6, tokens 1.56 / 3.80 / 2.42M.', 'regularising the search gives up evolve score and buys transfer on fewer tokens'),
 ('core', 'You need (harnesses root, self-improving harnesses, eval statistics) and new terms: evolve set, OOD, incumbent, noise band, edit budget, edit ledger, leakage critic, policy tokens.', 'the score difference two evaluations of the same harness can show by chance'),
 ('core', 'Open summary of the critic records: catch rate never measured; one outright rejection in four runs, not for leakage.', 'it rejected only one candidate outright, and not for leakage'),
 ('core', 'Open summary of the setup: evolve and transfer suites per domain, judges against simulators.', 'transfers to frontier-eng, both graded by simulators'),
 ('core', 'Open summary of What it takes to use this.', 'calibrate the noise band first'),
 ('owned:' + HFT, 'Keeping the best of noisy harness scores overstates the gain: the general mechanism and its toy.', 'on a noisy ruler the measured gain runs ahead of the true one'),
 ('core', 'Reading: the keep-the-best toy (sm), the loop diagram, the Eq. 4 budget chart, Figures 3, 1(a), 4(a) and the Table 2 chart, drawn by script, keyed to static captions.', 'rebuilt from the vector pdf (baseline token costs appear only in the figure)'),
 ('core', 'Replay tab: the four released runs stepped round by round, the re-judging plane, the runs side by side, Harvey LAB held-out against the record, drawn by script.', 'nothing here is simulated: every dot is a recorded evaluation'),
 ('core', "Tables tab: Tables 1 to 6, budgets, noise bars and all 53 checks, drawn by script.", "the paper's tables and figures, rebuilt"),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
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
        x['label'], x['key'] = 'owned:' + OWNED[x['id']][0], OWNED[x['id']][1]; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Replay tab') else 't-read', 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
