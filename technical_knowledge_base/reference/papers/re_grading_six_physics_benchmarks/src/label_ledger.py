"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the re-grading page before the light pass;
adapted from the Phi-Bench labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits in a
closed <details> block, volatile when it sits in the dated block (id later), core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/re_grading_six_physics_benchmarks'
KR = 'measurement/topic_benchmarks/knowledge_and_reasoning'
LJ = 'measurement/topic_evaluation_and_llm_judges/llm_as_judge'
HA = 'measurement/topic_evaluation_and_llm_judges/human_evaluation_and_annotation'
FAT = {1: 'old header reading-time line, replaced by the measured "Reading: N min, plus M in closed details."',
 56: 'old predict question "how many were genuine model mistakes?", answered by the hero figure; the question now asks which benchmarks were grader-driven',
 57: 'same old predict question', 204: 'old note that the animation started on its own when on screen; it now waits ("The animation waits for you to press play or step.")'}
OWNED = {113: (KR, 'futurehouse (23 july 2025)')}
KEYS = {111: "rule-based checkers (exact match or symbolic) are reproducible but brittle", 112: 'judge problems shrink as stronger models judge', 58: 'rebuilt from table 2 and the counts in appendix b.2'}
NEW = [
 ('core', 'Core sentence: physicists re-checked answers marked wrong; 238 of 250 were the test\'s fault; measured error is mostly the defect rate; corrected best-model scores 78.7% to 94.6% mean@4 on smaller checked sets.', 'mostly the benchmark\'s own defect rate'),
 ('core', 'Hero: waffle of the 250 rejections by label (143 benchmark, 95 grader, 12 model; 57.2%, 38.0%, 4.8%); nothing marked right was re-checked.', 'of 250 answers marked wrong, 12 were the model\'s mistake'),
 ('core', 'New terms: model, grader and benchmark error; pre-audit and corrected; audit run; mean@4 and pass@4; EED; defect floor.', 'no model\'s measured error can fall below the share of defective items'),
 ('core', 'Predict: which benchmarks were mostly grader errors (PHYBench and PRISM-Physics).', 'on which benchmarks were most of them the grader\'s fault'),
 ('owned:' + LJ, 'LLM judge biases (position, verbosity, self-preference) and their measured sizes.', 'position bias'),
 ('owned:' + KR, 'Other audits of Humanity\'s Last Exam and answer-key defects.', 'futurehouse (23 july 2025)'),
 ('owned:' + HA, 'Scott\'s pi and agreement statistics defined.', "scott's pi"),
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
        print('UNPLACED', x['id'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Dated readings, September and October 2026" (2026-09-21 tech news issue; Artificial Analysis read 3 October 2026)'
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
