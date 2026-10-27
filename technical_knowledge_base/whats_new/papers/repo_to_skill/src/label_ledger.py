"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Repo-To-Skill page before the light pass;
adapted from the StateM page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in a dated "Since the paper" block (this page has none), depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/repo_to_skill'
CC = 'agents_and_retrieval/topic_agentic_harnesses/claude_code'
FAT = {4: 'the card no longer quotes the database property verbatim; the takeaway_note now says what was softened and why'}
OWNED = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: DisCo distils a repository, papers or a task into a checked skill graph; the 1,000-repository library (5,353 skills) counts out, but the four gains (MLE-bench 31.1% to 72.9%) come from skills built for each benchmark.', 'come from skills built for each benchmark, not from that library'),
 ('core', 'Hero: the four benchmark results as dumbbells, each labelled with where its skills came from; none is the library.', 'every benchmark improved, and every one used skills built for it'),
 ('core', 'New terms: operational knowledge, skill graph, task-agnostic and task-oriented distillation, creator and researcher mode, router.', 'the entry skill that narrows the library from area to family to graph'),
 ('owned:' + CC, 'How a harness loads skills progressively: only the name and description sit in context; the body loads when the skill is invoked.', 'only the name and description sit in context from the start'),
 ('core', 'Takeaway softened (2026-10-25): gains from skills built per benchmark, not the library; fixed budget excludes construction; knowledge sources are source, docs, examples, tests, scripts and configs, not issues.', 'none of the four results uses the library'),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ''
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
