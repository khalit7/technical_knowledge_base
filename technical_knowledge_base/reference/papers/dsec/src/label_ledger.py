"""Labels src/ledger.json (drafted by html_utils/ledger.py init on 2026-10-26 from the DSec page as built before the light pass;
adapted from the Dream-RSI page's labeller). For every unit not overridden below, the key is the first run of 8 (then 6, then 4)
consecutive words of its text that appears verbatim in the rebuilt page, and the label is depth when that key sits inside
a closed <details> block, volatile when it sits in the dated block "Since the paper", core otherwise.
Units added by hand (NEW) cover the light pass's top, the owner links, the dated block and the script-drawn charts and tables,
keyed to static text. Rerun after a rebuild; it prints any unit it cannot place."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'html_utils'))
import ledger  # visible() and norm(), so keys match what ledger.py check reads
PAGE = 'reference/papers/dsec'
RH = 'models_and_training/topic_llm_training_and_post_training/reward_hacking'
HT = 'agents_and_retrieval/topic_agentic_harnesses/harnesses_for_training'
FAT = {1: 'the old header line ("About 26 min to read The paper tab"), replaced by the measured reading line'}
KEYS = {}
NEW = [
 ('core', 'Core sentence: four isolation levels behind one SDK; each measured workload property answered by a stock-Linux mechanism; four mechanisms measured, scale self-reported, RL co-design not evaluated.', 'the rollout-survives-preemption co-design is described, not evaluated'),
 ('core', 'Hero (redrawn; arXiv non-exclusive licence): five rows of pressure, mechanism and measured effect (35 against over 60 min and 57% fewer writes; 5.5x and 3.4x; -40.2% and -21.2%; 45.2% to 17.3%; RL co-design not evaluated) and the self-reported scale.', 'read across a row'),
 ('core', 'You need (RL environments) and the new terms: sandbox, FnCall, microVM, libdsec, edge, 3FS, EROFS, base/workspace/toolkit, LS and BE.', 'the per-node agent with final admission authority'),
 ('owned:' + RH, 'Reward hacking in general, and the sandbox as a reward-hacking defence (DSec cited on the owner page, XFS_IOC_SWAPEXT).', 'reward-hacking defence'),
 ('owned:' + HT, 'RL environments in general: task, tools, sandbox, verifier, reward; the policy, harness and sandbox exchange.', 'the policy, the harness and the sandbox exchange calls'),
 ('core', 'Open summary of What it takes to use this.', 'everything else is configuration of stock linux that a team can rebuild at small scale'),
 ('core', 'Open pointer for the text-figure mismatches, details closed.', 'none changes a conclusion; the readings are in the closed block below'),
 ('volatile', 'Since the paper, checked 26 October 2026: arXiv still v1 only.', 'arxiv still lists only v1 of the paper'),
 ('core', 'Takeaway scoped on 26 October 2026: the database Takeaway called it the first publication with production numbers and stated scale and co-design as results.', 'scoped on 26 october 2026'),
 ('core', 'Reading: Table 1 scenario picker, the request path, layers against monolithic images and preemption animations, predict reveals and the results table, drawn by script.', 'components and order from §3; illustrative timing'),
 ('core', 'Place a burst tab: the power-of-k placement simulation, drawn by script.', 'place a burst'),
 ('core', "Figures tab: every figure decoded and every text-against-figure check, drawn by script.", "the paper's figures, rebuilt"),
]
F = HERE / 'ledger.json'
u = json.loads(F.read_text())
raw = (HERE.parent / 'index.html').read_text()
vis = ledger.norm(ledger.visible(PAGE))
body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
det = ' '.join(ledger.norm(d) for d in re.findall(r'<details.*?</details>', body, flags=re.S))
dated = ' '.join(ledger.norm(d) for d in re.findall(r'<details class="mist" id="s-since">.*?</details>', body, flags=re.S))
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
        x['label'] = 'volatile'
    else:
        x['label'] = 'depth' if k in det else 'core'
have = {x['text'] for x in u if x.get('added')}
n = max(x['id'] for x in u)
for lab, text, key in NEW:
    if text in have:
        continue
    tab = 't-figs' if text.startswith('Figures tab') else 't-run' if text.startswith('Place a burst') else 't-read'
    n += 1; u.append({'id': n, 'tab': tab, 'section': 'light pass 2026-10-26', 'text': text, 'label': lab, 'key': key, 'where': '', 'added': True})
F.write_text(json.dumps(u, indent=1, ensure_ascii=False) + '\n')
c = {}
for x in u: c[x['label'].split(':')[0]] = c.get(x['label'].split(':')[0], 0) + 1
print('units', len(u), c, 'unplaced', bad)
