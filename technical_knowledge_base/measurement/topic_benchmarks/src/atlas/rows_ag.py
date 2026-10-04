"""Atlas rows: agentic benchmarks, work evaluations and benchmarks whose subject is the surrounding system. Owner 'ag'."""
from lib import R, S, E, I, X, C, AX, AA, EP, GRID

S('tbench', 'Terminal-Bench leaderboards (tbench.ai)', 'https://www.tbench.ai/leaderboard', '2026-10-04', 'leaderboard', read='2026-10-04')
S('tb4news', 'Terminal-Bench 4.0 announcement', 'https://www.tbench.ai/news/terminal-bench-4-0', '2026-09', 'blog')
S('tbsci', 'Terminal-Bench-Science announcement', 'https://www.terminal-bench-science.ai/announcement', '2026-08', 'blog')
S('rdi', 'Berkeley RDI, How We Broke Top AI Agent Benchmarks', 'https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/', '2026-04', 'analysis')
S('osv', 'OSWorld-Verified leaderboard (os-world.github.io)', 'https://os-world.github.io/', '2026-10-04', 'leaderboard', read='2026-10-04')
S('osw2', 'OSWorld 2.0 official leaderboard (XLANG)', 'https://osworld-v2.xlang.ai/', '2026-10-04', 'leaderboard', read='2026-10-04')
S('hypertau', 'Sierra, Hyper-tau-bench: evaluating agents that build agents', 'https://sierra.ai/blog/hyper-t-bench-evaluating-agents-that-build-agents', '2026-09', 'blog')
S('molepage', 'MOLE (knowledge base paper page)', 'https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9', '2026-09-07', 'kb')
S('ewpage', 'Emergence World (knowledge base paper page)', 'https://app.notion.com/p/3e25c17b0d0d818fbffbc9e2ceab824b', '2026-09-15', 'kb')
S('hdpage', 'HarnessDev (knowledge base paper page)', 'https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f', '2026-09-01', 'kb')
S('solpage', 'SoL-Pi (knowledge base paper page)', 'https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5', '2026-09-17', 'kb')
S('statempage', 'StateM (knowledge base paper page)', 'https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691', '2026-08-15', 'kb')
S('primepage', 'Prime Agent (knowledge base paper page)', 'https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb', '2026-08-24', 'kb')

R(id='tb1', n='Terminal-Bench 1.0 (Core)', fam='agent', yr=2025, by='Stanford and Laude Institute', paper='tbench',
  me='End-to-end tasks in a terminal sandbox', fmt='Docker container, agent gets a shell; checker verifies the end state', met='% tasks passed',
  it=I('80 tasks', 'ag', n=80),
  gr=['exec'], cd=['none'], st='retired',
  why='Saturated within months and replaced by 2.0; scores are not comparable with later versions.',
  own='ag', old='Terminal-Bench 1.0/2.0/2.1/4.0', rel=['tb2', 'tb4'])

R(id='tb2', n='Terminal-Bench 2.0 / 2.1', fam='agent', yr=2025, by='Stanford and Laude Institute', paper=AX('2601.11868'),
  me='Hard, realistic command-line tasks', fmt='Docker container with a shell, run through the Harbor harness', met='% tasks passed (mean over trials)',
  it=I('89 tasks', AX('2601.11868'), n=89, q='composed of 89 tasks'),
  gr=['exec'], cd=['none'], st='saturated',
  ev=[EP('terminalbench_external.csv', 'gpt-5.5_unknown', 'Terminal-Bench 2.0 leaderboard, NexAU-AHE agent scaffold')],
  why='Harness-tuned agents reach the high 80s to mid 90s, and the maintainers replaced it with 4.0 in September 2026.',
  iss=[X('A harness alone moved one model from about 82% to 95.3% raw on 2.1 (StateM); its leaderboard submission was closed unmerged after 13 judge flags, four of them harness cheating.', 'statempage'),
       X('Agent code runs where the checker later looks, so tests can be overwritten (Berkeley RDI).', 'rdi')],
  own='ag', old='Terminal-Bench 1.0/2.0/2.1/4.0', rel=['tb1', 'tb4', 'tb_science'])

R(id='tb4', n='Terminal-Bench 4.0', fam='agent', yr=2026, by='Stanford and Laude Institute', paper='tb4news',
  me='Command-line tasks with recalibrated per-task time, CPU and memory', fmt='Docker container with a shell', met='% tasks passed',
  it=I('Task count after fixes and removal of saturated tasks (see announcement)', 'tb4news'),
  gr=['exec'], cd=['none'], st='active',
  ev=[GRID('tb4', note='Artificial Analysis run inside Intelligence Index v4.3, with its own harness. Lab figures run their own scaffolds and differ by several points.')],
  why='The best independent run is in the low 60s; the version reset gave it headroom again.',
  iss=[X('Resource limits are part of each task, so 2.x and 4.0 are not comparable even on tasks that survived.', 'tb4news')],
  own='ag', old='Terminal-Bench 1.0/2.0/2.1/4.0', rel=['tb2', 'tb_science'])

R(id='tb_science', n='Terminal-Bench-Science 0.1', fam='agent', yr=2026, by='Stanford with the Terminal-Bench team', paper='tbsci',
  me='Research workflows in life, physical, Earth, mathematical and engineering sciences', fmt='Terminal sandbox, same harness as Terminal-Bench', met='% tasks resolved',
  it=I('70 expert-curated tasks (376 contributors, 22 countries)', 'tbsci', n=70),
  gr=['exec'], cd=['none'], st='active',
  ev=[GRID('tbs', note='Artificial Analysis run, outside the Intelligence Index.')],
  why='Launched at 30% in August 2026 and already in the 60s: unsaturated, but the fastest-falling headline on the page.',
  own='ag', old='Terminal-Bench-Science 0.1', rel=['tb4'])

R(id='gaia', n='GAIA', fam='agent', yr=2023, by='Meta and Hugging Face (Mialon et al.)', paper=AX('2311.12983'),
  me='Real-world assistant questions needing web search, files and multi-step reasoning', fmt='Three difficulty levels, short unambiguous answers', met='Exact match',
  it=I('466 questions; answers to 300 withheld for the leaderboard', AX('2311.12983'), n=466, q='we devise 466 questions'),
  gr=['exact'], cd=['private'], st='saturating',
  why='Deep-research agents are near the human 92%, and the exact-answer design proved gameable.',
  iss=[X('Answers circulate publicly; Berkeley RDI\'s cheating agent scored 98% without solving tasks.', 'rdi')],
  own='ag', old='GAIA')

R(id='webarena', n='WebArena / VisualWebArena', fam='agent', yr=2023, by='Zhou et al. (CMU)', paper=AX('2307.13854'),
  mem=[{'n': 'WebArena (2023)', 's': AX('2307.13854')}, {'n': 'VisualWebArena (2024)', 's': AX('2401.13649')}],
  me='Tasks on self-hosted copies of real websites (shop, forum, GitLab, wiki, map)', fmt='Browser agent; functional checkers on site state', met='Task success rate',
  it=I('812 tasks (WebArena); VisualWebArena adds image-grounded tasks', AX('2307.13854'), n=812),
  gr=['exec'], cd=['none'], st='saturating',
  why='From 14% at launch (humans 78%) to well above half; checkers are brittle and the sites are now in training pipelines.',
  iss=[X('Berkeley RDI reached near-perfect WebArena scores by attacking the evaluator.', 'rdi')],
  own='ag', old='WebArena / VisualWebArena')

R(id='osworld', n='OSWorld (original)', fam='agent', yr=2024, by='XLANG Lab, HKU (Xie et al.)', paper=AX('2404.07972'),
  me='Open-ended computer use on a real Ubuntu desktop', fmt='VM tasks across office apps, browser, files, IDE; execution-based checkers', met='Success rate',
  it=I('369 tasks', AX('2404.07972'), n=369, q='a benchmark of 369 computer tasks'),
  gr=['exec'], cd=['none'], st='retired',
  why='Superseded by OSWorld-Verified (2025) after broken tasks and checkers were found; launch figures were 12% for models against 72% for people.',
  own='ag', old='OSWorld / OSWorld-Verified / OSWorld 2.0', rel=['osworld_verified', 'osworld_2'])

R(id='osworld_verified', n='OSWorld-Verified', fam='agent', yr=2025, by='XLANG Lab, HKU', paper='osv',
  me='OSWorld with broken tasks and checkers fixed', fmt='Same VM tasks; step budgets (for example 50 or 100 steps) reported', met='Success rate',
  it=I('369 tasks, revised', 'osv', n=369),
  gr=['exec'], cd=['none'], st='saturating',
  ev=[EP('os_world_external.csv', 'claude-sonnet-4-6', 'OSWorld-Verified leaderboard, 100-step budget')],
  why='Scores above the 72% human baseline; the step budget must be quoted with the score.',
  iss=[X('Gold answers were fetchable and OSWorld reached 73% for a cheating agent (Berkeley RDI).', 'rdi')],
  own='ag', old='OSWorld / OSWorld-Verified / OSWorld 2.0', rel=['osworld', 'osworld_2'])

R(id='osworld_2', n='OSWorld 2.0', fam='agent', yr=2026, by='XLANG Lab, HKU', paper='osw2',
  me='Harder, longer computer-use tasks', fmt='VM tasks, 500-step budget; binary and partial scores', met='Binary accuracy (and a partial-credit score)',
  it=I('See the official site', 'osw2'),
  gr=['exec'], cd=['none'], st='active',
  ev=[EP('osworld_2_external.csv', 'claude-opus-5_max', 'official leaderboard, binary accuracy, batch tool setting, 500 steps', note='Partial score for the same run: 68.3%.')],
  why='The best binary score on the official leaderboard is about 31%: far from saturation.',
  own='ag', old='OSWorld / OSWorld-Verified / OSWorld 2.0', rel=['osworld_verified'])

R(id='taubench', n='tau-bench', fam='agent', yr=2024, by='Sierra (Yao et al.)', paper=AX('2406.12045'),
  me='Customer-service agents talking to a simulated user under a policy document', fmt='Retail and airline domains with tool APIs', met='pass^k: probability all k trials succeed',
  it=I('Retail and airline task sets', AX('2406.12045')),
  gr=['exec'], cd=['none'], st='retired',
  why='Superseded by tau2-bench (2025), which fixed tasks and added domains.',
  own='ag', old='tau-bench', rel=['tau2'])

R(id='tau2', n='tau2-bench', fam='agent', yr=2025, by='Sierra', paper=AX('2506.07982'),
  me='Dual control: both agent and simulated user act on a shared environment', fmt='Telecom (new), retail, airline domains', met='pass^k',
  it=I('Telecom, retail and airline domains', AX('2506.07982')),
  gr=['exec'], cd=['none'], st='active',
  why='pass^k at k above 1 still exposes reliability gaps even where pass^1 is high.',
  iss=[X('The simulated user is itself a model, so part of the score measures the simulator.', AX('2506.07982'))],
  own='ag', old='tau2-bench', rel=['taubench', 'hyper_tau'])

R(id='hyper_tau', n='Hyper-tau-bench', fam='agent', yr=2026, by='Sierra', paper='hypertau',
  me='Agents that build agents, alone and paired with an engineer', fmt='Held-out agent-building tasks', met='% held-out tasks passed',
  it=I('Held-out task set (see Sierra\'s post)', 'hypertau'),
  gr=['exec'], cd=['private'], st='active',
  why='Alone, the best reported agent passes under a quarter; the human pairing shows the agent is not the unit of measurement.',
  own='ag', old='Hyper-tau-bench (Sierra)', rel=['tau2'])

R(id='automationbench', n='AutomationBench', fam='agent', yr=2026, by='AutomationBench maintainers; also run by Artificial Analysis as AutomationBench-AA', paper=None,
  me='Business workflow automation across many tools, with cost per task', fmt='Agent tasks over 47 tools', met='Task success and dollars per task (AA: partial-credit score)',
  it=I('Workflows across 47 tools (old page)', 'oldpage'),
  gr=['exec'], cd=['private'], st='active',
  ev=[GRID('auto', note='AutomationBench-AA: Artificial Analysis\'s own partial-credit run, a different metric from AutomationBench\'s own score.')],
  why='No version of it is near the top.',
  own='ag', old='AutomationBench 1.0.6', rel=['aa_index'])

R(id='agents_last_exam', n="Agents' Last Exam", fam='agent', yr=2026, by='(see source)', paper=None,
  me='Agentic professional work across 55 sub-industries', fmt='Agent tasks', met='Task success',
  it=I('55 sub-industries (old page)', 'oldpage'),
  gr=['rubric'], cd=['private'], st='active',
  why='Young, with a single vendor-reported figure.',
  own='ag', old="Agents' Last Exam")

R(id='agentbench', n='AgentBench', fam='agent', yr=2023, by='Tsinghua (THUDM)', paper=AX('2308.03688'),
  me='LLMs as agents across eight environments (OS, database, web, games)', fmt='8 environments', met='Mixed, per environment',
  it=I('8 environments', AX('2308.03688'), q='8 distinct environments'),
  gr=['exec', 'exact'], cd=['none'], st='retired',
  why='Not reported on 2026 frontier cards; successors measure each environment more deeply.',
  own='ag', old='AgentBench')

R(id='browsecomp', n='BrowseComp', fam='agent', yr=2025, by='OpenAI', paper=AX('2504.12516'),
  me='Persistent web research for hard-to-find, entangled facts', fmt='Short-answer questions needing many searches', met='Accuracy',
  it=I('1,266 questions', AX('2504.12516'), n=1266, q='BrowseComp comprises 1,266 questions'),
  gr=['exact'], cd=['none'], st='saturating',
  own='ag', old='BrowseComp')

R(id='mcp_evals', n='MCP-Universe / MCPMark / MCP-Bench', fam='tool', yr=2025, by='Salesforce (MCP-Universe), MCPMark team, Accenture (MCP-Bench)', paper=AX('2508.14704'),
  mem=[{'n': 'MCP-Universe', 's': AX('2508.14704')}, {'n': 'MCPMark', 's': AX('2509.24002')}, {'n': 'MCP-Bench', 's': AX('2508.20453')}],
  me='Tool use through real Model Context Protocol servers', fmt='Tasks over live MCP servers (maps, GitHub, finance, browsers, databases)', met='Task success',
  it=I('MCP-Universe: 6 domains, 11 servers; MCPMark: 127 tasks; MCP-Bench: 28 servers, 250 tools', AX('2509.24002'), n=127, q='It consists of $127$ high-quality tasks'),
  gr=['exec'], cd=['none'], st='active',
  why='Young and fragmented, no single standard; frontier models still fail many hard tasks.',
  own='ag', old='MCP-Universe / MCPMark / MCP-Bench', rel=['bfcl'])

R(id='metr_horizon', n='METR time horizons (HCAST and RE-Bench)', fam='agent', yr=2025, by='METR', paper=AX('2503.14499'),
  mem=[{'n': 'Measuring AI Ability to Complete Long Software Tasks (2025)', 's': AX('2503.14499')}, {'n': 'HCAST (2025)', 's': AX('2503.17354')}],
  me='The length of task, in human expert time, an agent completes with 50% success', fmt='Software, ML and security tasks timed on human baselines', met='50% (and 80%) time horizon in minutes',
  it=I('HCAST: 189 tasks with 563 human baselines; plus RE-Bench and 66 short tasks', AX('2503.17354'), n=189, q='a benchmark of 189 machine learning engineering'),
  gr=['exec'], cd=['private'], st='active',
  ev=[EP('metr_time_horizons_external.csv', 'claude-mythos-preview-early', 'METR 50% time horizon, minutes')],
  why='A horizon has no ceiling until it outgrows the task suite, which is now the practical limit.',
  own='ag', old='METR HCAST + time horizons')

R(id='gdpval', n='GDPval', fam='agent', yr=2025, by='OpenAI', paper=AX('2510.04374'),
  me='Economically valuable deliverables from 44 occupations', fmt='Tasks written by professionals averaging 14 years of experience', met='Win rate against the professional\'s deliverable, judged by experts',
  it=I('1,320 tasks; a 220-task gold subset is public', AX('2510.04374'), n=1320, q='a gold subset of 220 tasks'),
  gr=['pair'], cd=['private'], st='active',
  ev=[EP('gdpval_external.csv', 'gpt-5.2-2025-12-11_none', 'GDPval gold subset, win rate against experts (ties excluded)')],
  why='Below parity with experts in the last independent reading; graded by humans, so slow to rerun.',
  own='ag', old='GDPval', rel=['gdpval_aa'])

R(id='gdpval_aa', n='GDPval-AA v2.1', fam='agent', yr=2026, by='Artificial Analysis (variant of OpenAI\'s GDPval)', paper='aagdp',
  me='GDPval-style work tasks, run agentically and graded head to head', fmt='Model against model comparisons', met='Elo (anchored at 1600 for DeepSeek V4.1 Flash since methodology v4.3.2)',
  it=I('GDPval tasks as run by Artificial Analysis', 'aagdp'),
  gr=['judge'], cd=['none'], st='active',
  ev=[GRID('gdpval')],
  why='An Elo scale has no ceiling; only differences between models mean anything, and the anchor moved on 19 September 2026.',
  own='ag', old='GDPval-AA v2.1', rel=['gdpval', 'aa_index'])
S('aagdp', 'Artificial Analysis, GDPval-AA evaluation page', 'https://artificialanalysis.ai/evaluations/gdpval-aa', '2026-10-01', 'leaderboard', read='2026-10-01')

R(id='mole', n='MOLE', fam='safe', yr=2026, by='Carnegie Mellon (two authors)', paper=AX('2609.06966'),
  me='Whether a monitor catches harm done by AI agents inside a simulated organisation', fmt='150 AI-operated accounts, 9 stateful services, 30 workdays, 12 injected threats', met='Harm-completion rate (agents) and detection, budget-AUC (monitors)',
  it=I('150 accounts, 9 services, 30 workdays, 12 threats, about 20 billion tokens of monitoring corpora', AX('2609.06966'), q='150 AI-operated accounts sharing 9 stateful services over 30 workdays'),
  gr=['exec'], cd=['none'], st='active',
  ev=[E('24 of 45', 'completed harms caught', 'best monitor (Claude Opus 4.7)', '2026-09-07', 'single-day audit, 10 accounts a day', 'ind', 'molepage')],
  why='The best monitor catches about half of completed harm; the subject measured is the monitor, not the agent.',
  own='ag', old='MOLE',
  corr=[C('"a model\'s stated refusal does not predict whether it declines"', 'The paper compares refusal rates with completion rates across models (they correlate, Spearman -0.73); it does not test stated refusals against behaviour in one rollout. The 72% (28 of 39) was measured under a preamble telling models the sandbox is harmless and refusing spoils the research.', 'molepage'),
        C('"the best monitors miss close to half"', '24 of 45 completed harms caught by the best monitor (21 missed), with the top two one account-day apart.', 'molepage')])

R(id='emergence_world', n='Emergence World', fam='safe', yr=2026, by='Emergence AI', paper=AX('2609.17320'),
  me='What survives in persistent multi-agent worlds under adversarial stress', fmt='8 worlds of 10 agents for 16 days; prompt injection, misinformation, memory exposure', met='Resilience and containment observations per stress test',
  it=I('8 worlds, 16 days, about 850,000 LLM calls and 50 billion tokens', 'ewpage'),
  gr=['rubric'], cd=['interactive'], st='active',
  ev=[E('7 of 7', 'exposed worlds', 'all populations', '2026-09-15', 'phishing stress test: every exposed world warned its community; none removed the traces', 'ind', 'ewpage')],
  why='No system was resilient to all three tests, and episodes that never end can show drift no short task can.',
  own='ag', old='Emergence World')

R(id='edgebench', n='EdgeBench', fam='agent', yr=2026, by='Used by NVIDIA\'s SoL-Pi paper (see source)', paper=AX('2609.20519'),
  me='Agent tasks scored on success and on cost per hour', fmt='51 tasks', met='Success rate plus cost per hour',
  it=I('51 tasks', AX('2609.20519'), n=51, q='On the 51-task EdgeBench evaluation'),
  gr=['exec'], cd=['none'], st='active',
  ev=[E('44.7 to 49.0', '% fewer recorded tokens', 'SoL-Pi against Pi (GPT-5.6 Sol and Opus 5)', '2026-09-17', 'at 93.7 to 94.3% of Pi\'s score; billed API cost about one third lower', 'ind', 'solpage')],
  why='One of few suites that can state an efficiency result at all.',
  own='ag', old='EdgeBench',
  corr=[C('"a 44.7 to 49.0% reduction in recorded token traffic at task parity"', 'Not at parity: SoL-Pi reaches 93.7% and 94.3% of Pi\'s average score (2.5 to 2.8 points lower). The traffic cut is mostly cache reads; the billed cost cut is about a third.', 'solpage')])

R(id='harnessdev', n='HarnessDev', fam='agent', yr=2026, by='HarnessDev authors', paper=AX('2609.01437'),
  me='Whether an LLM can create its own agent harness and then evolve it from feedback', fmt='Six creator models, four domains, five downstream benchmarks', met='Downstream task success and execution-token cost',
  it=I('2,207 downstream instances', AX('2609.01437'), n=2207, q='totaling 2,207 unique downstream instances'),
  gr=['exec'], cd=['private'], st='active',
  ev=[E('67.8 vs 86.2', 'average score', 'best generated harness (Opus 4.8 running itself) vs human-engineered references', '2026-09-01', 'mean of SWE-Pro, Terminal-Bench 2.1, EQ-Bench3 and BrowseComp', 'ind', 'hdpage', note='The references ran different, mostly newer models.')],
  why='Generated harnesses trail the references by about 18 points on average.',
  own='ag', old='HarnessDev',
  corr=[C('"match them on writing and ML experimentation"', 'True only for the best one or two creators, whose references ran the same or a similar model; the code and search references ran newer models.', 'hdpage'),
        C('"evolution gains transfer poorly"', 'All five self-runtime declarations improved on the 630 held-out tasks (+1.43 to +4.44); the regressions are under a fixed Gemini runtime, and "held-out" is the same SWE-Pro split.', 'hdpage')])

R(id='vals_legal', n='Vals AI Legal Research Bench', fam='agent', yr=2025, by='Vals AI', paper=None,
  me='Legal research answers checked for correctness', fmt='Research questions, validation set', met='% correctness checks passed',
  it=I('Validation set (see Vals AI)', 'vals'),
  gr=['rubric'], cd=['private'], st='active',
  why='Retrieval-sensitive: the same weights differ by about 15 points depending on the index searched.',
  own='planned', old='Vals AI Legal Research Bench')
S('vals', 'Vals AI benchmarks', 'https://www.vals.ai/benchmarks', '2026-10-04', 'leaderboard', read='2026-10-04')
