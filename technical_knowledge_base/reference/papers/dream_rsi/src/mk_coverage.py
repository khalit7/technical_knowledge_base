"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-21) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (Dream-RSI), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Dream over a recorded tree tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ["Treat an agent's accumulated discovery history as a replay simulator over the search space already explored", 'competitive or better solution quality at substantially lower discovery cost across algorithm engineering, mathematical optimisation and GPU kernel engineering']),
 ('Topics property: rl, agentic-harnesses, llm-training-and-post-training', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e', 'https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "4 min read, +40m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Tong Zheng ... Yunsong Guo (17)', R + ', headline card', ['Tong Zheng', 'Xidong Wu', 'Zheng Zhang', 'Zhankui He', 'Chaoyi Zhang', 'Benjamin Coleman', 'Ruoqiao Wei', 'Di Bai', 'Haolin Liu', 'Rui Liu', 'Xue Wang', 'Yue Zhuan', 'Wang-Cheng Kang', 'Renkai Xiang', 'Heng Huang', 'Xinwu Cheng', 'Yunsong Guo']),
 ('arXiv 2609.14858, 14 September 2026', R + ', headline card', ['arXiv 2609.14858', '14 September 2026']),
 ('12 pages, cs.CL', R + ', headline card', ['arXiv cs.CL, 12 pages']),
 ('"The most-upvoted paper of the week on Hugging Face"', 'corrected: R, note under the nav (250 upvotes, sixth of its week and fourth of its day on 3 October 2026; the original claim marked unconfirmed)', ['250 upvotes', 'sixth in its week', 'most-upvoted paper of the week', 'unconfirmed now']),
 # problem
 ('Discovery loops (propose, evaluate, learn) are bounded by evaluation cost', R + ', Problem', ['proposes a candidate', 'evaluates it, learns from the result', 'costs a model call plus an evaluation']),
 ('Compiling and benchmarking a GPU kernel, or running an optimisation to convergence, is expensive', R + ', Problem', ['compiling and benchmarking a GPU kernel, or running an optimisation to convergence']),
 ('Every improvement to the exploration policy normally costs a fresh round of evaluations', R + ', Problem', ['each costs a long online rollout to find that out', 'Judging a policy means watching it steer a whole discovery run']),
 # mechanism
 ('The loop has already paid for many evaluations; their record is a model of the region of search space already visited', R + ', Idea', ['the history you already paid for is a simulator', 'exact where the record goes and silent everywhere else']),
 ('Builds a replay simulator from the accumulated history and improves the exploration policy against it: cheap off-policy feedback, no new online evaluations', R + ', Idea and Method', ['No agent call, no evaluation', 'each policy version is replayed on every recorded tree', 'off-policy']),
 ('A lightweight orchestration layer over the agent handles the propose, dream, refine cycle', 'corrected: R, Idea (the loop is online explore, build the simulator, dream, redeploy; only the policy code changes, the agent is untouched)', ['1 Online explore', '2 Build the simulator', '3 Dream', '4 Redeploy', 'Only the policy\'s code changes']),
 ('Quote: "accumulated discovery history can serve as a replay simulator over the realized search space"', R + ', Idea', ['accumulated discovery history can serve as a replay simulator over the realized search space']),
 # results
 ('Demonstrated in algorithm engineering, mathematical optimisation and GPU kernel engineering', R + ', Setup and sections 4.1 to 4.3', ['Algorithm engineering: a faster Lasso path solver', 'Mathematical optimisation: three open problems', 'GPU kernel engineering: four KernelBench tasks']),
 ('Competitive with or better than online baselines at substantially lower discovery cost', R + ', results sections and How much to believe (judged)', ['competitive or improved', 'believe that it can cut calls']),
 ('"Reports the pattern rather than a single headline number", a limitation against the harness papers', 'corrected: R, headline card and results (the paper prints 162×, 1.7×, 50×, 2.43×, 1.79×, 2.09×, 1.44×; the limitation is that each is one run)', ['162 times more than 317', '2.43× and 1.79×', '2.09× and 1.44×', 'One run per arm, no error bars']),
 # limit
 ('A replay simulator is only valid inside the region the history covers', R + ', How much to believe, The limit', ['A replay simulator is only valid inside the region the history covers']),
 ('So it sharpens exploitation of a mapped space rather than expanding exploration into an unmapped one', R + ', The limit; ' + S, ['sharpens how a mapped space is exploited', 'cannot by itself push exploration into unmapped territory']),
 ('Opposite failure mode from Agora: population converged prematurely, a human restored diversity', R + ', The limit; ' + F, ['the population converged prematurely and a human had to restore diversity', 'https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900']),
 ('Both point at the same risk: the cheap signal is always the one describing where you have already been', R + ', The limit', ['the cheap signal is always the one that describes where you have already been']),
 # connections
 ('Third of the week\'s three auto-research papers, with Agora and SoL-Pi', R + ', Connections; ' + F, ['Third of the week\'s three auto-research papers', 'https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5']),
 ('GPU kernel engineering puts it next to Topic: cuda-and-gpu-programming', R + ', Connections; ' + F, ['https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1', 'Topic: cuda-and-gpu-programming']),
 ('Next to Phi-Bench\'s finding that kernel and hardware work is where frontier models score worst', R + ', Connections; ' + F, ['https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f', 'kernel and hardware work is where frontier models score worst']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"The most-upvoted paper of the week on Hugging Face": on 3 October 2026 it had 250 upvotes, sixth in week 2026-W38 and fourth on 15 September; unconfirmed for the date the summary was written',
                         '"A lightweight orchestration layer ... handles the propose, dream, refine cycle": the paper\'s loop is online explore, construct the replay simulator, dream-based policy improvement, redeploy; the orchestration layer makes exploration programmable and a separate development agent rewrites the policy',
                         '"Reports the pattern rather than a single headline number": it prints several headline ratios (162×, 1.7×, 50×, 2.43×, 1.79×, 2.09×, 1.44×); the real limitation is one run per setting, ratios chosen at favourable points, and no error bars',
                         '"Competitive or better" quality: on autocorrelation Dream-RSI is beaten by its own fixed baseline, and the Gemini-3.1-Pro Lasso solver is faster than the baseline on only 1 of 6 datasets',
                         'Not in the old page: the SimpleTES Lasso row is copied from SimpleTES\'s own paper and was timed on another machine; the cost count leaves out the development agent; the objective in Appendix B.2 differs from Eq. 1; no code or traces are released'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
