"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the RocketEval page before the light pass;
adapted from the Seq vs Seq page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/rocketeval'
LJ = 'measurement/topic_evaluation_and_llm_judges/llm_as_judge'
HP = 'measurement/topic_benchmarks/human_preference_and_arenas'
BK = 'systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling'
FAT = {1: 'old header reading-time line (27 min, resources), replaced by the measured "Reading: N min, plus M in closed details."', 8: 'wind-up ("three kinds"); its content is merged into the one Problem sentence that links LLM-as-judge', 53: 'animation-manners line (stops off screen, paused under reduced motion), replaced by "Nothing moves until you press play or step"'}
KEYS = {24: 'is 64.8% in the text and figure 1, 64.7% in table 2'}
OWNED = {}
NEW = [
 ('core', 'Core sentence: a frontier model writes yes/no checklists once per query, a small model answers each item alone and is scored by its P(Yes); ranks a field almost like GPT-4o for under 1% of the cost, short of human agreement on single verdicts.', 'the part of judging that needs judgment'),
 ('core', 'Hero: the three stages (GPT-4o once per query, small judge per item with the normalised score, mean or trees) and three outcomes (0.965 against 0.979; 57.9% against 64.7%; $27.7 against $3,400), redrawn from Figure 2.', 'the frontier model writes the questions once'),
 ('core', 'You need and new terms: checklist item, normalised score, Unsup. and Sup., CoT, Direct and Fixed baselines, discordant pair.', 'two models a ranking orders the other way'),
 ('owned:' + LJ, 'Judge modes and fine-tuned judges as a family (the Problem section keeps only the paper\'s argument against fine-tuned judges).', 'fine-tuned judges, reward models, verifiers'),
 ('owned:' + LJ, 'Position bias as a judge bias in general (the Diagnosis keeps the paper\'s own flip-rate measurement).', 'it brings position bias'),
 ('owned:' + HP, 'What MT-Bench, AlpacaEval, Arena-Hard and WildBench are as judge-graded boards and how they relate to Chatbot Arena.', 'judge-graded boards (mt-bench, alpacaeval, arena-hard, wildbench)'),
 ('owned:' + HP, 'Votes to Bradley-Terry Elo with bootstrap intervals (the Arena-Hard Elo fit of Figure 11).', 'votes to a bradley-terry score'),
 ('owned:' + BK, 'Prefix caching and PagedAttention (the grading section keeps that the item prompts share a prefix vLLM computes once).', 'prefix caching and eviction'),
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
