"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the StateM page before the light pass;
adapted from the LLM Modules page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Since the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/statem'
CC = 'agents_and_retrieval/topic_agentic_harnesses/claude_code'
LG = 'agents_and_retrieval/topic_agentic_frameworks/langchain_and_langgraph'
AB = 'measurement/topic_benchmarks/agentic'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
FAT = {1: 'old header reading-time line (19 min, resources), replaced by the measured "Reading: N min, plus M in closed details."',
       167: 'the 2D replay\'s scrolling event list; since 2026-11-13 the replay is a 3D stage whose generated step list marks the current step'}
OWNED = {}
KEYS = {  # re-keyed by hand in the 2026-11-13 split rollout (sentences reworded beside the new stages)
 42: 'the same run, without and with the gate, is on the stage',
 165: 'a refused one leaves a red plate on the edge',
 166: 'check outputs are trimmed to about 260 characters',
 # Further reading: keys without the resource's reading time (check_times.py and the build rewrite those figures)
 203: 'reading time of the resources below',
 205: 'code: henryqin1997/statem, apache-2.0',
 208: 'the runtime, the minimal runbook, the six-step transition',
 209: 'terminal-bench 2.1 submission pr #142',
 210: 'deepseek-v4-flash artifact release the authors',
 211: 'git_webserver_deploy family guide the authors',
 212: 'hugging face paper page hugging face daily papers',
 213: 'connected papers in this knowledge base harnessdev',
}
NEW = [
 ('core', 'Core sentence: a versioned YAML runbook of states whose exits are host-run checks; GPT-5.5 83.1% to 92.1% on the same 89 tasks the profile grew on; +0.55 to +1.34 on the one held-out test.', 'the agent cannot talk its way past'),
 ('core', 'Hero: every before/after pair as dumbbells, Terminal-Bench (development) against BusinessBench held-out; frozen runbook did nothing for DeepSeek (82.7 to 82.0) until $37 of adaptation.', 'big gains where the runbook was built, almost none where it was not'),
 ('core', 'New terms: runbook, profile, checked goto, harness scaling, hyper-agent, raw against reviewed.', 'a leaderboard score before and after the judge\'s cheating review'),
 ('core', 'Stage (2026-11-13): the checked goto on configure-git-webserver in 3D, soft plan against StateM; the gate refuses the handoff while nginx is down, the agent repairs, the gate passes (illustrative).', 'the edge to handoff runs the fixed end-to-end gate on the host'),
 ('core', 'Stage (2026-11-13): context as a stack, the plan buried under execution output, the in_hook anchor on top.', 'the green slab on top of the stack'),
 ('core', 'Stage (2026-11-13): a real released run replayed on the runbook graph in 3D, refused gotos as red plates on their edge, one step per recorded event.', 'one recorded event a step'),
 ('owned:' + CC, 'How hooks and stop hooks work in a coding harness (Claude Code): a stop hook can refuse to end a run.', 'a stop hook that ran the tests turned a half-fixed run into a fixed one'),
 ('owned:' + LG, 'Graph runtimes: explicit state, checkpointers, interrupts and durable execution (LangGraph).', 'checkpointers, interrupts, durable execution'),
 ('owned:' + AB, 'The harness alone moves an agentic benchmark score by large margins for the same model (Terminal-Bench 2.0 public board).', 'about 18 points across nine agents'),
 ('owned:' + ES, 'Binomial standard error of one score, sqrt(p(1-p)/n), and of a difference.', 'how precise is one score?'),
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
