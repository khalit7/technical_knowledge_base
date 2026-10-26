"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the Proactive Memory Agent page before the light pass;
adapted from the SoL-Pi page's labeller). For every unit not overridden below, the key is the first run of 8
(then 6, then 4) consecutive words of its text that appears verbatim in the rebuilt page, and the label is volatile when
that key sits in the dated "Same week, beyond the paper" block, depth when it sits in any other closed <details> block, core otherwise.
Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/proactive_memory_agent'
CE = 'agents_and_retrieval/topic_agentic_harnesses/context_engineering'
ES = 'measurement/topic_evaluation_and_llm_judges/eval_statistics'
RL = 'models_and_training/topic_rl/rl_for_llms'
FAT = {1: 'old header reading line, replaced by the measured one'}
OWNED = {}
KEYS = {}
NEW = [
 ('core', 'Core sentence: a second model beside an unchanged agent keeps a memory bank and each step reminds or stays silent; Opus 4.6 watching Sonnet 4.5: Terminal-Bench 32 to 39 of 85, tau2-Bench 153 to 172 of 278, single runs; always reminding does as well (171 against 170 and 172), so a watcher helps, not shown that silence does.', 'run a second model beside an unchanged agent'),
 ('core', 'Hero: the actor loop, the memory agent reading task, window and bank, Phase 1 bank edits, Phase 2 reminder or no-op into the next call (52 of 80 steps in the traces); task counts with and without memory and always-remind against selective.', 'a second model edits a memory bank and decides'),
 ('core', 'New terms: behavioral state decay, action and memory agent, memory bank, Phase 1 and 2, no-op, pivot turns.', 'requirements, facts and failed attempts that are still in context'),
 ('core', 'Takeaway softened (2026-10-26): single runs, no cost reported; always remind solves as many as selective; the traces speak at 52 of 80 steps, often with fresh advice.', 'so the gain is shown for having the watcher'),
 ('owned:' + CE, 'Memory layers for agents (Mem0, Graphiti, Letta) compared and measured.', 'a twelve-session memory-layer experiment (mem0, graphiti, letta)'),
 ('owned:' + CE, 'Recall decays as the context window fills, even when the information is still present.', 'how recall decays as the window fills'),
 ('owned:' + ES, 'Paired tests on pass/fail items (McNemar uses only discordant items) and standard errors.', "the only ones mcnemar's test uses"),
 ('owned:' + RL, 'GRPO and RL post-training in general.', 'rl for llms: rlhf, grpo, rlvr'),
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
