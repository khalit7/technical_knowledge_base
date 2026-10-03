"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-20) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (HarnessDev), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Replay the evolution runs tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ['Moves evaluation from task performance to infrastructure construction: Creation (build an execution system from minimal components and sample cases) then Evolution (refine it from feedback)', 'stay strongly dependent on which model executes the harness']),
 ('Topics property: agentic-harnesses, agentic-frameworks, benchmarks', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "6 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Yuhao Wu ... Wenxuan Zhang (19 names)', R + ', headline card', ['Yuhao Wu', 'Jingyuan Zhang', 'Jiajun Shi', 'Xinping Lei', 'Qingshui Gu', 'Yuxuan Zhang', 'Zexuan Wang', 'Chen He', 'Chen Huang', 'Maojia Song', 'Zhiyuan Zeng', 'Shaowen Wang', 'Jinkai Liu', 'Yunfeng Shi', 'Jiaheng Liu', 'Shen Yan', 'Wenhao Huang', 'Ge Zhang', 'Wenxuan Zhang']),
 ('Date: 2026-09-01', R + ', headline card', ['1 September 2026 (arXiv v1']),
 ('Links: arXiv 2609.01437 (45 min)', 'card and Further reading', ['https://arxiv.org/abs/2609.01437', '(45 min)']),
 # best resources
 ('Best resources: the paper itself (45 min); no third-party writeup of quality exists yet', F + ' (the paper, the project page and related benchmarks now listed)', ['https://arxiv.org/html/2609.01437v1', 'https://self-developing-agents.github.io/']),
 ('Summary was from the abstract and results; refresh once code or a proper analysis lands', R + ', note under the nav (now built from the full paper) and What it takes (code still not released)', ['The first summary was written from the abstract and results only', 'Nothing is released yet']),
 # problem
 ('Every harness-scaling result of the last month: the wrapper moves scores by tens of points on identical weights (Prime Agent, StateM, JIT-Agent, WikiSkill)', R + ', Problem', ['the wrapper moves benchmark scores by tens of points on the same weights', 'Prime Agent', 'StateM', 'JIT-Agent', 'WikiSkill']),
 ('All evaluate the harness by the task score it produces', R + ', Problem', ['All of them judge a harness by the task score it produces']),
 ('Can a model build the wrapper itself, and how good compared to something a team spent a year on?', R + ', Problem', ['can a model build the harness itself', 'something a team spent a year on']),
 ('Task score cannot answer it: a good score confounds the harness with the executing model', R + ', Problem', ['Task score alone cannot answer that, because a good score mixes up the harness with the model running inside it']),
 # method
 ('A benchmark whose unit of evaluation is the infrastructure, not the task', R + ', Idea', ['HarnessDev makes the runnable harness the thing being evaluated']),
 ('Creation: given minimal components and a handful of sample cases, assemble a working execution system', R + ', Idea and Method (the weak seed, one to three development cases)', ['can a model build an effective harness from a weak but runnable seed', 'one to three development cases']),
 ('Evolution: iteratively refine that system using performance feedback from its own runs', R + ', Idea and Method', ['can it improve its own existing harness from downstream execution feedback']),
 ('Produced harness run on held-out downstream benchmarks', R + ', Idea', ['task success on held-out benchmarks']),
 ('Two axes at once: capability (task success) and efficiency (execution-token cost), the axis that stops brute force', R + ', Idea', ['capability', 'efficiency', 'Reporting both stops a harness from winning by brute force']),
 ('Six creator LLMs, four domains, five downstream benchmarks, 2,207 unique instances', R + ', Method; card', ['Six creators, five benchmarks, four domains', '2,207 unique instances']),
 ('Method detail at abstract granularity; component inventory and feedback signal not reproduced', 'corrected: the page now carries the seed, the six modules E/T/C/S/L/V (Method) and the feedback signal (the pair score, Eq. 2)', ['H = ⟨E, T, C, S, L, V⟩', '½ (SWE-100 + Terminal-89)']),
 # results
 ('Headline is a split by domain rather than a single number', R + ', Result 1', ['quality varied sharply by task family']),
 ('Generated harnesses substantially behind mature human references on code and search', R + ', Result 1', ['stay substantially behind on code', 'search and research']),
 ('Match or exceed the selected references on writing and ML experimentation', R + ', Result 1 (with the correction that this is the best creators, against references running the same or a similar model)', ['match the reference on short-form writing', 'exceed it on machine-learning experimentation', '"Match" and "exceed" are about the best creators.']),
 ('Evolution the weak phase: improvements unstable across iterations, limited transfer to unseen tasks', R + ', Result 4; Replay tab', ['Evolution is not monotonic', 'On the 630 held-out tasks the same declared versions improved by only +1.43 to +4.44']),
 ('Results strongly dependent on which model executes the harness; a harness cannot be scored in isolation from the policy that runs it', R + ', Result 2', ['a harness cannot be scored in isolation from the model that runs it', 'The runtime binding matters most.']),
 # why it matters
 ('Supplies the missing measuring instrument for a programme with four competing strategies and no way to compare the construction step', R + ', Why it matters', ['four competing strategies (Prime Agent, StateM, JIT-Agent, WikiSkill) and no way to compare how harnesses get built']),
 ('Domain split as diagnosis: human references win where they encode years of domain-specific tooling (code, search); generated compete where general agent structure is most of a harness; predicts where hand-built harnesses keep their advantage', R + ', Why it matters (kept, then weakened by the executor confound)', ['human references win where the harness encodes years of domain tooling (code, search)', 'general agent structure is most of what a harness is', 'That predicts where hand-built harnesses keep their advantage', 'so the split is a hypothesis, not a finding']),
 ('Evolution unstable and non-transferable: a direct check on Prime Agent\'s Continual Harness (versions its own prompts and skills); refinement does not reliably compound', R + ', Why it matters', ["Prime Agent's Continual Harness versions its own prompts and skills across trajectories", 'such refinement does not reliably compound']),
 # connections
 ('Prime Agent and JIT-Agent in Papers and the harness-scaling section of Topic: agentic-harnesses: the benchmark those two needed', R + ', Connections; Further reading', ['https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb', 'https://app.notion.com/p/3cd5c17b0d0d81148227fbd67dc4b3ee', 'HarnessDev is the benchmark those two needed and did not have']),
 ('JIT-Agent trains a model to emit a harness per task, parity with production harnesses in a much poorer protocol language; HarnessDev measures that gap, domain-dependent', R + ', Connections (corrected: domain or reference model)', ['reports parity with production harnesses in a much poorer protocol language', 'finds it depends on the domain, or on the reference\'s model']),
 ('StateM: opposite pole, human-written state machine; lag where tooling deepest consistent with StateM\'s win from encoded domain procedure', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691', 'the opposite pole, a human-written state machine that constrains the agent', "consistent with StateM's win coming from encoded domain procedure"]),
 ('Demystifying Agent Skills and Repo-To-Skill: skills are a harness component; Repo-To-Skill the supply side', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92', 'https://app.notion.com/p/3d45c17b0d0d818bacfeda8a40caddb2', 'skills are one of the components a harness assembles, and Repo-To-Skill is the supply side of the same problem']),
 ('Terminal-Universe: environments a harness-building model would need to practise in', R + ', Connections', ['https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31', 'supplies the environments a harness-building model would need to practise in']),
 ('2026-09-07 ARC Prize result on Topic: benchmarks: existence proof that a provider-side harness beats any third-party harness; bounds Creation for models with opaque state', R + ', Connections', ['an existence proof that a provider-side harness can beat any harness a third party is able to construct', 'bounds what HarnessDev\'s Creation phase can reach for models with opaque state']),
 ('Harness architecture playbook (stencil.so) filed on Topic: agentic-harnesses on 2026-09-07: unavoidable complexity belongs in core abstractions, not extensions; one hypothesis for the lag', R + ', Why it matters; Further reading', ['https://stencil.so/blog/harness-playbook', "unavoidable complexity belongs in a harness's core abstractions rather than in extensions, which is one hypothesis for why generated harnesses lag where domain tooling runs deepest"]),
 ('Tech news issue that covered it (2026-09-07)', R + ' note under the nav; Further reading', ['https://app.notion.com/p/3d45c17b0d0d81dca858e1cec21d3314']),
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
           'corrected': ['"Match or beat on writing and ML experimentation": true for the best one or two creators only, and those references ran the same or a similar model (Opus 4.8, Gemini 3.1), while the code and search references ran newer models (Claude Fable 5, GPT-5.6 Sol): Result 1 and How much to believe',
                         '"Evolution gains transfer poorly to unseen tasks": the five self-runtime declarations all improved on the 630 held-out tasks (+1.43 to +4.44, mean +3.11); the regressions are under the fixed Gemini runtime; and "held-out" is the same SWE-Pro split: Result 4 and How much to believe',
                         '"Method detail at abstract granularity": the page now carries the seed, the six modules, both protocols and the feedback signal (Method)',
                         'The domain split read as a diagnosis (domain tooling depth) is confounded with the reference models; kept as a hypothesis (Why it matters)',
                         'JIT-Agent connection: the gap HarnessDev finds depends on the domain or on the reference\'s model, not on the domain alone (Connections)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
