"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the ReAct page before the
light pass; adapted from the CLIP page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when
that key sits inside a closed <details> block, volatile when it sits in the dated "Adoption and the products" block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/react'
HR = 'agents_and_retrieval/topic_agentic_harnesses'
BH = 'agents_and_retrieval/topic_agentic_harnesses/building_a_harness'
AR = 'agents_and_retrieval/topic_rag_and_retrieval/agentic_retrieval'
AE = 'measurement/topic_evaluation_and_llm_judges/agent_and_trajectory_evaluation'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 32: 'animation manners line, replaced by "Nothing moves until you press play or step"'}
KEYS = {65: 'batch size is 64.'}
NEW = [
 ('core', 'Core sentence: thoughts as actions that return no observation, interleaved with tool actions in one few-shot loop; grounding cuts hallucination; ALFWorld 45% to 71%.', 'each thought appended to the context like an action that returns no observation'),
 ('core', 'Hero: the loop (thought appended with no observation; action, environment, observation) and the 2x2 of prompts by deletion with Figure 1 answers and HotpotQA EM.', 'the baselines are the same hand-written trajectories with thoughts, actions or both deleted'),
 ('core', 'You need and new terms: thought, Act, dense and sparse thoughts, exact match, CoT-SC, trajectory.', 'free text the model writes that does not touch the environment'),
 ('core', "Figure 1 panel (2), the paper's own image, beside the ALFWorld setup, with what to notice.", 'notice the two blue think steps on the right'),
 ('owned:' + HR, 'Where the agent loop and tool calling came from; the loop as harnesses build it.', 'where the loop and tool calling came from'),
 ('owned:' + BH, 'Building the loop today: native tool calls, the action boundary, stop conditions.', 'building a harness: the loop, tool calling, edit formats, stop conditions'),
 ('owned:' + AR, 'Iterative and multi-hop retrieval methods (ReAct, Self-Ask, IRCoT, FLARE) compared.', 'retrieval as a tool the model calls'),
 ('owned:' + AE, 'Failure taxonomies for agent trajectories.', 'failure taxonomy'),
 ('owned:' + ES, 'Standard errors of benchmark scores in general.', 'the central limit theorem gives the standard error'),
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
        print('UNPLACED', x['id'], x['text'][:140]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "Adoption and the products that replaced each piece" (sources read 3 October 2026)'
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
