"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the EnvHarness page as committed before the light pass;
adapted from the SA-MRPO page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, core otherwise (the page has no dated block).
Units added by hand (NEW) cover the light pass's top, the owner links, and the script-drawn tables, keyed to their static headings.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'whats_new/papers/envharness'
RL = 'models_and_training/topic_rl/rl_for_llms'
EV = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
HT = 'agents_and_retrieval/topic_agentic_harnesses/harnesses_for_training'
AH = 'agents_and_retrieval/topic_agentic_harnesses'
FAT = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: wrap an existing environment at reset()/step() with Stage, Contract and Chain, chosen by an LLM designer watching one policy fail, while the original verifier still scores every episode.', 'instead of generating new environments for an agent, wrap an existing one'),
 ('core', "Hero: the paper's own Figure 2 (CC BY 4.0): Agent = frozen LLM + harness (skills, memory, tools); Customized Environment = frozen Env + EnvHarness (Stage, Contract, Chain).", 'the same move on both sides of the loop'),
 ('core', 'You need and new terms: agent harness and RL environment linked; component, Stage, Contract, Chain, EnvRigger, Bridge, Original Envs.', 'the per-benchmark adapter to the runtime'),
 ('owned:' + AH, 'What an agent harness is: the program around a model (loop, tools, context, permissions) that makes it an agent.', 'an agent harness is the program wrapped around a language model'),
 ('owned:' + HT, 'What an RL environment for an LLM agent contains (task, tools, sandbox, verifier, reward) and how trajectories are recorded.', 'every exchange is recorded as the trajectory'),
 ('owned:' + RL, 'GRPO, the algorithm of the online-RL experiment, in general.', 'correct response gets 0.75 / 0.433 = +1.732'),
 ('owned:' + EV, 'The standard error of a difference between two means, unpaired, in general.', 'unpaired standard error of the difference'),
 ('core', 'Reading: Table 7 splits drawn by script (training reshaped, evaluation on original tasks only).', 'evaluation (original tasks only)'),
 ('core', 'Reading: Table 4 RL rows drawn by script.', 'alfworld in-dist'),
 ('core', 'Tables tab: Tables 2 and 3 with Welch t and p, by environment source.', 'tables 2 and 3: skills by environment source'),
 ('core', 'Tables tab: Figure 1 left on two axes.', 'figure 1, left: the same numbers, two axes'),
 ('core', 'Tables tab: Figure 5 in tasks of 407.', 'figure 5: environment scaling, in tasks'),
 ('core', 'Tables tab: Tables 4 and 5, RL and Chain.', 'tables 4 and 5: rl, and chain'),
 ('core', 'Tables tab: Table 9, four policies on SWE-bench Verified.', 'table 9: four policies on swe-bench verified'),
 ('core', 'Tables tab: Tables 10 to 12, transfer, cost and calibration.', 'tables 10 to 12: transfer, cost, calibration'),
 ('core', 'Tables tab: Table 13, nine weaknesses named in a sentence.', 'table 13: nine weaknesses named in a sentence'),
 ('core', 'Tables tab: Table 8 against the released configs.', 'table 8 against the released configs'),
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
        print('UNPLACED', x['id'], x['tab'], x['text'][:200]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k
    if dated and k in dated:
        x['label'] = 'volatile'; x['note'] = 'dated closed block "The 2026 family of multi-reward methods (dated: checked 25 October 2026)" in Why it matters'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-tables' if text.startswith('Tables tab') else 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
