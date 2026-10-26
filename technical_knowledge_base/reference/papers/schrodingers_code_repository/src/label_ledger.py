"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the SchrodingerRepo page as built before the light pass;
adapted from the RRSI page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise. There is no dated block: nothing on this page is volatile follow-up news.
Units added by hand (NEW) cover the light pass's top, the open summaries, the owner links, and the script-drawn charts and tables,
keyed to static text. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/schrodingers_code_repository'
COD = 'measurement/topic_benchmarks/coding'
STAT = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {}
# unit 15 held how SWE-bench is built (2,294 issues, the 500 Verified), owned by Coding benchmarks (one sentence and a link stay here)
OWNED = {15: (COD, 'leaving 2,294 tasks')}
KEYS = {5: 'scoped on 26 october 2026 from the earlier database takeaway', 91: 'where do they go?'}
NEW = [
 ('core', 'Core sentence: same tasks and tests, the repository redrawn per run under four behaviour-preserving levels; Pass@1 falls 6 to 14 points and actions rise.', 'part of a repository-level score is knowing where things are in a familiar codebase'),
 ('core', 'Hero (redrawn; arXiv non-exclusive licence): the familiar and the seeded view of the Django case (Figure 4 paths), the translator, and Table I Pass@1 and actions, baseline against full setting, for four models.', 'same task, unfamiliar names: pass@1 falls and the search gets longer'),
 ('core', 'You need (Coding benchmarks, Eval statistics) and new terms: view, Levels 1 to 4, full setting, translator, leakage evidence.', 'the concrete repository a seed draws for one run'),
 ('core', 'Open summary of the four code-against-text differences.', 'an instance that cannot be transformed silently runs on the original repository'),
 ('core', 'Open summary of What it takes to use this.', 'it is worth it as a paired companion to a static verified score'),
 ('owned:' + STAT, 'Power and minimum detectable effect in general (the RQ4 calculation stays here).', 'minimum detectable effect'),
 ('core', 'Reading: Figure 1, the command-flow diagram, the levels panel, Table I, Figure 3, the power calculator and the case-study animation, drawn by script, keyed to static captions.', 'redrawn from its printed bar labels'),
 ('core', 'Transform tab: Level 2 and Level 3 ported and run on the real Django code, step animation, seed slider, Figure 4 preset, search, renaming table, drawn by script.', 'transform a repository'),
 ('core', "Tables tab: Table I printed or recomputed, intervals and McNemar, every printed change recomputed, Tables II and III, Figures 1 and 3, drawn by script.", "the paper's tables and figures, rebuilt"),
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
    n += 1; u.append({'id': n, 'tab': 't-tables' if text.startswith('Tables tab') else 't-run' if text.startswith('Transform tab') else 't-read', 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
