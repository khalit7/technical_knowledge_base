"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, fetched 2026-10-03, last edited 2026-09-20) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (JIT-Agent), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Score a group of harnesses tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ['Makes harness construction a trained capability: factor any harness into (Memory, Planning, Action, Capability orchestration)', 'at 14.9-54.1% lower cost than fixed harnesses']),
 ('Topics property: agentic-harnesses, agentic-frameworks, rl', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7', 'https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "5 min read, +~45 min resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Guibin Zhang ... Shuicheng Yan (NUS and collaborators)', R + ', headline card (v2 adds Chuanrui Hu and Yafeng Deng, and EverMind AI and NTU)', ['Guibin Zhang', 'Leo Lu', 'Fangzhou Xie', 'Kang Zhu', 'Junhao Wang', 'Zhifei Xie', 'Zhaochen Yu', 'Zihang Liu', 'Zhongxiang Sun', 'Qiankun Li', 'Yue Liao', 'Heng Chang', 'Xiaobin Hu', 'Qibing Ren', 'Wangchunshu Zhou', 'Shuicheng Yan', 'National University of Singapore']),
 ('Date: 2026-08-26 (arXiv v1)', R + ', headline card (v2 of 3 September also given)', ['26 August 2026 (arXiv v1)']),
 ('Links: arXiv:2608.25593 (~45 min) and HTML', 'card and Further reading', ['https://arxiv.org/abs/2608.25593', 'https://arxiv.org/html/2608.25593v2', '(45 min)']),
 ('Added to the KB 2026-08-31', R + ', note under the nav', ['Added to the knowledge base on 2026-08-31']),
 # best resources
 ('Best resources: the paper (~45 min)', F, ['https://arxiv.org/html/2608.25593v2']),
 ('Read alongside StateM and Prime Agent; the three together are the current state of the harness-scaling argument', R + ', note under the nav', ['Read alongside', 'the three together were the state of the harness-scaling argument']),
 # problem
 ('Every result in the harness-scaling literature is a hand-built artifact (state machine, skill set, subagent topology) tuned against a benchmark; does not compose or transfer', R + ', Problem', ['every result in the harness-scaling literature is a hand-built artifact', 'a state machine, a skill set or a subagent topology', 'that does not compose and does not transfer']),
 ('"No fixed harness dominates across tasks", attributed to the paper\'s own ablation (ReAct wins some, Plan-and-Execute others, ReSum long-horizon search)', 'corrected: it is the paper\'s reading of Table 3\'s five production harnesses; no such ablation exists (Problem, correction box; How much to believe, point 4)', ['The paper has no such ablation', '"No fixed harness dominates" is its reading of', 'does not exist']),
 ('So the question: can harness construction be a learned, inference-time capability instead of a human craft', R + ', Problem', ['whether harness construction can be a learned, inference-time capability instead of a human craft']),
 # method
 ('Four-module protocol h = (M, P, A, F)', R + ', Idea', ['= (', 'Memory', 'Planning', 'Capability orchestration', 'Action']),
 ('M, Memory: compresses and curates interaction history into the working context view', R + ', Idea', ['turns the event history into the view the model sees']),
 ('P, Planning: local directives and subgoals', R + ', Idea', ['forms a local directive or sub-goal']),
 ('A, Action: control loop that updates state and emits the next action', R + ', Idea', ['updates the controller state and emits the next action']),
 ('F, Capability orchestration: selects and sequences tools, APIs and skills', R + ', Idea', ['picks which tools, APIs, MCP servers and skills are exposed']),
 ('The load-bearing idea: narrow enough to validate before execution, wide enough to express real harnesses', R + ', Idea', ['This is the load-bearing idea', 'validated before execution']),
 ('Archive seeded with 13 hand-written reference harnesses (ReAct, Plan-and-Execute, ReSum and others)', R + ', Idea (seed bank table)', ['re-implemented 13 published harnesses', 'Plan-and-Execute', 'ReSum', 'HarnessFactory']),
 ('A 27B model trained in three stages on Qwen3.6-27B', R + ', Training', ['Qwen3.6-27B', 'Three stages follow the life of a harness']),
 ('Stage 1 customisation: SFT on teacher harnesses that pass validation, then preference learning favouring reward without paying in latency or cost', R + ', Training and the stage diagram', ['JIT-Agent is fine-tuned on the accepted harnesses', 'higher reward and is no slower and no costlier', 'without paying for it in latency or cost']),
 ('Stage 2 repair: structured diagnostic (compile errors, interface mismatches, runtime failures); teacher patches; executable within two revisions; two-round cap restricts to locally recoverable failures', R + ', Training', ['compiler errors, interface mismatches, tool-call failures, runtime exceptions', 'become executable within two rounds', 'locally recoverable failures']),
 ('Stage 3 Evo-GDPO: candidates scored against incumbents in the archive; reward, latency and cost normalised separately; push the frontier rather than maximise a scalar', R + ', Training; ' + S, ['Evo-GDPO', 'incumbent', 'Normalise each channel separately', 'overtake the best one already in the bank']),
 ('Self-evolution at test time: archive B_n grows during streaming inference; candidate validated, retained only if it matches or exceeds the reward frontier and strictly improves latency or cost', 'corrected: strictly improves reward, latency or cost (Inference)', ['Streaming inference', 'misstates the rule slightly: a higher reward alone also qualifies']),
 ('Successful harnesses indexed by task type with observed metrics; later generations retrieve task-matched priors', R + ', Idea (bank) and Training (seeds matched to the task\'s type)', ['holds every retained harness with its task and observed reward, latency and cost', 'seeds matched to the task\'s type']),
 # results
 ('Nine benchmarks: deep research (BrowseComp-Plus, DeepSearchQA, xBench-DeepSearch), daily work (AgentIF-Oneday, PinchBench), planning (DeepPlanning-Shopping, -Travel), workspace (OfficeBench, OdysseyBench)', R + ', Results 1', ['BrowseComp-Plus', 'DeepSearchQA', 'xBench-DeepSearch', 'AgentIF-OneDay', 'PinchBench', 'DeepPlanning-Shopping', 'DeepPlanning-Travel', 'OfficeBench and OdysseyBench']),
 ('GLM-5.2: 74.1 to 81.8 average, +7.7, up to +20.2', R + ', card and Results 1; ' + T, ['74.1 → 81.8', '+7.7', '+20.2']),
 ('DeepSeek-V4-Flash: 66.7 to 75.5, +8.8', R + ', card and Results 1', ['66.7 → 75.5', '+8.8']),
 ('JIT-harnessed V4-Flash beats bare GPT-5.6 on DeepSearchQA (+9.1) and OdysseyBench (+4.3)', R + ', Results 1 (and the predict reveal: behind on average)', ['surpasses GPT-5.6 on DeepSearchQA (+9.1) and OdysseyBench (+4.3)']),
 ('Largest single gain +24.8 on DeepPlanning-Shopping, a constraint-tracking task; harness lift concentrates where state management is the bottleneck', R + ', Results 1', ['+24.8', 'sustained state management and constraint tracking', 'harness lift concentrates where state management is the bottleneck']),
 ('JIT-equipped systems rank first in 8 of 9 columns, at 14.9% to 54.1% lower cost than fixed harnesses', 'corrected: 8 of 9 holds (Table 2); the cost range comes from Table 3\'s three benchmarks only (Results 2)', ['eight of nine', '14.9% to 54.1%', 'these three benchmarks only']),
 # why it matters
 ('First attempt to make harness intelligence a trainable axis; economics: lift comes with cost reduction because a task-conditioned harness does not pay for machinery it does not need', R + ', Why it matters', ['the first attempt to make harness intelligence a', 'does not pay for machinery it does not need']),
 ('Practical consequence: harness becomes a per-task artifact you generate; changes what you cache, version and evaluate', R + ', Why it matters', ['per-task artifact you generate', 'what you cache, what you version and what you evaluate']),
 ('Caveat quote: production harnesses (Codex, Claude Code, DeepSeek harness) "expose substantially richer mechanisms than our four-module instantiation"', R + ', the Position box (v1 only; removed in v2)', ['expose substantially richer mechanisms than our four-module instantiation']),
 ('The generator writes in a deliberately impoverished language, so comparison to OpenCode and Claude Code is closer to parity than dominance', R + ', Why it matters', ['deliberately impoverished language', 'closer to parity than to dominance']),
 ('No analysis of repair-loop or evolution failure modes beyond the two-round cap', R + ', Why it matters', ['does not analyse failures of the repair loop or of evolution beyond the two-round cap']),
 # connections
 ('Prime Agent: mirror image (untrained model, rich harness vs trained builder, simple harness); neither has done both', R + ', Connections; ' + F, ['https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb', 'the mirror image', 'Neither has yet done both']),
 ('StateM: the hand-built harness JIT-Agent tries to automate; its versioned YAML runbook is roughly a hand-tuned (M, P, A, F) instance', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691', 'versioned YAML runbook is roughly a hand-tuned (M, P, A, F) instance']),
 ('Demystifying Agent Skills: F is the skills question; its 10% misapplication rate a plausible source of residual failures', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92', '10% skill-misapplication rate']),
 ('SA-MRPO: same multi-objective RL problem, frontier comparison vs saturation-aware reweighting', R + ', Connections', ['https://app.notion.com/p/3c65c17b0d0d81e38b0fe72f3daf44bc', 'saturation-aware reweighting']),
 ('Topic: agentic-harnesses (harness engineering); Topic: agentic-frameworks', R + ', Connections; ' + F, ['agentic-harnesses', '(harness engineering)', 'agentic-frameworks']),
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
           'corrected': ['"The paper\'s own ablation" showing no fixed harness dominates (ReAct, Plan-and-Execute, ReSum): there is no ablation; the phrase is the paper\'s reading of Table 3, whose five harnesses are Claude Code, Codex, OpenCode, Hermes and NanoBot',
                         '"At 14.9-54.1% lower cost than fixed harnesses" attached to all nine benchmarks: the cost comparison exists for DeepSearchQA, xBench-DS and AgentIF only, and may exclude JIT-Agent\'s own generation cost',
                         '"Enough for a harnessed V4-Flash to beat bare GPT-5.6": true on 5 of 9 benchmarks; on the nine-benchmark average it is 75.5 against 76.5',
                         'Bank retention "strictly improves latency or cost": the paper\'s rule is strictly better on reward, latency or cost',
                         'The production-harness caveat quote is v1\'s Position box, removed in v2',
                         'Evo-GDPO and the archive are presented as working; the only evidence for test-time evolution is one appendix figure (Figure 6) with no repeats, and nothing ablates the stages',
                         'Not in the old page: training harnesses for the DeepPlanning test cases\' own databases (520 of 2,852 released rows), and the released checkpoint is a distilled one, not the evaluated model'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
