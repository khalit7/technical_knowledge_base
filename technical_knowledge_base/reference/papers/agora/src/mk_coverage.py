"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration, this paper's own list) with where the HTML carries it, and verify each item's check
strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "5 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Yifan Zhang, Yunheng Zou, Shaokun Zhang, Jian Hu, Hao Zhang, Binfeng Xu, Jan Kautz, Yi Dong', R + ', headline card', ['Yifan Zhang', 'Yunheng Zou', 'Shaokun Zhang', 'Jian Hu', 'Hao Zhang', 'Binfeng Xu', 'Jan Kautz', 'Yi Dong']),
 ('arXiv 2609.18094, 16 September 2026', R + ', headline card', ['2609.18094', '16 September 2026']),
 ('Code at https://github.com/yifanzhang-pro/Agora', 'card, What it takes to use this, Further reading (corrected: the repository holds no code)', ['https://github.com/yifanzhang-pro/Agora', 'no code yet', 'none released']),
 # problem
 ('Multi-agent research systems normally coordinate through a planner that decides who does what, merges results and decides what is true', R + ', Problem', ['coordinate through a planner', 'merges results and decides what is true']),
 ('The planner is the bottleneck and the single point of failure', R + ', Problem', ['the bottleneck and the single point of failure']),
 ('Reproducibility dies there: the record is a conversation transcript, not an artifact anyone can re-execute', R + ', Problem', ['reproducibility goes to die', 'conversation transcript rather than an artifact anyone can re-execute']),
 # mechanism
 ('Agora removes the planner and replaces shared memory with a Git repository', R + ', The idea', ['removes the planner and replaces shared memory with a Git repository']),
 ('Research is an append-only DAG in Git; every claim is a commit: hypothesis, code, measured result, parent commits', R + ', The idea (Eq. 1 tuple)', ['append-only directed acyclic graph (DAG) stored in Git', 'every claim is a commit: the hypothesis, the code, the measured result and the parent commits it builds on']),
 ('Any worker can check out any commit and rerun it', R + ', The idea', ['Any worker can check out any commit and rerun it']),
 ('Coordination is emergent: a worker picks what to extend by reading the graph; duplicated work is visible as divergent branches from the same parent rather than hidden in a planner queue', R + ', The idea', ['Coordination is emergent rather than assigned', 'divergent branches from the same parent rather than hidden inside a planner']),
 ('Design consequence: provenance and reproducibility stop being separate features', R + ', The idea', ['provenance and reproducibility stop being separate features']),
 ('Git already gives content-addressed history, cheap branching, merge semantics and an ancestry relation', R + ', The idea', ['content-addressed history, cheap branching, merge semantics and an ancestry relation']),
 ('The contribution is recognising the append-only DAG as the right data structure, and that a tool built for it exists', R + ', The idea', ['the append-only DAG is the right data structure for collective agent work']),
 # results
 ('12-day run with 13 language-model workers on a weight-transfer problem', R + ', The run (11 days 19 hours, from v4); card takeaway', ['13 workers over 12 days', '11 days and 19 hours', 'Thirteen worker accounts']),
 ('141 donor models, a 119.6M-parameter target', R + ', The run', ['141 open-weight models', '119,572,320 parameters', '119.6M']),
 ('1,703 contributions published to the graph', R + ', card and The run', ['1,703']),
 ('Evaluator score 3.39 to 1.899 bits per byte, closing 62% of the distance to a trained GPT-2 124M', R + ', card, Results (recomputed 62.4%)', ['1.899044', '62.4%', 'trained GPT-2 124M']),
 ('Winning ancestry: 145 commits across 15 accounts, evidence the result was collective', R + ', Results; qualified in How much to believe', ['145 commits in its ancestry', '15 of the 17 accounts', 'That the big result was collective']),
 ('165 independent reproductions, zero failures', R + ', card and Results (corrected per v4: 165 verifications of 95 targets, 141 distinct pairs, no reported failures)', ['165 verification contributions covering 95 distinct targets', '141 distinct verifier and target pairs', 'none reporting a failure']),
 ('One human intervention mid-run, to restore diversity after the population converged', R + ', What the humans did (corrected per v4: three server changes, a prompt change, a database edit, three hand-run sessions)', ['one human intervention mid-run, to restore diversity after the population converged', 'changed the server three times']),
 # caveats
 ('Caveat: one problem, one 12-day run', R + ', How much of this to believe', ['One task, one run']),
 ('Caveat: the single mid-run human correction does unmeasured work; it implies the system drifts toward premature convergence without it', R + ', How much of this to believe', ['premature convergence', 'correction doing unmeasured work']),
 ('Caveat: bits per byte is a well-posed objective with a cheap automatic evaluator, the friendliest setting for this design', R + ', Why it matters', ['well-posed objective with a cheap automatic evaluator, the friendliest possible setting']),
 ('Caveat: nothing shows it survives a problem where deciding whether a claim is true is itself expensive', R + ', Why it matters; What it takes', ['deciding whether a claim is true is itself expensive']),
 # connections
 ('Read next to SoL-Pi and Dream-RSI: all three are auto-research loops differing in where the memory lives', R + ', Connections; Further reading', ['3e25c17b0d0d81a0bb77f16cbc898bb5', '3e25c17b0d0d813ba021d805ba80ef54', 'they differ in where the loop\'s memory lives']),
 ('Agora: shared commit graph; SoL-Pi: harness-layer techniques discovered once and reused; Dream-RSI: replay simulator built from the search history', R + ', Connections', ['Agora puts it in a shared commit graph', 'harness-layer techniques discovered once and reused', 'replay simulator built from the search history']),
 ('Read against Emergence World: same shape under attack; individually safe agents compose into systems with new failure modes', R + ', Connections; Further reading', ['3e25c17b0d0d818fbffbc9e2ceab824b', 'individually safe agents compose into systems with new failure modes']),
 ('An append-only graph any worker can extend is one an adversarial worker can poison; Agora does not test that', R + ', Connections; How much of this to believe', ['an adversarial worker can poison, and Agora does not test that']),
 # database properties
 ('Property Takeaway', 'stays in the database; shown verbatim in the headline card with a correction note', ['Record collective agent research as an append-only DAG of Git commits', 'That is the database\'s Takeaway']),
 ('Property Topics: agentic-frameworks, agentic-harnesses, swe-and-system-design', 'stays in the database; Further reading, Topics', ['Topic: agentic-frameworks', 'Topic: agentic-harnesses', 'Topic: swe-and-system-design']),
 ('Property Year: 2026', 'stays in the database; breadcrumb', ['· 2026 ·']),
 ('Parent Papers database', 'breadcrumb and Further reading', ['3c65c17b0d0d81549dbedb27e8f2a26f']),
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
           'corrected': [o['fact'] for o in out if 'corrected' in o['where']], 'items_list': out},
          open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
