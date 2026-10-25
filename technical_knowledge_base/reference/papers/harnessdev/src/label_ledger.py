"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the HarnessDev page before the light pass;
adapted from the StateM page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/harnessdev'
HR = 'agents_and_retrieval/topic_agentic_harnesses'
AB = 'measurement/topic_benchmarks/agentic'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {}
OWNED = {}
KEYS = {13: 'it moves scores a lot', 25: 'is then frozen', 131: 'what the evolution edits were', 167: 'two examples the text does not tie to a lineage'}
NEW = [
 ('core', 'Core sentence: score the harness, not the answer; creator builds from a zero-scoring seed, harness frozen, executor runs it on 2,207 hidden tasks; best match references only where those ran the same or older models; Evolution visible +3.0 to +13.9 shrank to +1.43 to +4.44 held out.', 'score the harness , not the answer'),
 ('core', 'Hero: per benchmark, the six creators\' Self-Eval range and best against the human reference, labelled with the model the reference ran; losses of 10.7 to 39.6 points (derived) only where the reference ran a newer model.', 'by 10.7 to 39.6 points (derived)'),
 ('core', 'New terms: creator and executor, seed, Self-Eval and Unified-Eval, Creation and Evolution, pair, lineage.', 'one creator\'s chain of versions'),
 ('owned:' + HR, 'What an agent harness is: the program around a model that turns it into an agent (loop, tools, context, permissions and sandbox).', 'an agent harness is the program wrapped around a language model'),
 ('owned:' + AB, 'The harness alone moves an agentic benchmark score for the same model (Terminal-Bench public board, about 18 points across nine agents).', 'about 18 points across nine agents'),
 ('owned:' + ES, 'Binomial standard error of one score, sqrt(p(1-p)/n), and of a difference.', 'how precise is one score?'),
 ('core', 'Takeaway softened (2026-10-25): "match or beat" is the best one or two creators against references that ran the same or older models; the domain split is not a controlled comparison.', 'so the domain split is not a controlled comparison'),
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
