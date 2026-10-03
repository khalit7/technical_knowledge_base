"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-21) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (SoL-Pi), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Replay a session tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ['Apply recursive self-improvement at the harness layer rather than to the model', 'saving $8.75 to $13.50 per hour against native Codex and Claude Code']),
 ('Topics property: agentic-harnesses, benchmarks, inference-and-serving', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "5 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Song Han and collaborators including Haozhe Liu, Tian Ye and Sensen Gao', R + ', headline card (all 14 authors)', ['Haozhe Liu', 'Tian Ye', 'Sensen Gao', 'Song Han', 'Qihang Cao', 'Enze Xie']),
 ('"NVIDIA and academic partners"', R + ', headline card (NVIDIA, NTU, MIT)', ['NVIDIA, NTU, MIT']),
 ('arXiv 2609.20519, 17 September 2026', R + ', headline card', ['arXiv 2609.20519', '17 September 2026']),
 ('Code at https://github.com/NVlabs/SoL-Pi', R + ', card; What it takes to use this; ' + F, ['https://github.com/NVlabs/SoL-Pi']),
 # idea
 ('RSI is normally a model-training story; SoL-Pi applies the loop one layer up, to the harness', R + ', Idea', ['Recursive self-improvement (RSI) usually means a model improving the next model', 'SoL-Pi applies the loop to the harness']),
 ('Auto-research loops across a spread of environments, changing how the agent executes work, not the weights', R + ', Idea and The search', ['The weights never change', '535 executable environments']),
 ('Improvements that survive across environments are kept as reusable techniques', R + ', Idea; The search', ['only changes that survive selection are kept', 'Four mechanisms passed capability-constrained selection']),
 ('Claim: a technique transfers because it is a property of how agents burn tokens, not of the task', R + ', Idea', ['because it targets how agents burn tokens, not anything about a particular task']),
 # four techniques
 ('1. Action execution optimisation: fewer, better-shaped tool calls', R + ', Four mechanisms (Action Fusion)', ['1. Action Fusion', 'three API calls become two']),
 ('2. Context compaction: shrink what is carried forward', R + ', Four mechanisms (Online Context Compact); ' + S, ['2. Online Context Compact', 'compact at subtask boundaries when it pays']),
 ('3. Observation handling: stop paying full price for tool output not needed in full', R + ', Four mechanisms (ObservationPack)', ['3. ObservationPack', 'A tool result larger than 10 KiB']),
 ('4. Delegated reading: hand bulk reading to a cheaper subordinate, carry back the conclusion', 'corrected: R, Four mechanisms (only build and test logs of at least 4 KiB go to the cheaper model; file reads and searches bypass it; receipts are verified)', ['4. Evidence-Preserving Reducer', 'File reads and searches bypass it', 'in fact file reads and searches bypass it']),
 ('None of the four is novel on its own', R + ', Four mechanisms', ['None of the four is new as an idea']),
 ('The contribution: found by a loop, not an engineer, and the loop establishes transfer', R + ', Four mechanisms; How much to believe (humans refactored the survivors)', ['the contribution is that a loop found, tested and kept them', 'hybrid auto-research loop']),
 # results
 ('Results on EdgeBench (51 tasks)', R + ', EdgeBench', ['SoL-Pi uses the 51 public tasks']),
 ('Task performance at parity with the baselines', 'corrected: R, EdgeBench and How much to believe (93.7% and 94.3% of Pi\'s score, 2.5 to 2.8 points lower; "comparable" in the paper)', ['"Comparable" is a drop of 2.5 to 2.8 points', 'The first summary said "at parity"']),
 ('Recorded token traffic down 44.7 to 49.0%', R + ', card and EdgeBench', ['49.0% · 44.7%', '44.7% fewer tokens']),
 ('API cost down roughly one third', R + ', card and Tokens vs dollars', ['33.2% · 33.5%', 'About a third (33.5%)']),
 ('$8.75 to $13.50 saved per hour against native Codex and Claude Code', R + ', card and Tokens vs dollars (derived: cost difference over 51 tasks × 2 hours)', ['$8.75 to $13.50', 'the total cost difference divided by 102 hours']),
 ('$4.36 to $5.71 against the baseline Pi system', R + ', card; hourly derivation table', ['$4.36 to $5.71 against Pi', 'vs Pi (Opus 5)']),
 # why it matters
 ('First result to put a number on how much of agent cost is harness inefficiency rather than model inefficiency', R + ', Why it matters ("first" marked unconfirmed)', ['The first summary called this the first result to put a number on how much of an agent\'s cost is harness inefficiency', '"First" is unconfirmed']),
 ('Roughly half the tokens at no loss in task performance', 'corrected: R, Why it matters (about half the recorded tokens and a third of the cost, at a few points of score)', ['about half the recorded tokens and a third of the cost, at a few points of score']),
 ('Answers the question Topic: agentic-harnesses has carried since 2026-08-31, that nobody had run the loop end to end', R + ', Why it matters; ' + F, ['has carried since 2026-08-31', 'https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb']),
 ('At the efficiency layer, the easier half: an efficiency change has a cheap automatic verifier, a capability change does not', R + ', Idea and Why it matters', ['which is the easier half', 'an efficiency change has a cheap automatic verifier (did it cost less and still pass?)']),
 # caveats
 ('One benchmark, 51 tasks', 'corrected: R, Other tests (Terminal-Bench 4, IMO 2026 and a swarm are also reported) and How much to believe', ['Terminal-Bench 4', 'IMO 2026', 'Single runs, no error bars']),
 ('Recorded token traffic is not the same as billed tokens once cache behaviour is accounted for', 'corrected: R, Tokens vs dollars (the paper\'s cost column prices each token type; the traffic headline is mostly cache reads)', ['This is also the right reading of the first summary\'s caveat', 'recorded token traffic is not the same as billed tokens once cache behaviour is accounted for']),
 ('Hourly dollar figures depend on vendor prices in force in September 2026', 'corrected: R, EdgeBench (prices as of 17 August 2026)', ['API prices as of 17 August 2026', 'The first summary said September prices; the paper says August']),
 # connections
 ('Efficiency counterpart to the five harness-scaling strategies on Topic: agentic-harnesses, all of which optimise capability', R + ', Connections', ['The efficiency counterpart to the five harness-scaling strategies']),
 ('Read against Z.ai GLM-5.3 Infra Agent write-up: binding constraint is feedback quality, not the model', R + ', Connections; ' + F, ['GLM-5.3 Infra Agent write-up', 'the binding constraint on an improvement loop is the quality of the feedback it receives, not the model driving it', 'https://z.ai/blog/glm-built-its-inference-infrastructure']),
 ('Second of the week\'s three auto-research papers, with Agora and Dream-RSI', R + ', Connections; ' + F, ['Second of the week\'s three auto-research papers', 'https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900', 'https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54']),
 ('Read against Proactive Memory Agent: compaction removes, selective reminding restores; no result measures both', R + ', Connections; ' + F, ['https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c', 'selective reminding restores what it dropped, and no published result measures the two together']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-21)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"at parity": 93.7% and 94.3% of Pi\'s average score, 2.5 to 2.8 points lower ("comparable performance" in the paper)',
                         '"delegated reading: hand bulk reading to a cheaper subordinate": only build and test logs of at least 4 KiB from a predefined command set; file reads and searches bypass it; receipts are verified with fallback',
                         '"recorded token traffic is not the same as billed tokens": the paper does price cache reads and writes separately; its 33% cost cut is the billed figure, and the 44.7-49.0% traffic figure is mostly cache reads',
                         '"vendor prices in force in September 2026": the paper uses API prices as of 17 August 2026',
                         '"one benchmark, 51 tasks": also Terminal-Bench 4 (63 tasks, 15 solved against 18), IMO 2026 (3 of 6 against Codex\'s 5) and a swarm run',
                         '"first result to put a number on harness inefficiency": unconfirmed; Meta-Harness already tracks context cost',
                         'Not in the old page: the hourly figures equal cost differences over 51 tasks x 2 hours; the held-out results include the 11 acceptance tasks; the Performance point is chosen on EdgeBench; the search cost is not reported'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
