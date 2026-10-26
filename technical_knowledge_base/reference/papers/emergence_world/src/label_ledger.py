"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-25 from the Emergence World page before the light pass;
adapted from the Phi-Bench labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits in a
closed <details> block, volatile when it sits in the dated block (id later), core otherwise. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/emergence_world'
AS = 'agents_and_retrieval/topic_agentic_harnesses/agent_security'
MA = 'agents_and_retrieval/topic_agentic_frameworks/multi_agent_patterns'
FAT = {1: 'old header reading-time line, replaced by the measured "Reading: N min, plus M in closed details."',
 4: 'old card note "The database Takeaway, kept as written"; the takeaway is now softened and the note says so',
 338: 'old note that the replay started on its own when on screen; it now waits ("The animation waits for you to press play or step.")'}
OWNED = {}
KEYS = {253: 'the incident as the paper narrates it', 39: 'compute credits (cc) are earned mainly at victory arch', 44: 'agents control their own memory', 318: 'when it pays off'}
NEW = [
 ('core', 'Core sentence: recognising an attack is not containing it; every exposed world warned, none removed traces or kept watching; Gemini flagged the lure within three minutes and then called the attacker database 489 times and set its Central Bank on fire.', 'recognising an attack is not containing it'),
 ('core', 'Hero: six of the nine Table 7 phishing criteria for the seven exposed worlds, noticed (P7, P5) against stopped (P1, P4, P6, P9), with totals out of nine; single runs, authors\' binary calls.', 'every world saw the phishing; none cleaned up after it'),
 ('core', 'New terms: world, stress event, P1 to P9, S1 to S6, M1 to M5, Agent World Indicators, reasoning-action mismatch.', 'an agent names content hostile and acts on it anyway'),
 ('owned:' + AS, 'Controls at the action boundary for agents reading untrusted content: the lethal trifecta, permission gates, egress control.', 'lethal trifecta'),
 ('owned:' + MA, 'Cemri et al. multi-agent failure taxonomy (MAST, 14 modes) where reasoning-action mismatch comes from.', "mast's 14 modes"),
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
