"""Atlas rows: math and coding. Owner 'mc' = Math and coding benchmarks child page."""
from lib import R, S, E, I, X, C, AX, AA, EP, GRID

S('matharena', 'MathArena (ETH Zurich SRI Lab), results by competition', 'https://matharena.ai/', '2026-10-04', 'leaderboard', read='2026-10-04')
S('epfm', 'Epoch AI, FrontierMath benchmark page', 'https://epoch.ai/frontiermath', '2026-10-04', 'leaderboard', read='2026-10-04')
S('swebv', 'OpenAI, Introducing SWE-bench Verified', 'https://openai.com/index/introducing-swe-bench-verified/', '2024-08-13', 'vendor')
S('aider', 'Aider, polyglot benchmark leaderboard', 'https://aider.chat/docs/leaderboards/', '2026-10-04', 'leaderboard', read='2026-10-04')
S('aiderblog', 'Aider, o1 tops aider\'s new polyglot leaderboard (introduces the polyglot set)', 'https://aider.chat/2024/12/21/polyglot.html', '2024-12-21', 'blog')
S('phipage', 'Phi-Bench (knowledge base paper page)', 'https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f', '2026-09-09', 'kb')
S('schropage', "Schrodinger's Code Repository (knowledge base paper page)", 'https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713', '2026-08-21', 'kb')

R(id='gsm8k', n='GSM8K', fam='math', yr=2021, by='OpenAI (Cobbe et al.)', paper=AX('2110.14168'),
  me='Grade-school multi-step arithmetic word problems', fmt='Free-form numeric answer', met='Exact match',
  it=I('8.5K problems (1,319 in the test split)', AX('2110.14168'), n=8500, q='8.5K high quality linguistically diverse grade school math word problems'),
  gr=['exact'], cd=['none'], st='saturated',
  ev=[EP('gsm8k_external.csv', 'DeepSeek-Coder-V2-Instruct', 'as reported in the Qwen2.5-Coder report', note='Epoch\'s table is not a frontier list: labs stopped reporting GSM8K before 2025.')],
  cont={'t': 'GSM1k, a fresh look-alike set, found accuracy drops of up to 8% against GSM8K, with several model families showing systematic overfitting; the gap correlates with how likely a model is to generate GSM8K items (Spearman r squared 0.36).', 's': AX('2405.00332')},
  why='Mid-90s by 2024 with documented leakage; it now works only as a smoke test for small models.',
  iss=[X('GSM-Symbolic: one irrelevant but plausible clause drops accuracy by up to 65% across models.', AX('2410.05229'))],
  own='mc', old='GSM8K', rel=['mgsm'])

R(id='math', n='MATH / MATH-500', fam='math', yr=2021, by='Hendrycks et al. (UC Berkeley)', paper=AX('2103.03874'),
  me='Competition mathematics from AMC 10 to AIME level, five difficulty levels', fmt='Free-form LaTeX answer', met='Exact match after normalisation',
  it=I('12,500 problems (5,000 test); MATH-500 is the 500-problem test subset from OpenAI\'s PRM800K split', AX('2103.03874'), n=12500, q='12,500 challenging competition mathematics problems'),
  gr=['exact'], cd=['none'], st='saturated',
  ev=[EP('math_level_5.csv', 'gpt-5-2025-08-07_high', 'MATH Level 5 (hardest tier only), Epoch\'s own run')],
  why='98% on the hardest level in August 2025; no 2026 frontier card reports it.',
  own='mc', old='MATH / MATH-500')

R(id='aime', n='AIME (each year\'s contest)', fam='math', yr=2024, by='Mathematical Association of America contests, used as benchmarks by labs and MathArena', paper=None,
  me='Olympiad-qualifier problems from a contest held after a model\'s training cutoff', fmt='30 problems per year (AIME I and II), integer answers 0 to 999', met='Accuracy, usually averaged over several samples (pass@1) or majority vote',
  it=I('30 problems per year', 'matharena'),
  gr=['exact'], cd=['rolling'], st='saturating',
  ev=[EP('otis_mock_aime_2024_2025.csv', 'gpt-6.1-sol_max', 'OTIS Mock AIME 2024-2025 (a harder, AIME-style set), Epoch\'s own run')],
  why='Each vintage is near-solved within about a year; a fresh contest only stays a test until models trained after it arrive.',
  iss=[X('pass@1 against majority vote of 32, temperature and token budget move scores by many points; 30 items give a binomial interval several points wide.', 'matharena')],
  own='mc', old='AIME (yearly)', rel=['matharena'])

R(id='matharena', n='HMMT / MathArena', fam='math', yr=2025, by='ETH Zurich SRI Lab (MathArena)', paper=None,
  me='Fresh competitions (HMMT, AIME, BRUMO, SMT, IMO, USAMO) evaluated as soon as they happen', fmt='Final answers, and human-graded proofs for olympiads', met='Accuracy averaged over 4 runs; proof score from human judges',
  it=I('Each competition as held (HMMT February: 30 problems)', 'matharena'),
  gr=['exact', 'rubric'], cd=['rolling'], st='active',
  why='Each new competition starts unseen, so the protocol stays useful even as each vintage saturates.',
  own='mc', old='HMMT / MathArena', rel=['aime'])

R(id='frontiermath', n='FrontierMath Tiers 1-3', fam='math', yr=2024, by='Epoch AI', paper=AX('2411.04872'),
  me='Unpublished research-level mathematics with large exact answers', fmt='Problems with automatically checkable answers (numbers, objects)', met='Accuracy',
  it=I('About 300 problems in Tiers 1-3 (most private; v2 re-release in 2026)', 'epfm'),
  gr=['exact'], cd=['private'], st='saturating',
  ev=[EP('frontiermath_tiers_1_3_v2.csv', 'gpt-6-astra_max', 'Tiers 1-3 v2, private set, Epoch\'s own run')],
  why='Under 2% at launch (November 2024), 93.7% in September 2026: the top is now within a few problems of the ceiling.',
  iss=[X('OpenAI funded the benchmark and had access to much of it, which Epoch disclosed late; Epoch keeps a holdout set it runs itself.', 'epfm')],
  own='mc', old='FrontierMath', rel=['frontiermath_t4'],
  corr=[C('"Active at upper tiers; base tiers ~89% SOTA, Tier 4 v2 is the frontier."', 'Epoch\'s own runs put Tiers 1-3 v2 at 93.7% (GPT-6 Astra and GPT-6.1 Sol, max effort) and Tier 4 v2 at 100% (GPT-6.1 Sol, 29 September 2026). Tier 4 is no longer the open frontier.', 'ep')])

R(id='frontiermath_t4', n='FrontierMath Tier 4', fam='math', yr=2025, by='Epoch AI', paper=None,
  me='The hardest, research-project-sized FrontierMath problems', fmt='Automatically checked answers', met='Accuracy',
  it=I('About 50 problems (v2 re-release after errata)', 'epfm'),
  gr=['exact'], cd=['private'], st='saturated',
  ev=[EP('frontiermath_tier_4_v2.csv', 'gpt-6.1-sol_max', 'Tier 4 v2, private set, Epoch\'s own run (standard error 0)'),
      EP('frontiermath_tier_4_v2.csv', 'gpt-6-astra_high', 'Tier 4 v2, private set, Epoch\'s own run')],
  why='A perfect score from one model and 97.6% from another a month earlier: nothing is left to separate the top.',
  own='mc', old='FrontierMath', rel=['frontiermath'])

R(id='putnambench', n='PutnamBench', fam='math', yr=2024, by='Tsoukalas et al. (UT Austin)', paper=AX('2407.11214'),
  me='Formal proofs of Putnam competition problems', fmt='Formal statements in Lean 4 and Isabelle', met='Problems proved, checked by the proof assistant',
  it=I('640 theorems from the Putnam competition, 1,692 formalisations (Lean 4, Isabelle, part in Coq); the live leaderboard has grown the set since', AX('2407.11214'), n=640, q='1692 hand-constructed formalizations of 640 theorems'),
  gr=['proof'], cd=['none'], st='active',
  why='Machine-checked proofs leave no grading ambiguity; the leaderboard still has headroom.',
  own='mc', old='PutnamBench / miniF2F', rel=['minif2f'])

R(id='minif2f', n='miniF2F', fam='math', yr=2021, by='Zheng, Han and Polu (OpenAI)', paper=AX('2109.00110'),
  me='Formal olympiad-level problem statements (AMC, AIME, IMO)', fmt='Formal statements (Lean, Metamath, Isabelle, HOL Light)', met='Problems proved',
  it=I('488 problem statements', AX('2109.00110'), n=488, q='488 problem statements'),
  gr=['proof'], cd=['none'], st='saturated',
  why='Prover systems drove the test split near the top; PutnamBench carries the formal frontier.',
  own='mc', old='PutnamBench / miniF2F', rel=['putnambench'])

R(id='humaneval', n='HumanEval', fam='code', yr=2021, by='OpenAI (Chen et al., Codex paper)', paper=AX('2107.03374'),
  me='Writing a Python function from its docstring', fmt='164 hand-written problems with unit tests', met='pass@k (the paper introduced the unbiased estimator)',
  it=I('164 problems', AX('2107.03374'), n=164),
  gr=['tests'], cd=['none'], st='retired',
  why='Saturated in the 90s and dropped from frontier cards; its thin test suites also overstated correctness (EvalPlus).',
  own='mc', old='HumanEval', rel=['mbpp_evalplus'])

R(id='mbpp_evalplus', n='MBPP / EvalPlus', fam='code', yr=2021, by='Google (MBPP); Liu et al. (EvalPlus, 2023)', paper=AX('2108.07732'),
  mem=[{'n': 'MBPP (2021)', 's': AX('2108.07732')}, {'n': 'EvalPlus: HumanEval+ and MBPP+ (2023)', 's': AX('2305.01210')}],
  me='Entry-level Python programs; EvalPlus adds many more tests to HumanEval and MBPP', fmt='Programs checked by unit tests', met='pass@1',
  it=I('974 MBPP tasks; EvalPlus extends the tests (HumanEval+ by 80 times)', AX('2108.07732'), n=974, q='974 programming tasks'),
  gr=['tests'], cd=['none'], st='retired',
  why='Saturated; the lasting result is EvalPlus\'s lesson that weak test suites inflate scores.',
  own='mc', old='MBPP / EvalPlus', rel=['humaneval'])

R(id='livecodebench', n='LiveCodeBench', fam='code', yr=2024, by='Jain et al. (UC Berkeley, MIT, Cornell)', paper=AX('2403.07974'),
  me='Contest problems from LeetCode, AtCoder and Codeforces, each tagged with its release date', fmt='Code generation, self-repair, test-output prediction, execution', met='pass@1 on problems released after a chosen date',
  it=I('Grows with each release (400 problems at launch, May 2023 to May 2024)', AX('2403.07974'), q='four hundred high-quality coding problems'),
  gr=['tests'], cd=['rolling'], st='saturating',
  why='Recent windows are near the top for frontier reasoning models; contest problems are also a narrow slice of real coding.',
  own='mc', old='LiveCodeBench', rel=['lcb_pro', 'codeforces'])

R(id='lcb_pro', n='LiveCodeBench Pro', fam='code', yr=2025, by='Zheng et al. (olympiad medalists; NYU, Princeton and others)', paper=AX('2506.11928'),
  me='Olympiad and ICPC-grade problems annotated by medalists', fmt='Code submissions judged on hidden tests, by difficulty tier', met='pass@1 per tier and an Elo-style rating',
  it=I('Continuously updated problems from Codeforces, ICPC and IOI', AX('2506.11928')),
  gr=['tests'], cd=['rolling'], st='active',
  why='Hard-tier problems still separate the frontier.',
  own='mc', old='LiveCodeBench Pro', rel=['livecodebench'])

R(id='codeforces', n='Codeforces rating evals', fam='code', yr=2022, by='Labs (AlphaCode 2022 onward); CodeElo (2025) for a standard harness', paper=AX('2203.07814'),
  mem=[{'n': 'AlphaCode (2022)', 's': AX('2203.07814')}, {'n': 'CodeElo (2025)', 's': AX('2501.01257')}],
  me='Contest performance expressed as a human-comparable Codeforces rating', fmt='Submissions to live or simulated contests', met='Elo rating or percentile',
  it=I('Varies by lab; CodeElo uses recent Codeforces contests', AX('2501.01257')),
  gr=['tests'], cd=['rolling'], st='active',
  why='Ratings have no ceiling, but each lab simulates contests differently, so ratings are rarely comparable across labs.',
  own='mc', old='Codeforces rating evals', rel=['lcb_pro'])

R(id='swebench', n='SWE-bench (full and Lite)', fam='code', yr=2023, by='Jimenez et al. (Princeton)', paper=AX('2310.06770'),
  me='Resolving real GitHub issues in Python repositories', fmt='Repository at the pre-fix commit plus the issue; agent writes a patch', met='% resolved (the repository\'s fail-to-pass tests pass)',
  it=I('2,294 issues from 12 repositories; Lite is a 300-issue subset', AX('2310.06770'), n=2294, q='$2,294$ software engineering problems'),
  gr=['tests'], cd=['none'], st='retired',
  why='Superseded by Verified (2024) after many tasks proved unfair or underspecified; rarely reported now.',
  iss=[X('About a third of the original tasks had problems (underspecified issues or unfair tests), which is why Verified was made.', 'swebv')],
  own='mc', old='SWE-bench (full/Lite)', rel=['swebench_verified', 'swebench_pro'])

R(id='swebench_verified', n='SWE-bench Verified', fam='code', yr=2024, by='OpenAI with the SWE-bench authors', paper='swebv',
  me='The human-validated subset of SWE-bench', fmt='Same as SWE-bench', met='% resolved',
  it=I('500 tasks', 'swebv', n=500),
  gr=['tests'], cd=['none'], st='saturating',
  ev=[EP('swe_bench_verified.csv', 'claude-opus-4-7_max', 'Epoch\'s own run with its standard scaffold')],
  cont={'t': 'Models resolve far fewer issues when familiar repository cues are removed (names remapped, files reordered, statements rewritten): 6.0 to 14.4 points lower.', 's': AX('2609.27891')},
  why='Independent runs above 80% with lab-scaffold claims higher, and measurable repository memorisation: the remaining headroom is partly contamination.',
  iss=[X('Solution leakage in issue comments, weak tests and repository memorisation (SWE-bench-Illusion, SWE-rebench, SchrodingerRepo).', AX('2609.27891'))],
  own='mc', old='SWE-bench Verified', rel=['swebench', 'swebench_pro', 'schrodingerrepo'])

R(id='swebench_pro', n='SWE-bench Pro', fam='code', yr=2025, by='Scale AI', paper=AX('2509.16941'),
  me='Long-horizon enterprise-grade issues needing multi-file fixes', fmt='Public set, held-out set and commercial (proprietary) set', met='% resolved',
  it=I('1,865 problems from 41 repositories: public set from 11, held-out from 12, commercial from 18', AX('2509.16941'), n=1865, q='SWE-BENCH PRO contains 1,865 problems'),
  gr=['tests'], cd=['private', 'licensing'], st='active',
  why='Scores still spread widely and depend on split and scaffold, so it separates systems but every figure needs both named.',
  own='mc', old='SWE-bench Pro', rel=['swebench_pro_v2', 'swebench_verified'])

R(id='swebench_pro_v2', n='SWE-Bench Pro v2', fam='code', yr=2026, by='Scale AI', paper=None,
  me='Repository-level issue resolution, rebuilt harder', fmt='Public and held-out splits', met='% resolved',
  it=I('642 tasks from 11 repositories (old page; source not yet confirmed)', 'oldpage', n=642),
  gr=['tests'], cd=['private'], st='active',
  why='Built to be unsaturated; a v2 figure is not comparable with a Pro (v1) figure.',
  own='mc', old='SWE-Bench Pro v2', rel=['swebench_pro'])

R(id='swebench_mm', n='SWE-bench Multimodal', fam='code', yr=2024, by='Yang et al. (Princeton, Stanford)', paper=AX('2410.03859'),
  me='Visual bug reports in JavaScript front-end libraries', fmt='Issues with screenshots; agent writes a patch', met='% resolved',
  it=I('617 task instances from 17 JavaScript libraries', AX('2410.03859'), n=617, q='617 task instances'),
  gr=['tests'], cd=['none'], st='active',
  why='Less reported than the Python sets and far from saturation in published runs.',
  own='mc', old='SWE-bench Multimodal', rel=['swebench'])

R(id='swe_rebench', n='SWE-rebench', fam='code', yr=2025, by='Nebius', paper=AX('2505.20411'),
  me='Freshly mined GitHub issues, re-collected every month', fmt='Same task shape as SWE-bench; leaderboard on recent windows', met='% resolved on tasks newer than the models',
  it=I('Pipeline dataset of over 21,000 tasks; the leaderboard uses a recent monthly window', AX('2505.20411'), q='over 21,000 interactive Python-based SWE tasks'),
  gr=['tests'], cd=['rolling'], st='active',
  why='Decontaminated by the calendar; the cost is no stable time series, so it is an honesty check on Verified rather than a headline.',
  own='mc', old='SWE-rebench', rel=['swebench_verified', 'schrodingerrepo'])

R(id='schrodingerrepo', n='SchrodingerRepo', fam='code', yr=2026, by='Schrodinger\'s Code Repository authors', paper=AX('2609.27891'),
  me='Whether a repository-level coding score survives removing familiar repository cues', fmt='SWE-bench Verified and SWE-QA re-instantiated under four behaviour-preserving transformations', met='Paired % resolved and interaction cost',
  it=I('SWE-bench Verified and SWE-QA instances under four transformations', AX('2609.27891')),
  gr=['tests'], cd=['transform'], st='active',
  ev=[E(14.4, 'points', 'Gemini 3.1 Flash Lite', '2026-08-21', 'largest Pass@1 drop, on 300 leakage-selected SWE-bench Verified instances; the range across models is 6.0 to 14.4', 'ind', 'schropage', note='Range stated by the paper itself (section I, finding 1, and section VIII).')],
  why='A method rather than a leaderboard: it measures how much of an existing score is memorisation.',
  iss=[X('The design cannot separate memorised from meaningful names; on SWE-QA one model moves only 0.55 points and two of its levels score higher.', 'schropage')],
  own='mc', old='SchrodingerRepo', rel=['swebench_verified'],
  corr=[C('"The aggregator that surfaced it records a 6 to 14 point gap; the abstract states direction rather than a figure."', 'The paper itself states 6.0 to 14.4 points (section I and section VIII); the top end is one model on 300 leakage-selected instances.', 'schropage')])

R(id='aider_polyglot', n='Aider Polyglot', fam='code', yr=2024, by='Aider (Paul Gauthier)', paper='aiderblog',
  me='Editing code correctly in six languages inside an editing harness', fmt='Hard Exercism exercises in C++, Go, Java, JavaScript, Python and Rust', met='% solved within two attempts',
  it=I('225 exercises', 'aiderblog', n=225),
  gr=['tests'], cd=['none'], st='saturating',
  ev=[EP('aider_polyglot_external.csv', 'gpt-5-2025-08-07_high', 'Aider polyglot leaderboard, diff edit format')],
  why='88% by August 2025, and the public leaderboard has added few frontier entries since.',
  own='mc', old='Aider Polyglot')

R(id='bigcodebench', n='BigCodeBench', fam='code', yr=2024, by='BigCode (Zhuo et al.)', paper=AX('2406.15877'),
  me='Practical tasks that call many library functions', fmt='Python tasks with test cases (Complete and Instruct variants; Hard subset)', met='pass@1',
  it=I('1,140 tasks, each with 5.6 test cases on average', AX('2406.15877'), n=1140, q='1,140 fine-grained tasks'),
  gr=['tests'], cd=['none'], st='saturating',
  own='mc', old='BigCodeBench')

R(id='real_swe', n='Real-SWE', fam='code', yr=2026, by='Specific Labs', paper='realswe',
  me='Engineering tasks licensed from real companies\' private production repositories', fmt='Each model in its own native harness', met='% resolved over scored rollouts',
  it=I('10 tasks (median 11 files changed), 640 scored rollouts', 'realswe', n=10),
  gr=['tests'], cd=['licensing'], st='active',
  why='The repositories are not public, so tasks cannot leak; the leader is under 40%.',
  own='mc', old='Real-SWE')
S('realswe', 'Specific Labs, Real-SWE benchmark', 'https://withspecific.com/benchmarks/real-swe', '2026-09', 'leaderboard', read='2026-10-04')

R(id='phi_bench', n='Phi-Bench', fam='code', yr=2026, by='USTC, StepFun, PKU, HKUST, Yale, UPenn', paper=AX('2609.10226'),
  me='Whether a model can engineer the AI infrastructure it runs on (kernels, serving, training systems)', fmt='Three formats: single-file kernel completion, multi-file repository implementation, end-to-end optimisation', met='Mean per-task reward (matching the expert reference earns zero)',
  it=I('85 tasks in nine categories (55 kernel, 20 repository, 10 end-to-end)', 'phipage', n=85),
  gr=['tests', 'exec'], cd=['none'], st='active',
  ev=[E(36.53, 'mean reward', 'Claude Opus 5', '2026-09-09', 'all 85 tasks, the paper\'s Table 2', 'ind', 'phipage', note='A mean of per-task rewards, not a share of tasks solved.')],
  why='The best model scores about a third of the available reward.',
  iss=[X('Hardware and Edge rests on 3 tasks; its 5.4% best is Qwen3.7 Max, not the overall leader.', 'phipage')],
  own='mc', old='Phi-Bench',
  corr=[C('"% of 85 tasks passed ... Claude Opus 5 36.53%"', '36.53 is a mean reward over 85 tasks, where matching the expert reference earns zero, not a share of tasks passed.', 'phipage'),
        C('"hardware and edge the worst category at 5.4%" (implied for the leader)', '5.4% is Qwen3.7 Max (seventh overall); Claude Opus 5 scores 3.9 on that 3-task category.', 'phipage')])

R(id='deepswe', n='DeepSWE', fam='code', yr=2026, by='Datacurve', paper=None,
  me='Software-engineering tasks run in a fixed minimal agent harness', fmt='Repository tasks, mini-swe-agent harness', met='pass@1 averaged over 4 runs',
  it=I('113 tasks (v1.1)', 'grid', n=113),
  gr=['tests'], cd=['private'], st='active',
  ev=[GRID('dswe')],
  why='Fixed harness and pass@1 over 4 runs make cross-model readings comparable; the top is mid-70s.',
  own='planned', old=None, rel=['swebench_pro'])
