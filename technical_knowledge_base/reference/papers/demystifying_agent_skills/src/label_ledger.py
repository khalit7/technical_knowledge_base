"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the page as committed before the light pass;
adapted from the Qwen3 labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4) consecutive
words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside a closed <details>
block, core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/demystifying_agent_skills'
CC = 'agents_and_retrieval/topic_agentic_harnesses/claude_code'
FAT = {1: 'old reading-time line, replaced by the measured subtitle', 33: 'old autoplay note, replaced by "never plays by itself"'}
VOLATILE = {}
OWNED = {12: (CC, 'only the name and description sit in context from the start')}
KEYS = {11: 'the format is anthropic', 189: 'though the text says skillsbench has 86 tasks', 192: "none of which changes a conclusion's direction", 207: 'it is an early controlled account of why the skill.md pattern works'}
NEW = [
 ('core', '', 'Core sentence: same five trajectories, packaging changed: SKILL.md beats workflow memory (+6.06, 528 paired Codex runs), not clearly raw (+2.84), and adds misapplication (10.0%).', 'the idea in one sentence: hold an agent'),
 ('core', '', "Hero: the paper's control (one pool, three arms) and Tables 9 and 11 as bars: success, SC2 failures, misapplication, timeout per arm (the paper is not CC BY).", 'one pool of experience, three arms'),
 ('core', '', 'New terms: workflow memory, mixture (1s4f), paired triple, procedural anchor.', 'paired triple : the raw, workflow memory and skill runs'),
 ('owned:' + CC, '', 'What a skill is and progressive disclosure are taught on Claude Code (section 6); the Problem keeps one sentence and links it.', 'only the name and description sit in context from the start'),
 ('owned:measurement/topic_evaluation_and_llm_judges/eval_statistics', '', 'The design effect 1 + (m - 1)rho in general is on Evaluation statistics; this page keeps its own 1 + 5rho for six triples per task and links it.', '1 + (m − 1)ρ for clusters of m items'),
 ('volatile', '', 'SkillsBench lists 87 tasks (read 3 October 2026): dated closed block "Later, as of 25 October 2026".', 'skillsbench lists 87 tasks'),
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
    x.pop('note', None)
    if x['id'] in FAT:
        x['label'], x['key'], x['note'] = 'fat', '', FAT[x['id']]; continue
    if x['id'] in VOLATILE:
        x['label'], x['key'] = 'volatile', VOLATILE[x['id']]; x['note'] = 'dated closed block'; continue
    if x['id'] in OWNED:
        o, k = OWNED[x['id']]; x['label'], x['key'] = 'owned:' + o, k; continue
    k = KEYS.get(x['id']) or find_key(x['text'])
    if not k:
        print('UNPLACED', x['id'], x['tab'], x['text'][:110]); bad += 1; x['label'], x['key'] = '', ''; continue
    x['key'] = k; x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, where, text, key in NEW:
    if text in have:
        continue
    n += 1; u.append({'id': n, 'tab': 't-read', 'section': 'light pass 2026-10-25', 'text': text, 'label': lab, 'key': key, 'where': where, 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
