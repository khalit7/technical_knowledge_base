"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Numbers drawn by script are checked through
the data they come from (tables.json and recompute.json are embedded in the page).
The item list below is this paper's own, written from src/live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Replay the paired run tab', 'Tables tab', 'Further reading tab'
C = [
 # header
 ('Reading time line "10 min read, +~1h 20m resources"', 'dropped: replaced by the build-computed reading time and resources total (more resources now)', ['min to read', 'of resources']),
 ('Authors: Jiang, Huang, Xing, Wu, Gao, Cao, Wang, Liu, Li', R + ', headline card', ['Zhiyuan Jiang', 'Fangrui Huang', 'Hanwen Xing', 'Xander Wu', 'Yipeng Gao', 'Rui Cao', 'Mengdi Wang', 'Shilong Liu', 'Yijiang Li']),
 ('Labs: Princeton, UC San Diego, Stanford, USC, Johns Hopkins', R + ', headline card', ['Princeton, UC San Diego, Stanford, USC, Johns Hopkins']),
 ('Date: August 2026 (arXiv v1 2026-08-14)', R + ', headline card', ['August 2026 (arXiv v1, 14 August 2026']),
 ('Links: arXiv 2608.14036 (~45 min), PDF (same paper)', 'card and Further reading', ['https://arxiv.org/abs/2608.14036', 'https://arxiv.org/pdf/2608.14036v1', '(45 min)']),
 ('Added to KB: 2026-08-24', R + ', note under the nav (with the tech news issue that covered it)', ['Added to the knowledge base on 24 August 2026', 'https://app.notion.com/p/3c65c17b0d0d81ca8c8af3c2fc0c3ced']),
 # resources
 ('Anthropic engineering: Equipping agents for the real world with Agent Skills (~15 min): canonical SKILL.md description, progressive disclosure, folder layout, when to write one', F + '; Problem', ['https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills', 'progressive disclosure, the folder layout, and when to write a skill', '(15 min)']),
 ('anthropics/skills (~20 min): public skill repository the paper cites as its reference skill-usage protocol; what production skills contain', F + '; What it takes', ['https://github.com/anthropics/skills', 'the public skill repository the paper cites as its reference skill-usage protocol', 'what production skills actually contain']),
 # problem
 ('Skills = SKILL.md-style packaged procedural knowledge, popularised by Anthropic, used across Claude Code, Codex, Gemini CLI', R + ', Problem', ['Anthropic popularised the format', 'Claude Code, Codex and Gemini CLI all load skills this way']),
 ('Usually evaluated only by aggregate task success: says skills matter, not why', R + ', Problem', ['Skills are usually judged by aggregate task success', 'That says skills matter but not why']),
 ('Does not reveal behaviour change, which parts get stabilised, why same skill helps one task and hurts another, whether gains come from procedure vs outcome labels, retrieval quality, framework coupling', R + ', Problem list', ['what changes in the agent\'s behaviour when a skill is loaded', 'which parts of execution get stabilised', 'why the same skill helps one task and hurts another', 'outcome labels, retrieval quality or coupling to one framework']),
 ('Ask when skills help, why they work, where they fail; skill use as controlled transformation of prior experience, not black-box add-on', R + ', Problem "The question"', ['when do skills help, why do they work, and where do they fail?', 'controlled transformation of prior agent experience, not as a black-box prompt add-on']),
 # method
 ('Successful and failed raw trajectories collected in fixed Docker environments', R + ', Idea and Method; Figure 1 caption content', ['some successful and some failed', 'kept tasks whose raw runs both succeeded and failed']),
 ('Fixed-budget composition grid 5s0f through 0s5f', R + ', Method', ['six fixed-budget mixtures of five trajectories: 5s0f (five successes, no failures), 4s1f, 3s2f, 2s3f, 1s4f, 0s5f']),
 ('Workflow Memory = cleaned procedural traces appended directly; Skill = same workflows distilled into SKILL.md', R + ', Idea', ['cleaned and structured but keeping their procedural flow, appended to the task instruction', 'distilled by a model into one standardised']),
 ('Three arms Raw / Workflow Memory / Skill on matched tasks; experience constant, only representation varies', R + ', Idea', ['Both are compared with Raw, the agent with no prior experience', 'any difference between them is the packaging, not the experience']),
 ('No-hint variant removes success/failure annotations during skill creation (RQ2)', R + ', Method and Result 3; Appendix B.2 toggle', ['The no-hint variant hides the success and failure labels from the skill creator only']),
 ('Skills placed in environment as reusable resources, not inlined, following standard protocol', R + ', Problem', ['placed in the execution environment as reusable procedural resources rather than fully incorporated into the initial context']),
 ('Setups: Codex + GPT-5.3-Codex and Gemini CLI + Gemini-3.1-Pro-Preview', R + ', Method', ['Codex + GPT-5.3-Codex and Gemini CLI + Gemini-3.1-Pro-Preview']),
 ('Benchmarks: Terminal-Bench 2.0 (89), Terminal-Bench-Pro (200-task public split), SkillsBench (86 with task-skill ground truth)', R + ', Method', ['Terminal-Bench 2.0 (89 tasks)', 'the 200-task public split of Terminal-Bench-Pro', 'SkillsBench (86 tasks in 11 domains, with native task-to-skill annotations)']),
 ('Harbor evaluation workflow, n = 5 trials per task', R + ', Method', ["Harbor's evaluation workflow, n = 5 trials per task"]),
 ('RQ3: artifacts built in Codex evaluated in Gemini CLI against Gemini Raw', R + ', Method and Result 3', ['Artifacts built from Codex trajectories are evaluated in Gemini CLI against Gemini\'s own Raw baseline']),
 ('8,135 trial records normalised into one manifest (7,837 with transcripts)', R + ', Method', ['8,135 trial records normalised into one manifest, 7,837 of them with transcripts']),
 ('Open coding over 240 sampled trajectories yields 238 valid unique labels', R + ', Method', ['Open coding of 240 stratified trajectories', '238 valid unique labels came back']),
 ('Merged by two-round batched LLM induction into 3 categories, 12 modes', R + ', Method', ['A two-round batched induction merges them', 'It produced 12, in 3 categories']),
 ('SC1 guided success: skill-guided, workflow-guided, autonomous', R + ', Method', ['SC1, guided success:', 'skill-guided, workflow-guided, autonomous']),
 ('SC2: env/infrastructure, output-format/schema mismatch, background-service lifecycle, shell corruption, algorithmic logic error, static verification without runtime', R + ', Method', ['SC2, execution and verification failures:', 'environment or infrastructure, output format or schema mismatch, background-service lifecycle, shell corruption, algorithmic logic error, static verification without runtime']),
 ('SC3: timeout/budget exhaustion, skill guidance misapplied or ignored, capability/safety limit', R + ', Method', ['SC3, invocation and boundary failures:', 'timeout or budget exhaustion, skill guidance misapplied or ignored, capability or safety limit']),
 ('Judge Claude Sonnet 4.6, tools disabled, fixed transcript budgets', R + ', Method', ['by Claude Sonnet 4.6, tools and session memory disabled, with fixed transcript budgets']),
 ('Human check over 714 trajectory-label pairs confirms all labels', R + ', Method', ['three supporting trajectories (714 checks), all confirmed']),
 ('Human vs LLM aggregation 95.8% exact agreement, Cohen kappa 0.952', R + ', Method', ['95.8% of the time, Cohen\'s κ = 0.952']),
 ('Unit = paired triple (raw, workflow, skill same task): 528 triples, 1,584 arm-level assignments', R + ', Method', ['paired triple', 'There are 528', 'giving 1,584 arm-level labels']),
 ('Mechanism labels procedural_anchor, knowledge_injection, failure_warning, none, counterproductive', R + ', Method', ['procedural_anchor, knowledge_injection, failure_warning, none or counterproductive']),
 ('RQ4: ground-truth skill plus k-1 real distractors (random, similar, dissimilar), k in {5,10,20,50,100}', R + ', Method', ['ground-truth skill plus k − 1 real distractors, k ∈ {5, 10, 20, 50, 100}, drawn three ways: random, semantically similar (embedding near-neighbours) or dissimilar']),
 ('Three independent arms: embedding retrieval with Qwen3-Embedding-0.6B; explicit agent selection without execution; full-pool real execution with parsed skill use plus verifier outcome', R + ', Method', ['embedding retrieval with Qwen3-Embedding-0.6B', 'the agent explicitly selects skills without running the task', 'the full pool is placed in the environment, the task runs']),
 ('Outputs never passed between arms; offline identification and execution-time use measured separately', R + ', Method', ['Outputs are never passed between arms']),
 # results
 ('Oracle-status success: Skill 61.9 vs Raw 59.1 vs Workflow Memory 55.9', R + ', Result 1; Tables tab Table 9', ['61.9% for Skill (327 of 528), 59.1% for Raw (312) and 55.9% for Workflow Memory (295)']),
 ('Robust paired effect Skill over WM +6.06 points, 95% bootstrap CI [+0.76, +11.36]', R + ', card, Result 1', ['+6.06 points, 95% bootstrap interval [+0.76, +11.36]']),
 ('Same trajectories, different packaging; representation itself is doing the work', R + ', Result 1', ['Same trajectories, different packaging: the paper\'s reading is that representation itself is doing the work']),
 ('Compact hints: instruction-derived short plan 47.7%, workflow-derived test-first template 59.2%, below skill 79.2 on same TB2 subset; gain not just any short procedural hint', R + ', Result 1', ['short plan of three to five steps reaches 47.7%', 'test-first template 59.2%', 'Skill 79.2%', 'Not just any short hint']),
 ('procedural_anchor 65.7% of skill mechanism labels vs 4.5% knowledge_injection', R + ', card, Result 1', ['procedural_anchor accounts for 65.7% of skill mechanism labels, knowledge_injection for 4.5%']),
 ('Skills stabilise action (setup order, tool sequences, intermediate checks, known pitfalls) rather than supply missing facts', R + ', Result 1', ['Skills stabilise action (setup order, tool sequences, intermediate checks, known pitfalls) rather than supply missing facts']),
 ('environment_infrastructure_failure 5.3% raw to 0.2% skill', R + ', Result 2', ['environment_infrastructure_failure: 5.3% raw, 1.7% workflow, 0.2% skill']),
 ('output_format_schema_mismatch 7.4 to 3.2', R + ', Result 2', ['output_format_schema_mismatch: 7.4% to 3.2%']),
 ('background_service_lifecycle_failure 2.7 to 0.8', R + ', Result 2', ['background_service_lifecycle_failure: 2.7% to 0.8%']),
 ('algorithmic_logic_error and static-verification failures persist; skills do not fix reformulation or runtime verification', R + ', Result 2', ['algorithmic_logic_error stays at 8.3%, 11.0% and 7.4%', 'static_verification_without_runtime at 12.5%, 12.5% and 11.7%', 'Skills do not repair a wrong algorithm']),
 ('skill_guidance_misapplied_or_ignored 10.0% of skill-arm cases vs 0.8 raw: present and plausible but applied mechanically, out of context, stale assumptions', R + ', Result 2', ['skill_guidance_misapplied_or_ignored is 10.0% of skill-arm labels against 0.8% raw', 'applies it mechanically, misses a condition, or carries over assumptions that no longer hold']),
 ('Workflow memory fails by process overload: timeout 10.6% vs 4.4 skill vs 1.7 raw; verbose traces carry failed branches and debugging noise', R + ', Result 2', ['Workflow memory fails by overload', 'timeout_budget_exhaustion is 10.6% of workflow runs, against 4.4% with skills and 1.7% raw', 'failed branches and debugging noise']),
 ('Outcome labels: success-only pools barely hurt without annotations; mixed pools gap grows; Gemini TB-2 3s2f 0.7462 vs 0.4000', R + ', Result 3 (with the 5s0f Gemini qualification)', ['0.7462 with labels against 0.4000 without', 'has little effect when the source pool contains only successful trajectories']),
 ('Labels guide distillation about what to keep', R + ', Result 3', ['Labels guide what the distillation keeps']),
 ('Transfer works: Codex-built skills improve Gemini CLI over its Raw and beat transferred workflow memory; distillation more portable', R + ', Result 3', ['Skills distilled from Codex trajectories improve Gemini CLI over its own Raw baseline', 'beat transferred Workflow Memory', 'the more portable representation']),
 ('Retrieval: embedding top-1 88.3 to 76.9 as pools grow 5 to 100', R + ', Result 4', ['embedding top-1 precision falls from 88.3% to 76.9%']),
 ('Agent selection 70.0 to 63.7', R + ', Result 4', ['explicit agent selection from 70.0% to 63.7%']),
 ('Parsed actual-use precision 29.6 to 3.3', R + ', card, Result 4', ['parsed actual-use precision collapses from 29.6% to 3.3%']),
 ('Downstream success roughly flat 36.4 to 39.3 averaged', R + ', card, Result 4', ['yet success moves from 36.4% to 39.3%']),
 ('Similar distractors main stressor: top-1 similar 70.5 at k=5 to 53.4 at k=100 vs random 97.7 to 84.1', R + ', Result 4', ['Embedding top-1 on similar pools falls from 70.5% at k = 5 to 53.4% at k = 100, against 97.7% to 84.1% for random']),
 ('Exact ground-truth invocation neither sufficient nor necessary: succeed with related non-GT skills, fail with right skill in hand', R + ', Result 4', ['exact ground-truth invocation is neither sufficient nor necessary', 'agents succeed with related non-ground-truth skills and fail with the right one in hand']),
 # why it matters
 ('First mechanistic account of why SKILL.md works; informs writing and managing skills for Claude Code', R + ', Why it matters', ['It is the first mechanistic account of why the SKILL.md pattern works', 'how to write and manage skills for harnesses like Claude Code']),
 ('Write skills as procedural anchors (setup sequences, checklists, verification steps, pitfalls), not fact sheets', R + ', What it takes (practical reading)', ['write skills as procedural anchors (setup sequences, checklists, verification steps, pitfalls), not fact sheets']),
 ('Distil aggressively rather than paste raw transcripts; verbose traces cause timeouts', R + ', What it takes', ['distil rather than paste raw session transcripts into memory, since verbose traces measurably cause timeouts']),
 ('Keep success/failure labels attached when generating from mixed experience', R + ', What it takes', ['keep success and failure labels attached when generating skills from mixed experience']),
 ('Expect skills to transfer across harnesses', R + ', What it takes', ['expect skills to transfer across harnesses']),
 ('Worry less about perfect retrieval than confusable near-duplicates and agent judgment applying a skill', R + ', What it takes', ['worry less about perfect retrieval than about confusable near-duplicate skills in the library']),
 ('Reframes evaluation for self-evolving agents: pass rates hide trade of execution failures for misapplication; lifecycle-level evaluation (generate, retrieve, invoke, adapt)', R + ', Why it matters', ['aggregate pass rates hide that skills trade execution-layer failures for a new class of misapplication failures', 'lifecycle-level evaluation (generate, retrieve, invoke, adapt)']),
 # connections
 ('ReAct (2022-10): acting paradigm; skills on top as reusable procedural memory', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8', 'skills sit on top as reusable procedural memory']),
 ('Agent Workflow Memory (Wang et al., 2024, 2409.07429): contrast arm', R + ' Connections; Further reading', ['https://arxiv.org/abs/2409.07429', 'the direct-workflow-memory representation used as the contrast arm']),
 ('SkillsBench (2602.12670) and Terminal-Bench (2601.11868): benchmarks; SkillsBench supplies ground truth for retrieval', R + ' Connections', ['https://arxiv.org/abs/2602.12670', 'https://arxiv.org/abs/2601.11868', 'SkillsBench supplies the task-to-skill ground truth for the retrieval study']),
 ('SWE-Skills-Bench (2603.15401): marginal utility in real SWE, success-rate level; this paper adds mechanism', R + ' Connections', ['https://arxiv.org/abs/2603.15401', 'this paper adds the mechanism layer']),
 ('Anthropic Agent Skills (2025): format and protocol under study', R + ' Connections', ['the skill format and usage protocol under study']),
 ('Topics: agentic harnesses, agentic frameworks, benchmarks, evaluation and LLM judges (validated judge pipeline reusable)', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7', 'https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546', 'the validated LLM-judge taxonomy pipeline is a reusable pattern']),
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
           'corrected': ['Outcome labels "barely hurt" with success-only pools: true for Codex, not for Gemini (5s0f: 0.7923 against 0.4231 on Terminal-Bench-2); and no-hint beats labelled skills in four Terminal-Bench-Pro cells (Result 3)',
                         '"Same trajectories, different packaging; representation itself is doing the work": kept as the paper\'s reading, with the sign reversal on Gemini Terminal-Bench-Pro and the single-trial, Codex-only basis of the +6.06 (How much to believe)',
                         'Procedural anchoring is not specific to skills: the source draft gives 72% for workflow memory (How much to believe)',
                         'The tech news issue described the paper as about where skills "stop transferring"; transfer is the part that worked (note under the nav)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
