"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-28) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (RRSI), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Replay tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card, with a correction note)', R + ', headline card', ['Regularising recursive harness evolution with an annealed edit budget, a critic and a pruner buys +14.1 points in distribution, +4.7 out of distribution and 30% fewer policy tokens, which is the first evidence the loop\'s gains survive leaving the benchmark it was scored on.', 'Read with care:']),
 ('Topics property: agentic-harnesses, llm-training-and-post-training, benchmarks', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time "6 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Peng Xia ... Chen-Yu Lee (14 names)', R + ', headline card', ['Peng Xia', 'Rujun Han', 'Zifeng Wang', 'Yanfei Chen', 'Yufan Zhuang', 'Yoonho Lee', 'Chengsong Huang', 'Han Yu', 'Zhongying CuiZhu', 'Yifei Ming', 'Huaxiu Yao', 'Burak Gokturk', 'Tomas Pfister', 'Chen-Yu Lee']),
 ('Submitted 21 September 2026, revised 23 September 2026', R + ', headline card', ['Submitted 21 September 2026 (v1), revised 23 September 2026']),
 ('arXiv 2609.24972 (45 min)', 'card and Further reading', ['https://arxiv.org/abs/2609.24972', '(45 min)']),
 ('regularized-rsi.com', 'card, Replay tab and Further reading', ['https://regularized-rsi.com/']),
 # framing
 ('Capability largely magnified by the harness: prompts, control flow, tooling, memory, context management around a frozen backbone', R + ', Problem', ["An LLM agent's capability is largely magnified by its harness", 'the tool interfaces, the memory and skill files, and the context management']),
 ('Recursive evolution of the harness looks like free capability', R + ', Problem', ['it looks like free capability']),
 ('The obvious objection: the loop overfits the benchmark it is scored against', R + ', Problem', ['The obvious objection is overfitting']),
 ('Every earlier system measures only whether the loop improved what it was pointed at; this is the first to ask whether gains survive leaving it', R + ', Why it matters (corrected: the paper itself cites concurrent work asking the same question)', ['The paper itself claims to be the first to ask whether the gains survive leaving the benchmark', 'so "first" belongs to the question being asked widely at once']),
 # mechanism
 ('Temporally annealed edit budget limiting how many changes one candidate may bundle', R + ', Idea and Method (Eq. 4, budget chart)', ['Annealed update sparsity.', 'caps the number of independently attributable edits per candidate']),
 ('So a late-stage proposal cannot rewrite the harness wholesale and claim the result', R + ', Method', ['so a late-stage proposal cannot rewrite the harness wholesale and take credit for the result']),
 ('Proposer pushed toward trajectories absent from the evolution history', R + ', Method (structured exploration and the edit ledger)', ['Structured exploration.', 'reserved for components the run has never touched']),
 ('A critic screens proposals specific to the benchmark rather than the task', R + ', Method (leakage screening, with the released critic records)', ['Leakage screening.', 'rejects edits that encode task names, entity names, task-specific values']),
 ('A pruner removes edits too small to matter, too expensive to keep, or redundant once later edits landed', R + ', Method (corrected: the cost part is the acceptance rule; the pruner marks components with no positive gain)', ['Structural pruning.', 'Old summary, corrected.', 'too small to matter, too expensive to keep, or made redundant once later edits landed']),
 # results
 ('Eight benchmarks spanning coding, agentic workspace and engineering-design tasks', R + ', Setup table', ['Setup: three domains, eight benchmarks', 'Terminal-Bench 2.1', 'Frontier-Eng']),
 ('+14.1 points in distribution', R + ', card note, Ablations (corrected: evolve split, Gemini 3.5 Flash); Tables tab', ['+14.1, the abstract\'s "up to 14.1"', 'the +14.1 is the gain on the split the search was scored on']),
 ('+4.7 points across five out-of-distribution benchmarks', R + ', card (corrected: the best of five, mean 3.6)', ['+4.7 is the best of five out-of-distribution gains', 'gains 1.8, 4.7, 3.5, 3.7, 4.3; mean 3.60']),
 ('30% fewer policy tokens than unregularised evolution', R + ', card and How much to believe (corrected: Table 2 gives 36%)', ['36% fewer (the abstract says 30%)', 'the abstract\'s "30% fewer policy tokens" is 36% by Table 2']),
 ('Read the three numbers as one result; OOD gain about a third of the in-distribution gain, the honest shape of a generalisation claim', R + ', "The three numbers, read together" (corrected: different settings; within one setting the ratio is above one)', ['The three numbers, read together.', 'about a third of the in-distribution gain, the honest shape of a generalisation claim', 'so their ratio means nothing']),
 ('That the OOD gain is positive at all is what none of the earlier work established', R + ', Results and How much to believe (six of six positive; Meta-Harness also positive)', ['No held-out split regresses anywhere', 'The six-of-six pattern is the stronger evidence, but it is not unique to RRSI']),
 ('The token reduction says the regularisation is not bought with compute', R + ', "The three numbers" (corrected: still 55% more tokens than H0)', ['the regularisation is not bought with compute', 'RRSI\'s harness still uses 55% more tokens than']),
 ('A pruner that only removed cheap edits would improve the score by spending more', R + ', "The three numbers"', ['a pruner which only removed cheap edits would raise the score by spending more']),
 # connections
 ('SoL-Pi runs the same loop for cost rather than capability; roughly half of agent token traffic is harness overhead', R + ', Why it matters and Connections; Further reading', ['https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5', 'runs the same loop for cost rather than capability and finds roughly half of agent token traffic is harness overhead']),
 ('Between them a cost objective and a generalisation guard, the two things a self-modifying system needs before anyone should leave it running', R + ', Why it matters', ['which are the two things a self-modifying system needs before anyone should leave it running']),
 ('Agora and Dream-RSI differ in where the loop\'s memory lives, and neither measures generalisation', R + ', Connections; Further reading', ['https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900', 'https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54', "differ in where the loop's memory lives", 'neither measures generalisation']),
 ('Emergence World attacks a system of this shape', R + ', Connections; Further reading', ['https://app.notion.com/p/3e25c17b0d0d818fbffbc9e2ceab824b', 'attacks a system of this shape']),
 ('Integrated on Topic: agentic-harnesses', R + ', Connections', ['Integrated on', 'Topic: agentic-harnesses']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(html.unescape(c)) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-28)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"+14.1 points in distribution": the gain on the evolve split (the one the search was scored on), with Gemini 3.5 Flash; with the main policy the evolve gains are 6.0, 1.1, 4.9',
                         '"+4.7 across five OOD benchmarks": the best of five; the mean is 3.6',
                         '"30% fewer policy tokens": Table 2 gives 36%; 30% matches the released 2.69M tokens (29%)',
                         'OOD gain "about a third of the in-distribution gain": the two numbers come from different policies and domains; within one setting the OOD gain exceeds the evolve gain',
                         '"not bought with compute": RRSI still uses 55% more tokens than the unevolved harness, as the paper says',
                         'Pruner description: cost is policed by the acceptance rule; the pruner marks components with no positive gain in its window',
                         '"First evidence the gains survive leaving the benchmark": the paper cites concurrent work separating evolution from evaluation tasks'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
