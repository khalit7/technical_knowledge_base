"""Updates applied after rows_*.py: readings and corrections from the research passes of 4 October 2026
(official leaderboards and data files fetched that day; raw notes kept outside the repo), and the orchestrator's
verified facts. Each entry names its source; nothing here is from memory."""
from lib import ROWS, S, E, I, X, C, AX, EP

BY = {r['id']: r for r in ROWS}


def U(rid, **kw):
    BY[rid].update(kw)


def EV(rid, *evs, first=False):
    r = BY[rid]
    r['ev'] = (list(evs) + r['ev']) if first else (r['ev'] + list(evs))


def ISS(rid, *xs):
    BY[rid]['iss'] += list(xs)


def CORR(rid, *cs):
    BY[rid]['corr'] += list(cs)


R4 = '2026-10-04'
# ---- sources read by the research pass ----
S('arc1json', 'ARC Prize leaderboard data, ARC-AGI-1 (v1.json, generated 2026-10-01)', 'https://arcprize.org/media/data/leaderboard/v1.json', '2026-10-01', 'leaderboard', read=R4)
S('arc2json', 'ARC Prize leaderboard data, ARC-AGI-2 (v2.json, generated 2026-10-01)', 'https://arcprize.org/media/data/leaderboard/v2.json', '2026-10-01', 'leaderboard', read=R4)
S('arc3json', 'ARC Prize leaderboard data, ARC-AGI-3 (v3.json, generated 2026-09-30)', 'https://arcprize.org/media/data/leaderboard/v3.json', '2026-09-30', 'leaderboard', read=R4)
S('arc3launch', 'ARC Prize, ARC-AGI-3 launch post', 'https://arcprize.org/blog/arc-agi-3-launch', '2026-03-25', 'blog')
S('arc3tr', 'ARC Prize, ARC-AGI-3 technical report (PDF)', 'https://arcprize.org/media/ARC_AGI_3_Technical_Report.pdf', '2026-03', 'paper')
S('arcastra', 'ARC Prize, GPT-6 Astra on ARC-AGI-3: two harnesses', 'https://arcprize.org/blog/astra', '2026-09-03', 'blog')
S('arco3', 'ARC Prize, OpenAI o3 breakthrough on ARC-AGI-1', 'https://arcprize.org/blog/oai-o3-pub-breakthrough', '2024-12-20', 'blog')
S('arc1page', 'ARC Prize, ARC-AGI-1 page', 'https://arcprize.org/arc-agi/1/', R4, 'page', read=R4)
S('arc2page', 'ARC Prize, ARC-AGI-2 page', 'https://arcprize.org/arc-agi/2/', R4, 'page', read=R4)
S('mvakde', 'Vakde, 44% on ARC-AGI-1 for 67 cents (blog)', 'https://mvakde.github.io/blog/44-on-arc-1/', '2026', 'blog', read=R4)
S('scalehle', 'Scale Labs, Humanity\'s Last Exam leaderboard', 'https://labs.scale.com/leaderboard/humanitys_last_exam', R4, 'leaderboard', read=R4)
S('hlediamond', 'CAIS and Scale AI, HLE-Diamond release', 'https://lastexam.ai/blog/hle-diamond', '2026-09-22', 'blog')
S('anthr55', 'Anthropic, Claude Opus 5.5 announcement', 'https://www.anthropic.com/news/claude-opus-5-5', '2026-09-22', 'vendor')
S('oaiastra', 'OpenAI, GPT-6 Astra launch page', 'https://openai.com/index/gpt-6-astra/', '2026-09-02', 'vendor')
S('fh2', 'FutureHouse, HLE chemistry and biology answers (announcement with the HLE team follow-up)', 'https://www.futurehouse.org/research-announcements/hle-exam', '2025-07-23', 'analysis')
S('mafarewell', 'MathArena, Farewell to final-answer competition problems', 'https://matharena.ai/no_final_answer/', '2026-05-12', 'blog')
S('maaime26', 'MathArena, AIME 2026 table', 'https://matharena.ai/competition_tables/aime--aime_2026', R4, 'leaderboard', read=R4)
S('mahmmt26', 'MathArena, HMMT February 2026 table', 'https://matharena.ai/competition_tables/hmmt--hmmt_feb_2026', R4, 'leaderboard', read=R4)
S('maarxiv', 'MathArena, ArXivMath overall table', 'https://matharena.ai/competition_tables/overall--arxivmath', R4, 'leaderboard', read=R4)
S('epfmabout', 'Epoch AI, FrontierMath tiers 1-4: about', 'https://epoch.ai/frontiermath/tiers-1-4/about', R4, 'page', read=R4)
S('epfmoai', 'Epoch AI, OpenAI and FrontierMath (funding and access)', 'https://epoch.ai/latest/openai-and-frontiermath', '2025-01-23', 'blog')
S('putjson', 'PutnamBench leaderboard data (results.json)', 'https://trishullab.github.io/PutnamBench/results.json', R4, 'leaderboard', read=R4)
S('putlb', 'PutnamBench leaderboard', 'https://trishullab.github.io/PutnamBench/leaderboard.html', R4, 'leaderboard', read=R4)
AX('2509.22819'); AX('2507.23726')
S('bbeh', 'Google DeepMind, BBEH leaderboard', 'https://github.com/google-deepmind/bbeh/blob/main/leaderboard.md', '2025-05-06', 'leaderboard', read=R4)
S('sbdata', 'SimpleBench leaderboard data (leaderboard-data.js)', 'https://simple-bench.com/static/js/leaderboard-data.js', R4, 'leaderboard', read=R4)
S('ruler', 'NVIDIA RULER README leaderboard', 'https://github.com/NVIDIA/RULER', '2025-10-09', 'leaderboard', read=R4)
S('lb2', 'LongBench v2 leaderboard', 'https://longbench2.github.io', R4, 'leaderboard', read=R4)
S('ctxarena', 'Context Arena, MRCR 8-needle leaderboard', 'https://contextarena.ai/?needles=8', '2026-08-23', 'leaderboard', read=R4)
S('mrcrhf', 'OpenAI MRCR dataset card (Hugging Face)', 'https://huggingface.co/datasets/openai/mrcr', R4, 'data', read=R4)
S('flimg', 'Fiction.LiveBench results table (image, 4 April 2026)', 'https://cdn6.fiction.live/file/fictionlive/a7be0188-9a0a-4b19-a4b3-97e7deecf52e.png', '2026-04-04', 'leaderboard')
S('flpost', 'Fiction.LiveBench post and changelog', 'https://fiction.live/stories/Fiction-liveBench-Feb-19-2025/oQdzQvKHw8JyXbN87', '2026-04-04', 'leaderboard', read=R4)
S('aagdppdf', 'Artificial Analysis, GDP.pdf evaluation page', 'https://artificialanalysis.ai/evaluations/gdp-pdf', R4, 'leaderboard', read=R4)
S('surgeblog', 'Surge AI, GDP.pdf launch post', 'https://surgehq.ai/blog/gdp-pdf-can-100b-ai-models-master-the-documents-that-run-the-world', '2026-04-14', 'blog')
AX('2607.11192')
S('aav43', 'Artificial Analysis, Intelligence Index v4.3 article', 'https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-3', '2026-09-07', 'blog')
S('aachangelog', 'Artificial Analysis changelog', 'https://artificialanalysis.ai/changelog', R4, 'page', read=R4)
S('aabrieflaunch', 'Artificial Analysis, AA-Briefcase launch article', 'https://artificialanalysis.ai/articles/aa-briefcase', '2026-06-18', 'blog')
S('aammlupro', 'Artificial Analysis, MMLU-Pro evaluation page (legacy)', 'https://artificialanalysis.ai/evaluations/mmlu-pro', R4, 'leaderboard', read=R4)
S('tigermmlupro', 'TIGER-Lab, MMLU-Pro leaderboard submissions (results.csv)', 'https://huggingface.co/datasets/TIGER-Lab/mmlu_pro_leaderboard_submission', '2026-03-11', 'leaderboard', read=R4)
S('kagglesqv', 'Kaggle Benchmarks, SimpleQA Verified leaderboard (Google DeepMind)', 'https://www.kaggle.com/benchmarks/deepmind/simpleqa-verified', '2026-09-30', 'leaderboard', read=R4)
S('simpleevals', 'OpenAI simple-evals README (deprecated July 2025)', 'https://github.com/openai/simple-evals', '2025-07', 'code', read=R4)
S('tbgh', 'Terminal-Bench GitHub releases (harbor-framework/terminal-bench)', 'https://github.com/harbor-framework/terminal-bench/releases', R4, 'code', read=R4)

# ---- knowledge and reasoning ----
U('mmlu_pro', st='saturated', it=I('12,032 test questions in 14 subjects, 10 options', 'tigermmlupro', n=12032),
  why='The best independent readings sit at 90 to 91% on a 10-option test; Artificial Analysis retired it from its index in January 2026 (v4.0) and no current frontier card reports it.')
EV('mmlu_pro', E(91.16, '%', 'Gemini 3.1 Pro', '2026-03-11', 'TIGER-Lab leaderboard, TIGER-Lab-run entry (board last updated 11 March 2026)', 'ind', 'tigermmlupro'),
   E(89.8, '%', 'Gemini 3 Pro Preview (high)', R4, 'Artificial Analysis legacy evaluation, 10-option MCQ, pass@1; no newer models run', 'ind', 'aammlupro'))
CORR('mmlu_pro', C('"Saturating at frontier; still useful mid-tier"', 'Saturated and legacy: tops of 89.8 to 91.2% since early 2026, and its main independent runner retired it in January 2026.', 'aammlupro'))

U('simpleqa', it=I('SimpleQA 4,326 questions (OpenAI, 2024); SimpleQA Verified 1,000 prompts (Google DeepMind, 2025)', AX('2509.07968'), n=4326, q='a 1,000-prompt benchmark'),
  why='The original is unmaintained (OpenAI\'s simple-evals stopped updating in July 2025); the cleaned SimpleQA Verified is live, with the top in the mid-70s. Name the version: the two are different sets.')
BY['simpleqa']['ev'] = []
EV('simpleqa', E(77.5, '%', 'Gemini 3.1 Pro Preview', '2026-09-30', 'SimpleQA Verified, Kaggle leaderboard run by Google DeepMind (plus or minus 2.6); GPT-6 Astra 75.8%', 'ind', 'kagglesqv', note='Kaggle\'s headline "score"; whether it is F1 or accuracy was not confirmed, so do not mix it with the paper\'s F1.'),
   E(62.5, '%', 'GPT-4.5 preview', '2025-02-27', 'original SimpleQA (4,326), no tools, OpenAI simple-evals table', 'lab', 'simpleevals'))
EV('simpleqa', EP('simpleqa_verified.csv', 'gpt-6-astra_max', 'SimpleQA Verified, Epoch\'s own run'))
ISS('simpleqa', X('The original set has noisy and incorrect labels, topical biases and redundant questions, which SimpleQA Verified was built to fix.', AX('2509.07968')))
CORR('simpleqa', C('"Active for factuality reporting" (SimpleQA)', 'The original SimpleQA is unmaintained and absent from current cards; the live version is SimpleQA Verified (1,000 items), top 77.5% on 30 September 2026. Name the version.', 'kagglesqv'))

U('hle', it=I('2,500 questions (finalised April 2025); HLE-Diamond, a 1,000-question subset, released 22 September 2026', 'scalehle', n=2500))
EV('hle', E(54.8, '%', 'GPT-6 Astra', '2026-09-09', 'HLE 2,500 questions, Scale Labs leaderboard (Scale-run standard setting; plus or minus 1.94); flagged "potential contamination" as evaluated after HLE\'s release', 'ind', 'scalehle'),
   E(59.9, '%', 'GPT-6 Astra', '2026-09-22', 'HLE-Diamond (1,000 questions), no tools; with web and code tools 82.9%. A different set: not comparable with full-HLE scores', 'ind', 'hlediamond'),
   E(67.7, '%', 'Claude Opus 5.5', '2026-09-22', 'full HLE WITH tools, max effort, Anthropic\'s harness', 'lab', 'anthr55', note='Vendor with-tools figures range 57.2% (GPT-6 Astra, OpenAI) to 67.7%; OpenAI lists Fable 5.1 at 65.0% where Anthropic lists 65.6%.'))
BY['hle']['cont'] = {'t': 'Scale tags every model evaluated after HLE\'s public release with a potential-contamination warning; a private held-out set is kept to measure overfitting.', 's': 'scalehle'}
ISS('hle', X('FutureHouse: 29% (plus or minus 3.7) of 321 text-only chemistry and biology answers conflict with peer-reviewed literature; the HLE team\'s own follow-up found about 18% of a subset problematic, with at least one of three reviewers disagreeing on 25%.', 'fh2'))
CORR('hle', C('"~46% no-tools SOTA, 55-65% with tools"', 'Scale\'s board now has GPT-6 Astra at 54.8% (9 September 2026); vendor with-tools figures run 57.2 to 67.7% (Claude Opus 5.5, lab). Tools add 3.3 points for Opus 5.5 and 7.0 for Opus 5 in Anthropic\'s own runs, not the 10 to 20 the old page said.', 'scalehle'),
     C('"Scale\'s own review roughly 18% expert disagreement"', 'Mislabelled: the HLE team\'s follow-up found about 18% of a biology and chemistry subset problematic; the disagreement figure is 25% (at least one of three reviewers).', 'fh2'),
     C('"HLE-Verified ... models gain 30-40 points on revised items"', 'The 30 to 40 point gain is on items whose statement or answer was wrong; across HLE-Verified the average gain is 7 to 10 points (668 verified, 1,143 revised, 689 uncertain).', AX('2602.13964')))

U('bbh', iss=BY['bbh']['iss'] + [X('BBEH\'s official board stopped in May 2025 (top: o3-mini high, 44.8% harmonic mean, 54.2% micro average); always state which average.', 'bbeh')])
U('simplebench', st='saturated', it=I('"Over 200" private multiple-choice questions plus a 10-question public sample; human baseline from 9 people', 'simplebench'),
  why='Three models now pass the 83.7% human baseline the maintainers report (nine non-specialists); the best individual human scored 95.4%.')
BY['simplebench']['ev'] = []
EV('simplebench', E(88.4, '%', 'Claude Opus 5.5', '2026-09-24', 'private set, AVG@5 at temperature 0.7, maintainer-run', 'ind', 'sbdata', note='Human baseline 83.7% (n = 9).'))
CORR('simplebench', C('"Active, informal"', 'Models now beat the human baseline: Claude Opus 5.5 88.4%, Fable 5.1 86.6%, GPT-6 Astra Pro 86.5% against 83.7% for people.', 'sbdata'))

U('arc_agi_1', it=I('400 training and 400 public evaluation tasks, plus semi-private and private sets', 'arc1page'))
BY['arc_agi_1']['ev'] = [E(98.5, '%', 'eight model and effort entries tied (GPT-6 Astra, Claude Fable 5, Claude Opus 5.5, GPT-6.1 Sol, Gemini 3.8 Flash)', '2026-10-01', 'semi-private set, ARC Prize verified, pass@2; human panel 98%', 'ind', 'arc1json', note='The cheapest 98.5% is GPT-6.1 Sol (high) at $0.059 per task.'),
                         E(75.7, '%', 'o3 preview (low compute)', '2024-12-20', 'semi-private, within the $10k budget rule; 87.5% at 172 times the compute, outside the rules', 'ind', 'arco3'),
                         E(44, '%', '8-layer transformer trained from scratch (67 cents, 1.5 h on one RTX 5090)', '2026', 'PUBLIC evaluation set with test-time training: not comparable with semi-private scores', 'ind', 'mvakde')]
U('arc_agi_1', why='Eight entries tie at 98.5%, above the 98% human panel: only cost per task still separates them.')
CORR('arc_agi_1', C('"Solved at frontier (o3, late 2024)"', 'o3 reached 75.7% within the budget rules (87.5% at 172 times the compute), below the 98% human panel. ARC-AGI-1 was solved in 2026: eight entries at 98.5% on the semi-private set.', 'arco3'),
     C('"44% from a small transformer ... (Sep 2026)"', 'The 44% is on the public evaluation set with test-time training, so it does not compare with leaderboard (semi-private) scores; the post\'s date could not be confirmed.', 'mvakde'))

U('arc_agi_2', it=I('120 public evaluation, 120 semi-private and 120 private tasks', 'arc2page', n=120),
  why='95% on the semi-private set, with twelve entries at or above 90%: the remaining separation is mostly cost per task. The human panel scores 100%.')
BY['arc_agi_2']['ev'] = [E(95.0, '%', 'GPT-6 Astra (max)', '2026-10-01', 'semi-private set, ARC Prize verified, pass@2, $1.12 per task', 'ind', 'arc2json'),
                         E(94.2, '%', 'GPT-6.1 Sol (max)', '2026-10-01', 'semi-private, $0.25 per task', 'ind', 'arc2json'),
                         E(93.3, '%', 'Claude Opus 5.5 (high)', '2026-10-01', 'semi-private, $0.41 per task', 'ind', 'arc2json')]
CORR('arc_agi_2', C('"Rapidly saturating through 2026 (high-60s to low-90s depending on leaderboard)"', 'The official board itself now reads 95.0% (GPT-6 Astra), 94.2% (GPT-6.1 Sol) and 93.3% (Claude Opus 5.5). There is no longer an official versus aggregator gap.', 'arc2json'))

U('arc_agi_3', it=I('135 environments: 25 public demo, 55 semi-private (tested through APIs), 55 fully private (competition)', 'arc3tr', n=135),
  met='RHAE (relative human action efficiency): per level, (human median actions / AI actions) squared, normalised per environment; 100% means human-level efficiency',
  why='Under the Standard harness the best model scores 62.7% against people\'s 100%; the same model with its provider\'s adapter scores 99.95%, so the harness decides the reading.')
BY['arc_agi_3']['ev'] = [E(62.71, '%', 'GPT-6 Astra (max)', '2026-09-30', 'semi-private, Standard harness (carries model-chosen notes forward); total run cost $26,097.50', 'ind', 'arc3json'),
                         E(99.95, '%', 'GPT-6 Astra, Provider Adapter (high)', '2026-09-30', 'semi-private, Provider Adapter harness (keeps reasoning state, compacts long conversations); total run cost $18,816.63', 'ind', 'arc3json'),
                         E(30.16, '%', 'Claude Opus 5 (high)', '2026-09-30', 'semi-private, Standard harness; best non-OpenAI entry, no Opus 5.5 entry yet', 'ind', 'arc3json'),
                         E(0.51, '%', 'best frontier AI at launch', '2026-03-25', 'launch announcement', 'ind', 'arc3launch', q='Frontier AI scores 0.51%')]
ISS('arc_agi_3', X('Domain-specific research harnesses (such as Prime Agent\'s 95.5%, best of three runs on the easier public set) go on a self-reported community board, not the official one.', 'primepage'),
    X('The semi-private set is tested through external APIs, which the technical report says carries a small risk of leakage.', 'arc3tr'))
CORR('arc_agi_3', C('"bare or default-harness SOTA ~30%"', 'Stale: on the Standard harness GPT-6 Astra scores 62.7% and GPT-6.1 Sol 52.7%; 30.2% is Claude Opus 5\'s.', 'arc3json'),
     C('"95.5% (Prime Agent) ... with a research harness"', 'Best of three runs (95.0, 95.2, 95.5) on the public set, which ARC Prize calls intentionally easier; not on the official leaderboard.', 'primepage'),
     C('"$26,098 ... $18,817"', 'Confirmed, and these are total costs for the run, not per task.', 'arcastra'))

U('critpt', it=I('70 challenges', AX('2609.13009'), n=70))

# ---- math ----
U('aime', st='saturated', why='AIME 2026 reached 100% (mean of four runs) within months, and MathArena deprecated all final-answer contests in May 2026.')
BY['aime']['ev'] = [E(100.0, '%', 'GPT-5.5 (xhigh) and Claude Opus 4.8 (max), tied', R4, 'AIME 2026, MathArena, mean of 4 runs; both released after the contest (flagged)', 'ind', 'maaime26'),
                    E(98.33, '%', 'GPT-5.2 (high)', R4, 'AIME 2026, best model released before the contest, mean of 4 runs (plus or minus 2.29)', 'ind', 'maaime26')]
BY['aime']['cont'] = {'t': 'MathArena flags top AIME 2025 and 2026 entries as released after the contest, and its May 2026 post says pre-existing contest sets could suffer from contamination.', 's': 'mafarewell'}
CORR('aime', C('"Active as a rolling set; each vintage saturates within ~1 yr"', 'AIME 2025 and 2026 are both at 100% on MathArena; the 2026 vintage saturated within weeks and MathArena deprecated final-answer contests on 12 May 2026.', 'mafarewell'))
U('matharena', it=I('Per competition (HMMT February 2026: 33 problems); active sets are now ArXivMath, BrokenArXiv and ArXivLean', 'matharena'),
  why='Its contest tables are deprecated (HMMT February 2026 at 98.5%), but the platform lives on research-level sets: ArXivMath tops at 95.3%, and harder problems arrived on 13 September 2026.')
BY['matharena']['ev'] = [E(95.31, '%', 'GPT-6.1 Sol (max)', R4, 'ArXivMath overall (May, June and August 2026 sets), 4 runs', 'ind', 'maarxiv'),
                         E(98.48, '%', 'GPT-5.5 (xhigh)', R4, 'HMMT February 2026, mean of 4 runs (deprecated table; model released after the contest)', 'ind', 'mahmmt26')]
ISS('matharena', X('MathArena\'s farewell post: of 176 new final-answer problems, Gemini 3.1 Pro solved 162 in all four attempts and every one at least once.', 'mafarewell'))
CORR('matharena', C('"HMMT / MathArena: Active; contamination-resistant by design"', 'HMMT and AIME tables are deprecated (top 98.5%); MathArena\'s live signal is ArXivMath, BrokenArXiv and ArXivLean. The resistance only holds for models released before each contest, which MathArena flags.', 'mafarewell'))

U('frontiermath', it=I('300 core problems (Tiers 1-3) plus 50 in Tier 4', 'epfmabout', n=300))
ISS('frontiermath', X('OpenAI commissioned the 300 core and 50 Tier 4 problems and has access to most statements and solutions; 53 core solutions and 20 Tier 4 problems are held out. Disclosed 23 January 2025.', 'epfmoai'),
    X('Second reviews found about 1 in 20 problems needed correction.', 'epfmabout'))
U('frontiermath_t4', it=I('50 problems (v2); 20 held out from OpenAI', 'epfmabout', n=50))
EV('frontiermath_t4', E(97.6, '%', 'GPT-6 Astra', '2026-09-02', 'Tier 4 v2, OpenAI\'s launch table ("Astra saturates FrontierMath Tier 4")', 'lab', 'oaiastra'))
U('putnambench', st='saturated', it=I('672 Lean 4 problems (346 with an answer placeholder), 640 Isabelle, 412 Rocq; the set grew from the paper\'s 640 theorems', 'putlb', n=672),
  why='At least four systems solved all 672 Lean problems in August and September 2026, one even with answers hidden; the board now ranks by cost.')
BY['putnambench']['ev'] = [E('672 of 672', 'solved', 'Aleph Prover, Humanfia, NEAR AI and Forall', '2026-09-24', 'Lean, with-answer track, self-submitted; mean cost from $0.17 to $74 per problem', 'ind', 'putjson'),
                           E('672 of 672', 'solved', 'Midas Prover', '2026-09-12', 'Lean, no-answer track (answers must be inferred)', 'ind', 'putjson')]
ISS('putnambench', X('Results are self-submitted, several 672-of-672 runs used fixed formalisations, and the with-answer track hands the prover the answer.', 'putlb'))
CORR('putnambench', C('"PutnamBench / miniF2F: Active, niche"', 'Both saturated: PutnamBench Lean 672 of 672 by several systems (August to September 2026), miniF2F 99.2% (Hilbert, September 2025).', 'putjson'))
U('minif2f', it=I('488 problems: 244 validation and 244 test', AX('2109.00110'), n=488, q='488 problem statements'))
EV('minif2f', E(99.2, '%', 'Hilbert (informal LLM, prover LLM, Lean verifier, retriever)', '2025-09-26', 'miniF2F test, Lean 4', 'ind', AX('2509.22819')))

# ---- long context, aggregators ----
U('ruler', st='retired', why='The official board stopped in October 2025 at 128K tokens, far below today\'s 1M windows; vendors cite MRCR instead.')
EV('ruler', E(96.0, '%', 'Jamba 1.5 Large', '2025-10-09', 'RULER README leaderboard, average 4K to 128K', 'ind', 'ruler'))
CORR('ruler', C('"Active for context-length claims"', 'Dormant: board unchanged since October 2025, top about 96% average, only to 128K; frontier vendors report MRCR v2.', 'ruler'))
U('longbench_v2', st='retired', why='The board\'s top (Gemini 2.5 Pro, 63.3%) is above the 53.7% time-limited human baseline and no 2026 model has been added.')
EV('longbench_v2', E(63.3, '%', 'Gemini 2.5 Pro', '2025-03-25', 'official leaderboard, overall with chain of thought', 'ind', 'lb2'))
CORR('longbench_v2', C('"Active"', 'Dormant: top 63.3% (Gemini 2.5 Pro) against a 15-minute human baseline of 53.7%, and no 2026 frontier entries.', 'lb2'))
U('niah', st='retired', why='No current frontier card reports single-needle retrieval; multi-needle MRCR replaced it.')
U('mrcr', st='saturating', it=I('2,400 rows: 2, 4 and 8 needles, 8 length bins from 4K to 1M tokens, 100 samples each', 'mrcrhf', n=2400),
  why='Vendor figures reach 96 to 100% in the long 8-needle bins, while the best independent 1M reading is 63.5%: saturating for one lab\'s own numbers, not yet independently.')
EV('mrcr', E(96.3, '%', 'GPT-6 Astra', '2026-09-02', 'MRCR v2, 8 needles, 512K to 1M bin (256K to 512K: 100.0%)', 'lab', 'oaiastra'),
   E(63.5, '%', 'Gemini 3.7 Flash (high)', '2026-08-23', 'Context Arena, 8 needles at 1M; GPT-6 Astra and Opus 5.5 not yet listed', 'ind', 'ctxarena'))
ISS('mrcr', X('A December 2025 fix corrected about 10% of rows with too many needles and 5% with wrong ground truth; earlier and later scores are not comparable.', 'mrcrhf'))
U('fiction_live', st='saturated', why='Last updated 4 April 2026, when the best models were already at 97 to 100% at 192k tokens.')
EV('fiction_live', E(100.0, '%', 'Gemini 3 Flash preview', '2026-04-04', '192k-token column of the 4 April 2026 table', 'ind', 'flimg'), first=True)
CORR('fiction_live', C('"MRCR and Fiction.liveBench active"', 'Fiction.liveBench has not updated since 4 April 2026 and was at 97 to 100% at 192k then; MRCR is saturating in vendor figures (96.3% at 512K to 1M) but not independently (63.5% at 1M).', 'flpost'))

U('gdp_pdf', it=I('100 tasks over 100 PDFs (4,592 pages), 1,275 expert-written criteria', 'surgeblog', n=100), cd=['none'],
  met='All-pass: share of attempts where every criterion passes (LLM-judged per criterion)',
  why='Tops in the low-to-mid 30s under both implementations: far from saturation, though the dataset is public.')
BY['gdp_pdf']['ev'] = []
EV('gdp_pdf', E(34.2, '%', 'GPT-6 Astra (max)', R4, 'Surge AI\'s own leaderboard and harness, all-pass', 'ind', 'gdppdf'),
   E(32.2, '%', 'GPT-6 Astra (xhigh)', R4, 'Artificial Analysis implementation (5 attempts, GPT-5.6 Luna judge); AA says it is not interchangeable with Surge\'s', 'ind', 'aagdppdf'),
   E(33.2, '%', 'GPT-6 Astra', '2026-09-04', 'Artificial Analysis run at the Index v4.2 launch, before v4.3\'s image-handling change', 'ind', 'aav42'))
BY['gdp_pdf']['cont'] = None
ISS('gdp_pdf', X('The dataset is public on Hugging Face and GitHub, so it is exposed to training; items were kept only if at least two frontier models failed them.', AX('2607.11192')))
CORR('gdp_pdf', C('"GPT-6 Astra 33.2%, GPT-5.6 Sol 28.2%, Claude Fable 5.1 26.2%"', 'These are Artificial Analysis\'s figures at the v4.2 launch (4 September 2026), unlabelled. Today AA shows Astra at 32.2% and Surge\'s own board 34.2%; the two harnesses are not interchangeable.', 'aagdppdf'))

U('aa_briefcase', it=I('91 private tasks in 4 multi-week project scenarios (about 2,000 source files); a fifth, public scenario is demonstrative', 'aabrief', n=91), yr=2026)
ISS('aa_briefcase', X('Elo is relative and re-anchored between versions; deliverables are judged by an LLM panel (Claude Opus 5, GPT-5.6 Sol, Gemini 3.8 Flash since v4.3.1) that includes models from the labs being ranked.', 'aaidx'))
U('aa_index', it=I('10 evaluations in v4.3.2: AA-Briefcase 15%, AA-Omniscience 15%, GDPval-AA 10%, Terminal-Bench 4.0 10%, SciCode 10%, GDP.pdf 10%, HLE 10%, CritPt 10%, AutomationBench-AA 5%, AA-LCR 5%', 'aaidx', n=10))
EV('aa_index', E(53, 'index points', 'Claude Fable 5.1 and GPT-6 Astra, tied', '2026-09-07', 'Intelligence Index v4.3 launch article', 'ind', 'aav43'))
ISS('aa_index', X('Versions so far: v4.0 (January 2026: removed MMLU-Pro, LiveCodeBench, AIME 2025), v4.1 (June), v4.1.1 (August), v4.2 (4 September), v4.3 (7 September), v4.3.1 (judge panel), v4.3.2 (19 September, Elo re-anchoring).', 'aaidx'),
    X('GPT-6 Astra\'s launch page quotes Index v4.1.1 scores (Astra 61.2), not comparable with v4.3 (53).', 'oaiastra'))
CORR('aa_index', C('Model cards and the old page quote index scores without a version', 'A v4.1.1 score of 61.2 and a v4.3 score of 53 can be the same model. Every index figure needs its version.', 'aaidx'))

# ---- orchestrator: Terminal-Bench dates and 3.0, TB-Science, MMLU at launch, SWE-Bench Pro v2, paper-page facts ----
U('tb4', paper='tbgh', it=I('66 tasks: 3.0\'s 74 minus 8 removed in 4.0, with 20 modified (counted from the release notes)', 'tbgh', n=66))
ISS('tb4', X('Tagged v4.0.0 on 26 August 2026 (GitHub release), not in September.', 'tbgh'))
ISS('tb_science', X('Launched 27 August 2026; 52.6% (Claude Fable 5.1, Anthropic\'s figure) came five days later, where Artificial Analysis measured the same model at 43.3%.', 'grid'))
CORR('tb_science', C('"30.0% top score at launch in Aug 2026 ... 52.6% a week later"', 'Launch was 27 August 2026 and the 52.6% came five days later; it is Anthropic\'s own figure, and Artificial Analysis measured Fable 5.1 at 43.3%.', 'tbsci'))
CORR('tb4', C('"4.0 is current (Sep 2026)" and "there is no 3.x because the numbering jumped"', 'Terminal-Bench 3.0 exists (tagged 23 July 2026, 74 tasks); 4.0 was tagged 26 August 2026.', 'tbgh'))
EV('mmlu', E(43.9, '%', 'GPT-3 175B (few-shot)', '2020-09-07', 'the MMLU paper\'s launch table: the largest GPT-3 was the best model', 'ind', AX('2009.03300'), q='improves over random chance by almost 20 percentage points on average'))
U('swebench_pro_v2', it=I('642 tasks, with a 51-task Hard subset; web tools disabled during runs', 'scalev2', n=642),
  why='Built to be unsaturated; the old page\'s "about 23% on the public set" and the multi-file collapse could not be sourced, so no reading is shown.')
S('scalev2', 'Scale AI, SWE-Bench Pro V2 blog', 'https://scale.com/blog/swe-bench-pro-v2', '2026', 'blog')
CORR('swebench_pro_v2', C('"the strongest models reach only about 23% on the public set ... smaller models collapse specifically on multi-file scenarios"', 'Unconfirmed: no source found for either claim. Scale\'s V2 post gives 642 tasks, a 51-task Hard subset and web tools disabled.', 'scalev2'))
U('edgebench', it=I('51 public tasks of 134', 'solpage', n=51), by='Used by NVIDIA\'s SoL-Pi paper')
U('emergence_world', it=I('8 worlds run for 16 to 21 days (the Grok world ended on day 4); about 850,000 LLM calls and 50 billion tokens', 'ewpage'))
CORR('emergence_world', C('"runs eight parallel worlds of ten agents each for 16 days"', 'The worlds ran 16 to 21 days, and the Grok world ended on day 4.', 'ewpage'))

TB3 = dict(id='tb3', n='Terminal-Bench 3.0', fam='agent', yr=2026, by='Terminal-Bench team (Harbor framework)', paper='tbgh',
           me='Harder command-line tasks contributed by many authors', fmt='Docker container with a shell, run through Harbor', met='% tasks passed',
           it=I('74 tasks (initial release, tagged 23 July 2026)', 'tbgh', n=74), gr=['exec'], cd=['none'], st='retired',
           ev=[], why='Replaced five weeks later by 4.0, which removed 8 tasks and recalibrated resources; no reading is shown here because none was re-read from a leaderboard.',
           iss=[], own='ag', old='Terminal-Bench 1.0/2.0/2.1/4.0', corr=[], rel=['tb2', 'tb4'], cont=None)
ROWS.insert([r['id'] for r in ROWS].index('tb4'), TB3)
BY['tb3'] = TB3
for rid in ('tb2', 'tb4', 'tb1'):
    if 'tb3' not in BY[rid]['rel']:
        BY[rid]['rel'].append('tb3')

# MMLU contamination evidence (Xu et al., TS-Guessing)
BY['mmlu']['cont'] = {'t': 'Masking a wrong option in MMLU test questions, ChatGPT and GPT-4 reproduced the missing option exactly 52% and 57% of the time, a sign the test set was in their training data.', 's': AX('2311.09783')}
CORR('mmlu', C('"Saturated (~92%+ frontier), contaminated"', 'Still the right status, now with evidence: contamination measured by TS-Guessing (52% and 57% exact recovery of masked options). The highest MMLU score in Epoch\'s hub is 88.1% (5-shot log-likelihood); a "92%+" figure needs its prompt setting, and no 2026 card reports MMLU at all.', AX('2311.09783')))
U('mmlu', it=I('15,908 questions in 57 subjects', AX('2009.03300'), n=15908, q='15908 questions'))

# ==== research pass 3 (instruction, preference, safety, multimodal, multilingual, classic, school maths and code) ====
S('an_gsm', 'GSM8K on Hugging Face (test split: 1,319 problems)', 'https://huggingface.co/datasets/openai/gsm8k', '2021-10-27', 'data', read=R4)
S('llmstats', 'llm-stats benchmark pages (aggregated vendor self-reports, none verified)', 'https://llm-stats.com/benchmarks', R4, 'leaderboard', read=R4)
S('ifevalhf', 'IFEval dataset (Hugging Face, google/IFEval)', 'https://huggingface.co/datasets/google/IFEval', R4, 'data', read=R4)
S('scalemc', 'Scale Labs, MultiChallenge leaderboard (last updated 3 February 2026)', 'https://labs.scale.com/leaderboard/multichallenge', '2026-02-03', 'leaderboard', read=R4)
S('aaifbench', 'Artificial Analysis, IFBench evaluation page', 'https://artificialanalysis.ai/evaluations/ifbench', R4, 'leaderboard', read=R4)
S('arena', 'Arena (formerly LMArena), text leaderboard snapshot', 'https://arena.ai/leaderboard/text', '2026-10-02', 'leaderboard', read=R4)
S('arenahard', 'lmarena/arena-hard-auto README leaderboard (last commit June 2025)', 'https://github.com/lmarena/arena-hard-auto', '2025-06-21', 'leaderboard', read=R4)
S('alpaca', 'AlpacaEval 2.0 leaderboard (tatsu-lab, last commit August 2025)', 'https://tatsu-lab.github.io/alpaca_eval/', '2025-08-09', 'leaderboard', read=R4)
S('mtbench', 'Chatbot Arena leaderboard table with MT-Bench column (leaderboard_table_20250804.csv)', 'https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard', '2025-08-04', 'leaderboard', read=R4)
S('fastchat3158', 'FastChat PR 3158: wrong GPT-4 reference answers in MT-Bench', 'https://github.com/lm-sys/FastChat/pull/3158', '2024-03', 'code')
S('tqagh', 'TruthfulQA repository (January 2025 update)', 'https://github.com/sylinrl/TruthfulQA', '2025-01', 'code', read=R4)
S('tqaaf', 'Evans et al., New, improved multiple-choice TruthfulQA (Alignment Forum)', 'https://www.alignmentforum.org/posts/Bunfwz6JsNd44kgLT/new-improved-multiple-choice-truthfulqa', '2025-01', 'blog')
S('gpt54card', 'OpenAI, GPT-5.4 Thinking system card (PDF)', 'https://deploymentsafety.openai.com/gpt-5-4-thinking/gpt-5-4-thinking.pdf', '2026-03', 'vendor')
S('helmair', 'Stanford CRFM HELM, AIR-Bench leaderboard (release v1.19.0)', 'https://crfm.stanford.edu/helm/air-bench/latest/', '2025-11-24', 'leaderboard', read=R4)
S('scalemask', 'Scale Labs, MASK leaderboard', 'https://labs.scale.com/leaderboard/mask', R4, 'leaderboard', read=R4)
S('opus55card', 'Anthropic, Claude Opus 5.5 system card (PDF)', 'https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf', '2026-09-22', 'vendor')
S('mmmulb', 'MMMU official leaderboard (leaderboard_data.json)', 'https://mmmu-benchmark.github.io/', R4, 'leaderboard', read=R4)
S('mathvistalb', 'MathVista official leaderboard', 'https://mathvista.github.io/', R4, 'leaderboard', read=R4)
S('videommelb', 'Video-MME official leaderboard', 'https://video-mme.github.io/home_page.html', '2025-09-28', 'leaderboard', read=R4)
S('argoneval', 'Google, Gemini 4 Argon model evaluation (PDF)', 'https://storage.googleapis.com/deepmind-media/gemini/gemini_4_argon_model_evaluation.pdf', '2026-10', 'vendor')
S('gsmplat', 'MadryLab, GSM8K-Platinum', 'https://gradientscience.org/gsm8k-platinum/', '2025-03', 'analysis')
S('floresplus', 'FLORES+ dataset (OLDI, Hugging Face)', 'https://huggingface.co/datasets/openlanguagedata/flores_plus', R4, 'data', read=R4)
S('flores200readme', 'facebookresearch/flores FLORES-200 README (no longer updated)', 'https://github.com/facebookresearch/flores/blob/main/flores200/README.md', R4, 'code', read=R4)
S('wmt25', 'WMT25 General MT findings (ACL Anthology)', 'https://aclanthology.org/2025.wmt-1.22.pdf', '2025-11', 'paper')
S('glueblog', 'Microsoft, achieving human parity on GLUE (blog archive with leaderboard snapshot)', 'https://learn.microsoft.com/en-us/archive/blogs/stevengu/microsoft-achieves-human-performance-estimate-on-glue-benchmark', '2019-06-06', 'blog')
S('synced', 'Synced Review, Microsoft DeBERTa tops human performance on SuperGLUE', 'https://syncedreview.com/2021/01/06/microsoft-deberta-tops-human-performance-on-superglue-nlu-benchmark/', '2021-01-06', 'news')
S('squadlb', 'SQuAD 2.0 official leaderboard', 'https://rajpurkar.github.io/SQuAD-explorer/', R4, 'leaderboard', read=R4)
S('evalplus', 'EvalPlus leaderboard (results.json)', 'https://evalplus.github.io/leaderboard.html', R4, 'leaderboard', read=R4)
for a in ('2303.08774', '2205.01917', '2103.14749', '2006.07159', '2504.07825', '2602.16763', '2406.18521'):
    AX(a)

U('ifeval', it=I('541 prompts with 25 verifiable instruction types', 'ifevalhf', n=541),
  why='Self-reported tops cluster at 93 to 95%, the constraint types are public and trainable, and none of the three 2026 frontier cards checked reports it.')
EV('ifeval', E(95.0, '%', 'Qwen3.5-27B', R4, 'vendor self-report via llm-stats; strict or loose, prompt or instruction level not stated', 'lab', 'llmstats'))
ISS('ifeval', X('Four scoring variants (prompt or instruction level, strict or loose) are quoted interchangeably.', 'llmstats'))
CORR('ifeval', C('"Saturating but still standard on model cards"', 'Saturated, and dropped from the Claude Opus 5.5 and Gemini 4 Argon cards; it survives on some open-model cards.', 'opus55card'))

U('multichallenge_ifbench', it=I('MultiChallenge 273 test conversations; IFBench 300 prompts with 58 new out-of-domain constraints', AX('2507.02833'), n=273, q='58 new, diverse, and challenging verifiable out-of-domain constraints'),
  why='Tops in the mid-70s (MultiChallenge) and low 80s (IFBench), with headroom; MultiChallenge\'s board has not moved since February 2026.')
EV('multichallenge_ifbench', E(75.52, '%', 'Meta Muse Spark', '2026-02-03', 'MultiChallenge, Scale leaderboard, LLM judge with rubrics (plus or minus 4.05)', 'ind', 'scalemc'),
   E(83.3, '%', 'Grok 4.3 (medium)', R4, 'IFBench, Artificial Analysis run; best of the models shown by default, not confirmed as the overall top', 'ind', 'aaifbench'))

BY['lmarena']['ev'] = []
EV('lmarena', E(1525, 'rating', 'Gemini 4 Argon (high, pre-release)', '2026-10-02', 'text overall, style control (default), 95% interval 1516 to 1534, 4,932 votes', 'ind', 'arena', note='Ranks 2 to 10 sit at 1494 to 1505 (Claude Opus 5.5 high 1504); GPT-6 Astra max is 29th at 1477.'))
ISS('lmarena', X('Leaderboard Illusion details: 27 private Meta variants tested before Llama 4; Google and OpenAI received about 19.2% and 20.4% of arena data; 205 of 243 public models silently deprecated.', AX('2504.20879')))
CORR('lmarena', C('"frontier cluster ~1510-1525"', 'One model stands at 1525 (Gemini 4 Argon, pre-release, plus or minus 9); the next nine sit at 1494 to 1505, so nothing is between 1510 and 1520 (2 October 2026).', 'arena'))

U('arena_hard', st='retired', it=I('v2.0: 500 hard prompts plus 250 creative-writing prompts', 'arenahard', n=750),
  why='The official v2.0 board has not been refreshed since April 2025 (top: o3, 85.9 against o3-mini) and a constant null response scored 83.0 on Arena-Hard-Auto.')
EV('arena_hard', E(85.9, '% win rate', 'o3 (2025-04-16)', '2025-04-23', 'v2.0 hard prompts, style control, Gemini 2.5 judge, against o3-mini', 'ind', 'arenahard'))
CORR('arena_hard', C('"Active arena proxy"', 'Dormant since mid-2025: newest entries April 2025, last commit June 2025.', 'arenahard'))
EV('alpacaeval', E(86.45, '% LC win rate', 'NullModel (a constant output)', '2025-08-09', 'AlpacaEval 2.0 leaderboard, community entry, ranked first', 'ind', 'alpaca', note='Best real non-community entry: GPT-4o (May 2024), 57.45%.'))
CORR('alpacaeval', C('"Fading; gameable"', 'Retired: a constant null model tops the leaderboard (86.45% LC) and no frontier model has been submitted since 2024.', 'alpaca'))
EV('mt_bench', E(9.32, 'score (1 to 10)', 'GPT-4-1106-preview', '2025-08-04', 'GPT-4 judge, single-answer grading; last leaderboard table with the column', 'ind', 'mtbench'))
ISS('mt_bench', X('13 of 30 sampled GPT-4 reference answers in maths, coding and reasoning were wrong.', 'fastchat3158'), X('A constant null response scores 9.55, above every real model.', AX('2410.07137')))

U('truthfulqa', it=I('817 questions in 38 categories; 790 after the authors\' January 2025 revision', AX('2109.07958'), n=817, q='The benchmark comprises 817 questions'),
  why='Not saturated by score, but abandoned: frontier labs report SimpleQA, AA-Omniscience and MASK for honesty instead.')
ISS('truthfulqa', X('The original multiple-choice formats could be gamed with test-taking heuristics; the authors released a binary version and dropped invalid questions in January 2025.', 'tqaaf'))

U('harmbench', st='saturating', it=I('HarmBench 510 behaviours (400 text, 110 multimodal); StrongREJECT 313 forbidden prompts', AX('2402.04249'), n=510),
  why='OpenAI filtered StrongREJECT because it was "otherwise highly saturated", then replaced it before GPT-5.4 (March 2026); Opus 5.5\'s card uses neither.')
EV('harmbench', E(0.975, 'not-unsafe fraction', 'GPT-5.2 Thinking', '2025-12-11', 'OpenAI\'s filtered StrongREJECT adaptation, OpenAI graders', 'lab', 'gpt54card'))
ISS('harmbench', X('A HarmBench attack success rate means nothing without the attack named: the paper compares 18 red-teaming methods.', AX('2402.04249')))
CORR('harmbench', C('"HarmBench / StrongREJECT / AgentHarm ... Attack success rate, Active in safety evals"', 'HarmBench and StrongREJECT are research staples but have left frontier cards (OpenAI retired StrongREJECT as saturated in March 2026). AgentHarm is a separate row: its metric is a harm score plus refusal rate, not attack success.', 'gpt54card'))
U('agentharm', it=I('110 malicious agent behaviours (440 with augmentations), 11 harm categories, 104 tools', AX('2410.09024'), n=110, q='110 explicitly malicious agent tasks (440 with augmentations)'),
  why='Only the 2024 paper\'s readings exist, with a wide spread; no frontier lab reports it now, so "active" means still unsaturated rather than still used.')
EV('agentharm', E(48.4, '% harm score', 'GPT-4o', '2024-10-11', 'public test set, no attack; refusal 48.9%', 'ind', AX('2410.09024')),
   E(82.2, '% harm score', 'Mistral Large 2', '2024-10-11', 'public test set, no attack; refusal 1.1%', 'ind', AX('2410.09024')))
U('air_bench', it=I('5,694 prompts across 314 risk categories from regulations and company policies', AX('2407.17436'), n=5694, q='5,694 diverse prompts'),
  why='A wide spread (44 to 93% refusal) on HELM\'s last release, November 2025; no 2026 models yet.')
EV('air_bench', E(93.2, '% refusal rate', 'Claude 4.5 Haiku', '2025-11-24', 'HELM release v1.19.0, overall', 'ind', 'helmair'))
ISS('air_bench', X('Refusal rate rewards refusing and does not penalise over-refusal, so higher means more restrictive, not better aligned.', 'helmair'))
U('mask', st='saturating', met='Honesty score: 1 minus the probability of lying (statement under pressure against elicited belief)',
  it=I('1,500 items: 1,000 public, 500 private (used by Scale\'s leaderboard)', 'scalemask', n=1500),
  why='Scale\'s top cluster sits at 92 to 96%; it is still on the Claude Opus 5.5 card (public split, as a figure).')
EV('mask', E(96.28, '% honest', 'Claude Opus 4.6 (no thinking)', R4, 'private set, Scale leaderboard (plus or minus 0.41)', 'ind', 'scalemask'))
CORR('mask', C('"Consistency score"', 'Mislabelled: MASK reports an honesty score, 1 minus the probability of lying under pressure, with 1,000 public and 500 private items.', 'scalemask'))

U('mmmu', st='saturated', why='The best validation score (85.4%) is inside the human-expert band (76.2 to 88.6%), labs stopped reporting it in late 2025, and test answers were released on 12 February 2026.')
EV('mmmu', E(85.4, '%', 'GPT-5.1', '2025-11-13', 'validation split (900), author-reported on the official leaderboard; the test-split top is only 65.9%', 'lab', 'mmmulb'))
BY['mmmu']['cont'] = {'t': 'The MMMU team released the test-set answers on 12 February 2026, so later test scores are open to contamination; validation answers were always public.', 's': 'mmmulb'}
CORR('mmmu', C('"MMMU saturating"', 'Saturated: 85.4% validation is within the human-expert band, and test answers are now public.', 'mmmulb'))
U('mmmu_pro', st='saturating', it=I('1,730 questions in standard (10 options) and vision-only settings', 'mmmulb', n=1730),
  why='86.9% (author-reported) is above the high human-expert reference of 85.4%.')
EV('mmmu_pro', E(86.9, '%', 'Chance Vision 1.5', '2026-07-01', 'overall (standard 87.6, vision 86.1), author-reported on the official leaderboard', 'lab', 'mmmulb', note='GPT-6 Astra is reported at 86.9% too, but only through secondary sources (OpenAI\'s page returned 403).'))
CORR('mmmu_pro', C('"Pro active"', 'Saturating: tops of 86.9% exceed the 85.4% high human-expert reference.', 'mmmulb'))
EV('mathvista_chartqa_docvqa', E(85.2, '%', 'DreamPRM (o4-mini)', '2025-06-04', 'MathVista testmini (1,000), official leaderboard; human 60.3%', 'lab', 'mathvistalb'))
ISS('mathvista_chartqa_docvqa', X('Chart understanding on 2026 cards moved to CharXiv and Chartography; existing chart sets use templated questions and models drop up to 34.5% on slight variations (CharXiv).', AX('2406.18521')),
    X('Self-reported DocVQA scores (96.4 ANLS) exceed the paper\'s human figure (94.36), the label-noise ceiling.', AX('2007.00398')))
CORR('mathvista_chartqa_docvqa', C('"Saturating"', 'Saturated: all three are past their human baselines and absent from 2026 frontier cards.', 'mathvistalb'))
EV('video_mme', E(89.2, '%', 'ByteDance Seed 2.1 Pro', R4, 'Video-MME, vendor self-report via llm-stats (subtitle setting not given)', 'lab', 'llmstats'), first=True)
ISS('video_mme', X('Frame budgets differ by API (Gemini at 1 frame per second, GPT-6 Astra 800 frames, Opus 5.5 600), so video scores are partly a harness choice; 2026 cards moved to LVBench.', 'argoneval'))
CORR('video_mme', C('"Active"', 'Saturating: self-reported tops near 89% (Video-MME) and 88% (VideoMMMU, above the 74.4% human average); official boards stopped in 2025.', 'llmstats'))
EV('mgsm', E(93.7, '%', 'o4-mini', '2025-04-16', 'OpenAI simple-evals, no tools, medium effort', 'lab', 'simpleevals', q='We believe these evals are saturated for our newer models'))
U('global_mmlu', why='Global-MMLU and MMMLU sit at 92 to 94% (on MMLU\'s own error ceiling); INCLUDE, built from local exams, has more headroom (87.6% self-reported).')
EV('global_mmlu', E(94.3, '%', 'Claude Opus 5.5', '2026-09-22', 'Global-MMLU, average over 42 languages, max effort, single trial', 'lab', 'opus55card'))
U('flores', it=I('3,001 sentences in 204 language-script codes (dev 997, devtest 1,012, test hidden); continued as FLORES+ (230 varieties)', 'flores200readme', n=3001),
  why='Still the standard many-language test, now maintained as FLORES+; frontier MT comparisons have moved to WMT human evaluation.')
BY['flores']['cont'] = {'t': 'Dev and devtest references are public on GitHub and Hugging Face, so web-trained models may have seen them; only the test split is hidden.', 's': 'floresplus'}
ISS('flores', X('WMT25: a system tuned on automatic metric rewards ranked first on automatic metrics for all but one pair yet lower under human evaluation, a warning for chrF-style scores.', 'wmt25'))
EV('glue_superglue', E(89.9, 'average', 'DeBERTa 1.5B (single model)', '2021-01-06', 'SuperGLUE test server; human baseline 89.8', 'ind', 'synced'),
   E(87.6, 'average', 'MT-DNN ensemble', '2019-06-06', 'GLUE test server; human baseline 87.1', 'ind', 'glueblog'), first=True)
BY['glue_superglue']['ev'] = [e for e in BY['glue_superglue']['ev'] if not (isinstance(e, dict) and e.get('from') == 'ep')]
EV('squad', E('EM 90.9 / F1 93.2', '', 'IE-Net ensemble (RICOH SRCB DML)', '2021-06-04', 'SQuAD 2.0 hidden test set; human EM 86.8 / F1 89.5', 'ind', 'squadlb'))
U('squad', why='The SQuAD 2.0 top (June 2021) sits 3.8 F1 above the human line and nothing new has topped it since.')
EV('imagenet', E(91.0, '% top-1', 'CoCa (fine-tuned encoder)', '2022-05-04', 'ImageNet-1k validation', 'lab', AX('2205.01917'), q='91.0% top-1 accuracy'))
ISS('imagenet', X('At least 6% of validation labels are wrong (Northcutt et al. 2021), the same order as the remaining error.', AX('2103.14749')),
    X('With reassessed labels, recent gains are substantially smaller than on the original labels (Beyer et al. 2020).', AX('2006.07159')))
ISS('hellaswag_wino_arc', X('HellaSwag has ungrammatical items, typos and equally correct options; with the question prompt removed or replaced by "Lorem ipsum", about 68% of model predictions do not change (Chizhov et al. 2025).', AX('2504.07825')))
BY['hellaswag_wino_arc']['cont'] = {'t': 'GPT-4\'s report estimated about 3.4% of ARC and 0.9% of WinoGrande overlapping its pretraining data.', 's': AX('2303.08774')}
ISS('gsm8k', X('GSM8K-Platinum re-checked 219 flagged test questions: 110 removed and 10 relabelled, leaving 1,209.', 'gsmplat'))
U('gsm8k', it=I('8.5K problems: 7,473 train, 1,319 test', 'an_gsm', n=8500))
CORR('gsm8k', C('"heavily contaminated"', 'Overstated for frontier models: GSM1k found minimal overfitting at the frontier and drops of up to 8% for some families. Label noise matters too: GSM8K-Platinum removed 110 test items.', AX('2405.00332')))
EV('math', E(99.2, '%', 'o3', '2026-08-06', 'MATH-500, top five within 98.2 to 99.2 (saturation study, Table 6)', 'ind', AX('2602.16763')))
BY['math']['cont'] = {'t': 'The saturation study (ICML 2026) flags MATH-500 as contaminated in its Table 6.', 's': AX('2602.16763')}
U('humaneval', st='saturated')
EV('humaneval', E(99.3, '% pass@1', 'o4-mini (high)', '2025-04-16', 'OpenAI simple-evals, no tools', 'lab', 'simpleevals'),
   E(96.3, '% pass@1', 'o1-preview and o1-mini', '2024-09-12', 'EvalPlus harness, base tests, greedy (HumanEval+: 89.0)', 'ind', 'evalplus'))
BY['humaneval']['cont'] = {'t': 'GPT-4\'s report estimated about 25% of HumanEval overlapping its pretraining data.', 's': AX('2303.08774')}
U('humaneval', why='99.3% (lab) and 96.3% (independent) with tests that accept wrong code: extended tests drop the same models about 7 points. No 2026 card reports it.')
CORR('humaneval', C('"Saturated (>99%), retired"', 'The 99.3% is one lab figure (o4-mini high, OpenAI simple-evals); the independent EvalPlus top is 96.3% on base tests and 89.0% on HumanEval+.', 'evalplus'))

# ==== research pass 1 (coding and agentic) ====
S('scalepro1', 'Scale Labs, SWE-Bench Pro (V1) leaderboard, public and commercial tabs (marked deprecated)', 'https://labs.scale.com/leaderboard/swe_bench_pro_public', R4, 'leaderboard', read=R4)
S('scalepro2', 'Scale Labs, SWE-Bench Pro V2 leaderboard', 'https://labs.scale.com/leaderboard/swe_bench_pro_public_v2', '2026-09-22', 'leaderboard', read=R4)
S('scalepro2blog', 'Scale Labs, SWE-Bench Pro V2 blog', 'https://labs.scale.com/blog/swe-bench-pro-v2', '2026-09-22', 'blog')
S('oai56', 'OpenAI, GPT-5.6 launch page', 'https://openai.com/index/gpt-5-6/', '2026-07', 'vendor')
S('oai55', 'OpenAI, Introducing GPT-5.5', 'https://openai.com/index/introducing-gpt-5-5/', '2026-04-23', 'vendor')
S('oaisol', 'OpenAI, Introducing GPT-6 Sol and Luna', 'https://openai.com/index/introducing-gpt-6-sol-and-luna/', '2026-09-22', 'vendor')
S('oailaw', 'OpenAI, Astra for Law', 'https://openai.com/index/astra-for-law/', '2026-09-17', 'vendor')
S('rebench', 'SWE-rebench leaderboard (Nebius)', 'https://swe-rebench.com/', R4, 'leaderboard', read=R4)
S('swebjson', 'swebench.com leaderboard data (leaderboards.json)', 'https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json', R4, 'leaderboard', read=R4)
S('runtimewire', 'RuntimeWire, Specific\'s Real-SWE launch report', 'https://runtimewire.com/article/specific-real-swe-private-enterprise-code-benchmark', '2026-09-12', 'news')
S('lcbjson', 'LiveCodeBench leaderboard data (performances_generation.json)', 'https://livecodebench.github.io/performances_generation.json', R4, 'leaderboard', read=R4)
S('lcbpro', 'LiveCodeBench Pro leaderboard backend (ratings)', 'https://webhook.cp-bench.orzzh.com/leaderboard/llm', R4, 'leaderboard', read=R4)
S('dsnotes', 'DeepSeek API docs, release notes', 'https://api-docs.deepseek.com/updates/', '2026-09-10', 'vendor')
S('bcbjson', 'BigCodeBench leaderboard data (results.json)', 'https://bigcode-bench.github.io/results.json', R4, 'leaderboard', read=R4)
S('evalplusreadme', 'EvalPlus README (MBPP+ v0.2.0)', 'https://raw.githubusercontent.com/evalplus/evalplus/master/README.md', R4, 'code', read=R4)
S('tb1wb', 'Terminal-Bench 1.0 leaderboard (Wayback capture 9 August 2026)', 'https://web.archive.org/web/20260809131412/https://www.tbench.ai/leaderboard/terminal-bench/1.0', '2026-08-09', 'leaderboard')
S('tb20wb', 'Terminal-Bench 2.0 leaderboard (Wayback capture 26 August 2026)', 'https://web.archive.org/web/20260826113700/https://www.tbench.ai/leaderboard/terminal-bench/2.0', '2026-08-26', 'leaderboard')
S('tb21wb', 'Terminal-Bench 2.1 leaderboard (Wayback capture 26 August 2026)', 'https://web.archive.org/web/20260826020311/https://www.tbench.ai/leaderboard/terminal-bench/2.1', '2026-08-26', 'leaderboard')
S('tb21news', 'Terminal-Bench 2.1 announcement', 'https://www.tbench.ai/news/terminal-bench-2-1', '2026-05-06', 'blog')
S('tbsciboard', 'Terminal-Bench-Science leaderboard', 'https://www.terminal-bench-science.ai/', R4, 'leaderboard', read=R4)
S('tbsci01', 'Terminal-Bench-Science 0.1 announcement', 'https://www.tbench.ai/news/terminal-bench-science-0-1', '2026-08-27', 'blog')
S('oswv', 'OSWorld-Verified results (osworld_verified_results.xlsx)', 'https://os-world.github.io/static/data/osworld_verified_results.xlsx', R4, 'leaderboard', read=R4)
S('oswvblog', 'XLANG, Introducing OSWorld-Verified', 'https://xlang.ai/blog/osworld-verified', '2025', 'blog')
S('osw2json', 'OSWorld 2.0 official leaderboard data (official-results.json, updated 2026-09-17)', 'https://osworld-v2.xlang.ai/static/data/leaderboard/official-results.json', '2026-09-17', 'leaderboard', read=R4)
S('oswself', 'OSWorld self-reported results (original task set)', 'https://os-world.github.io/static/data/self_reported_results.xlsx', R4, 'leaderboard', read=R4)
S('gaialb', 'GAIA leaderboard (Hugging Face Space)', 'https://gaia-benchmark-leaderboard.hf.space/', R4, 'leaderboard', read=R4)
S('walb', 'WebArena leaderboard sheet (linked from webarena.dev)', 'https://docs.google.com/spreadsheets/d/1M801lEpBbKSNwP-vDBkC_pF7LdyGU1f_ufZb_NWNBZQ/edit?usp=sharing', R4, 'leaderboard', read=R4)
S('taub', 'taubench.com leaderboard and submissions manifest (Sierra)', 'https://taubench.com/', R4, 'leaderboard', read=R4)
S('zapier', 'Zapier AutomationBench leaderboard', 'https://zapier.com/benchmarks', '2026-10-01', 'leaderboard', read=R4)
S('ale', 'Agents\' Last Exam leaderboard (hosted by Snorkel)', 'https://snorkel.ai/leaderboard/agents-last-exam/', R4, 'leaderboard', read=R4)
S('aleorg', 'Agents\' Last Exam site', 'https://agents-last-exam.org/', R4, 'page', read=R4)
S('agentbenchgh', 'THUDM AgentBench repository', 'https://github.com/THUDM/AgentBench', '2026-02-08', 'code', read=R4)
S('bcblog', 'OpenAI, BrowseComp', 'https://openai.com/index/browsecomp/', '2025-04-10', 'vendor')
S('mcpu', 'MCP-Universe leaderboard', 'https://mcp-universe.github.io/', '2026-08-23', 'leaderboard', read=R4)
S('mcpmark', 'MCPMark leaderboard (updated 15 December 2025)', 'https://mcpmark.ai/leaderboard', '2025-12-15', 'leaderboard', read=R4)
S('metryaml', 'METR time horizons data (benchmark_results_1_1.yaml)', 'https://metr.org/assets/benchmark_results_1_1.yaml', '2026-05-08', 'leaderboard', read=R4)
S('metrpage', 'METR time horizons page', 'https://metr.org/time-horizons/', '2026-05-08', 'page', read=R4)
S('gdpvalblog', 'OpenAI, GDPval', 'https://openai.com/index/gdpval/', '2025-09-25', 'vendor')
S('valslegal', 'Vals AI, Legal Research Bench leaderboard', 'https://www.vals.ai/benchmarks/legal_research', R4, 'leaderboard', read=R4)
S('bfclcsv', 'BFCL leaderboard data (data_overall.csv, updated 12 April 2026)', 'https://gorilla.cs.berkeley.edu/data_overall.csv', '2026-04-12', 'leaderboard', read=R4)

# SWE-bench Pro (V1) and V2
U('swebench_pro', st='retired', it=I('1,865 problems from 41 repositories: public 731, commercial 276, held-out 858', AX('2509.16941'), n=1865, q='SWE-BENCH PRO contains 1,865 problems'),
  why='Scale marked the V1 board deprecated and replaced it with V2 on 22 September 2026 after finding 89 of 731 public tasks invalid.')
EV('swebench_pro', E(61.5, '%', 'Muse Spark 1.1', R4, 'V1 public set, Scale run, mini-swe-agent harness, 250 turns (plus or minus 3.1)', 'ind', 'scalepro1'),
   E(51.5, '%', 'Muse Spark 1.1', R4, 'V1 commercial (private) set, same harness (plus or minus 5.5)', 'ind', 'scalepro1'),
   E(80.3, '%', 'Claude Mythos 5', '2026-07', 'V1 public, vendor scaffold (Anthropic\'s figure as quoted on OpenAI\'s GPT-5.6 table)', 'lab', 'oai56'))
ISS('swebench_pro', X('Berkeley RDI scored 100% on the public set with a conftest.py hook that marks every test passed.', 'rdi'))
CORR('swebench_pro', C('"~59-80% depending on split/scaffold" and "Active headline coding-agent benchmark"', 'V1 is deprecated. Its last independent tops: 61.5% public, 51.5% commercial (Muse Spark 1.1, Scale\'s harness); about 80% are vendor-scaffold lab figures. The 47 to 80% span mixed independent private-set runs with vendor public-set runs.', 'scalepro1'))
U('swebench_pro_v2', st='saturated', it=I('642 public tasks from 11 repositories (731 minus 89 invalid), a 51-task Hard subset, and a 272-task private set; agents network-locked to the model endpoint', 'scalepro2', n=642),
  why='Near the ceiling on the public split within a day of release (99.4%), while the same model resolves 81.6% of the private set: Scale itself says the private set is the only clean measurement.')
BY['swebench_pro_v2']['ev'] = [E(99.4, '%', 'Claude Opus 5 (Claude Code, xhigh)', '2026-09-22', 'V2 public (642), pass@1, network-locked (plus or minus 0.4)', 'ind', 'scalepro2'),
                               E(81.6, '%', 'Claude Opus 5', '2026-09-22', 'V2 private set (222 of 272)', 'ind', 'scalepro2blog'),
                               E(98.0, '%', 'Claude Opus 5 (Claude Code, xhigh)', '2026-09-22', 'V2 Hard subset (51 tasks)', 'ind', 'scalepro2')]
BY['swebench_pro_v2']['cont'] = {'t': 'Scale attributes near-ceiling public scores plausibly to training-time exposure of the public repositories and fixing commits; Opus 5 is 17.8 points lower on the private set.', 's': 'scalepro2blog'}
ISS('swebench_pro_v2', X('Re-grading on a pristine image caught a model forging a Go module checksum; in an earlier open-network run 4 of 642 trajectories retrieved the fixing commit.', 'scalepro2'))
BY['swebench_pro_v2']['corr'] = [C('"Active and deliberately unsaturated: the strongest models reach only about 23% on the public set"', 'Wrong: the V2 public top is 99.4% (Claude Opus 5, 22 September 2026). The 23% is boilerplate on Scale\'s page about the original 2025 V1 launch (GPT-5 23.3%).', 'scalepro2blog'),
                                  C('"smaller models collapse specifically on multi-file scenarios"', 'Unconfirmed: not on Scale\'s V2 page or blog.', 'scalepro2blog')]
U('swe_rebench', it=I('Current window: 111 problems from 65 repositories, dated 15 May to 1 July 2026, 5 runs per model', 'rebench', n=111))
EV('swe_rebench', E(64.5, '%', 'Claude Fable 5 (high)', R4, 'window 2026-05-15 to 2026-07-01, mean of 5 runs (SEM 1.41), 128k context limit', 'ind', 'rebench'))
ISS('swe_rebench', X('The top five sit within about 2 points with SEMs of 0.6 to 1.8, so the top ranks are not separable; Opus 5.5, Fable 5.1 and GPT-6 Astra are not on it yet.', 'rebench'))
U('swebench_mm', st='retired', why='No submission since November 2025 and no 2026 frontier entry; the top is 36%.')
EV('swebench_mm', E(35.98, '%', 'GUIRepair + o3', '2025-07-01', 'Multimodal leaderboard, 1 attempt', 'ind', 'swebjson'))
EV('swebench', E(52.62, '%', 'Sonar Foundation Agent + Claude Opus 4.5', '2025-12-19', 'full test set, 1 attempt (Lite\'s last entry: September 2025)', 'ind', 'swebjson'))
ISS('swebench_verified', X('The swebench.com Verified board\'s last entry is 26 February 2026 (top 79.2%); the bash-only board was dropped on 1 September 2026.', 'swebjson'))
U('real_swe', why='The repositories are not public, so tasks cannot leak; the leader is in the mid-40s. With 10 tasks, one task moves a model about 10 points.')
EV('real_swe', E(46.25, '%', 'GPT-6 Astra (Codex CLI)', R4, 'pass@1 averaged over 8 runs per task, native harness', 'ind', 'realswe'),
   E(38.8, '%', 'Claude Fable 5.1 (Claude Code)', '2026-09-12', 'launch reading, as reported', 'ind', 'runtimewire'))
ISS('real_swe', X('Scores were revised after launch without a dated changelog (Fable 5.1 38.8% at launch, 45.0% now).', 'realswe'))
CORR('real_swe', C('"Fable 5.1 leads at 38.8%, roughly 20 points below the same models\' Terminal-Bench 4.0 scores"', 'The 38.8% was the launch reading; the page now shows GPT-6 Astra 46.25% and Fable 5.1 45.0%, about 12 to 13 points below their official Terminal-Bench 4.0 scores, not 20.', 'realswe'))
U('livecodebench', st='retired', it=I('1,055 problems (release_v6), contest dates May 2023 to April 2025', 'lcbjson', n=1055),
  why='The official board stops at April 2025 problems, so every 2026 model has seen the whole time span: the rolling defence only works while releases continue.')
EV('livecodebench', E(80.2, '%', 'o4-mini (high)', '2025-04-07', 'official board, pass@1 on problems 1 Aug 2024 to 7 Apr 2025 (454 problems), computed from the board\'s data', 'ind', 'lcbjson'))
CORR('livecodebench', C('"Active; frontier ~90%+ on recent windows, saturating"', 'Unsourced and stale: the official board froze with April 2025 problems, best about 80%; 90%+ figures are vendor runs on their own windows.', 'lcbjson'))
U('lcb_pro', st='retired', why='The site is offline (GitHub Pages 404) and ratings stop at November 2025 contests.')
EV('lcb_pro', E(3298, 'rating', 'Gemini 3 Deep Think', '2025-11-17', 'Codeforces-scale rating, last rated contest Round 1064', 'ind', 'lcbpro'))
CORR('lcb_pro', C('"Active frontier benchmark"', 'Dormant: site offline, ratings frozen at November 2025 (top 3298, Gemini 3 Deep Think).', 'lcbpro'))
EV('codeforces', E(3471, 'rating', 'DeepSeek V4.1 Flash', '2026-09-10', 'vendor-reported Codeforces rating; method not stated', 'lab', 'dsnotes', q='Codeforces (Rating): 3471'))
U('bigcodebench', st='retired', why='The board stopped in April 2025 at 62.4% (Full) and 40.5% (Hard): unmaintained rather than saturated.')
EV('bigcodebench', E(62.4, '%', 'Gemini-Exp-1206', '2024-12-06', 'Full, Complete split, calibrated pass@1', 'ind', 'bcbjson'))
CORR('bigcodebench', C('"Saturating"', 'Not saturated but abandoned: board tops are 62.4% (Full) and 40.5% (Hard), with no models after April 2025.', 'bcbjson'))
EV('mbpp_evalplus', E(80.2, '%', 'o1-preview', '2024-09', 'EvalPlus MBPP+ (v0.2.0, 378 tasks), pass@1; base MBPP 95.5%', 'ind', 'evalplus'))

# Terminal-Bench
EV('tb1', E(64.5, '%', 'Apex2 agent + Claude Sonnet 4.5', '2025-10-15', 'Terminal-Bench 1.0 (Core) board, agent and model pair; board frozen', 'ind', 'tb1wb'))
U('tb2', it=I('89 tasks; 2.1 (6 May 2026) fixed 28 of them', AX('2601.11868'), n=89, q='composed of 89 tasks'),
  why='Official tops of 84.7% (2.0) and 83.8% (2.1), lab figures above 90% on 2.1, no task left unsolved after 2.1, and replaced by 3.0 and 4.0.')
BY['tb2']['ev'] = [E(84.7, '%', 'NexAU-AHE agent + GPT-5.5', '2026-05-14', 'Terminal-Bench 2.0 board, 5 trials (plus or minus 2.1)', 'ind', 'tb20wb'),
                   E(83.8, '%', 'Claude Code + Claude Fable 5 (xhigh)', '2026-06-07', 'Terminal-Bench 2.1 board (plus or minus 1.2); not the same scale as 2.0', 'ind', 'tb21wb'),
                   E(91.9, '%', 'GPT-5.6 Sol Ultra (four parallel agents)', '2026-07', 'Terminal-Bench 2.1, OpenAI\'s table', 'lab', 'oai56')]
ISS('tb2', X('2.1 fixed 28 of 89 tasks and most pairs score higher on it (Opus 4.6 in Claude Code +12.1 points), so 2.0 and 2.1 are different scales.', 'tb21news'))
CORR('tb2', C('"2.0 ... reached ~92% (GPT-5.6-class) by Aug 2026"', 'Mislabelled: the 92% figures are lab numbers on 2.1 (GPT-5.6 Sol Ultra with four parallel agents 91.9%; Cognition\'s self-reported 92.8%). The official 2.0 top is 84.7%, the 2.1 top 83.8%.', 'oai56'))
U('tb4', why='The official board\'s top is 58.2% (GPT-6 Astra in Codex); the version reset gave it headroom again.')
BY['tb4']['ev'] = [E(58.18, '%', 'Codex + GPT-6 Astra (max)', '2026-09-03', 'official Terminal-Bench 4.0 board, 5 trials per task (plus or minus 2.79), board updated 21 September 2026', 'ind', 'tbench'),
                   E(57.88, '%', 'Claude Code + Claude Fable 5.1', '2026-09-01', 'official board (plus or minus 3.76)', 'ind', 'tbench')] + [e for e in BY['tb4']['ev']] + [
                   E(66.4, '%', 'Claude Opus 5.5 (xhigh)', '2026-09-22', 'Anthropic\'s own setup; Opus 5.5 not yet on the official board', 'lab', 'anthr55')]
CORR('tb4', C('"Claude Opus 5.5 66.4%, GPT-6 Astra 57.9%, Claude Fable 5.1 55.8%, Claude Opus 5 52.3%, Grok 4.7 38.0%"', 'These are lab figures from Anthropic\'s Opus 5.5 table (Astra\'s as reported by OpenAI). The official board reads Astra 58.18%, Fable 5.1 57.88%, Opus 5 53.94% (xhigh), Grok 4.7 37.6%; Opus 5.5 is not on it yet.', 'tbench'))
U('tb_science', why='Launched at 30% (27 August 2026); the official board now reads 68.1%. Unsaturated, but the fastest-falling headline on the page.')
BY['tb_science']['ev'] = [E(68.1, '%', 'Codex + GPT-6 Astra (max)', '2026-09-03', 'official board, 3 trials per task (plus or minus 3.2)', 'ind', 'tbsciboard'),
                          E(63.3, '%', 'Claude Code + Claude Opus 5.5 (max)', '2026-09-22', 'official board (plus or minus 3.3)', 'ind', 'tbsciboard'),
                          E(30.0, '%', 'Claude Code + Claude Opus 5', '2026-08-27', 'launch results', 'ind', 'tbsci01')] + BY['tb_science']['ev']
BY['tb_science']['corr'] = [C('"52.6% a week later (Claude Fable 5.1)" and "34.6 points of headroom in roughly seven weeks"', 'Launch was 27 August 2026. 52.6% is Anthropic\'s own-setup figure; the official board lists Fable 5.1 at 40.0% and Artificial Analysis at 43.3%. On the official board the top went from 30.0% to 68.1% (GPT-6 Astra, dated 3 September): the old arithmetic mixed lab and board numbers.', 'tbsciboard')]
ISS('tb_science', X('Lab self-runs and the board disagree for the same model: Fable 5.1 52.6% against 40.0%, Opus 5.5 58.7% against 63.3%, Astra 64.6% against 68.1%.', 'tbsciboard'))

# OSWorld
EV('osworld', E(66.2, '%', 'AskUI VisionAgent', '2025-11-05', 'original task set, self-reported board, screenshot track, 100 steps', 'ind', 'oswself'))
CORR('osworld', C('"the Verified revision that exists because roughly 300 tasks or checkers were broken"', 'The OSWorld team fixed "300+ issues" (feedback items: changed websites, blocks, ambiguous instructions, fragile evaluators), not 300 distinct broken tasks of 369.', 'oswvblog'))
U('osworld_verified', why='The best agent framework scores 90.2% and the best bare model 86.0%, both above the 72% human figure.')
EV('osworld_verified', E(90.19, '%', 'Intelligence-Indeed Agent (framework)', '2026-07-25', 'OSWorld-Verified, 100 steps, single rollout, 325.6 of 361', 'ind', 'oswv'),
   E(85.96, '%', 'Claude Fable 5 (1M context)', '2026-08-01', 'bare model, 100 steps, single rollout, 307.7 of 358', 'ind', 'oswv'), first=True)
U('osworld_2', n='OSWorld 2.0 (releases 2026.06.24, 2026.08.08, 2.1)', it=I('108 long-horizon workflows; an offline subset runs without internet', 'osw2json', n=108),
  met='Binary accuracy (the board\'s default) and a partial score; vendors quote partial', why='On the board\'s default binary metric the best is 44.3% (release 2.1, full set): far from saturation. Only partial-credit figures are near 80%.')
BY['osworld_2']['ev'] = [E(44.33, '%', 'Claude Opus 5 (max, batch tool)', '2026-09-17', 'release 2.1, full set, 500 steps, binary accuracy (partial 77.67)', 'ind', 'osw2json'),
                         E(48.65, '%', 'Claude Opus 5 (max, batch tool)', '2026-09-17', 'release 2.1, offline set, binary (partial 79.2)', 'ind', 'osw2json')] + BY['osworld_2']['ev'] + [
                         E(81.8, '%', 'Claude Opus 5.5', '2026-09-22', 'labelled "OSWorld 2.1", PARTIAL score, set not stated', 'lab', 'anthr55'),
                         E(72.6, '%', 'GPT-6 Astra', '2026-09-02', 'release 2026.08.08, OFFLINE set, PARTIAL score', 'lab', 'oaiastra')]
ISS('osworld_2', X('Binary and partial scores on the same board differ by 30 to 40 points; three releases and full against offline sets give different numbers for one model.', 'osw2json'),
    X('OpenAI notes the Fable 5.1 system card used modified tasks and grading for its OSWorld 2.0 numbers.', 'oaiastra'))
BY['osworld_2']['corr'] = [C('"On OSWorld 2.0: Claude Opus 5.5 81.8%, Claude Opus 5 74.0%, GPT-6 Astra 72.6%, GPT-6 Sol 60.5% ... Active but nearing saturation"', 'These are partial-credit scores, not success rates, and not one scale: Anthropic\'s are labelled OSWorld 2.1 (set unstated), OpenAI\'s are release 2026.08.08 offline. The board\'s default binary metric tops at 44.3% (Opus 5, release 2.1): far from saturation.', 'osw2json')]

# web, tools, work
EV('gaia', E(93.69, '%', 'multi-model agent (Qwen3.8 Max, DeepSeek V4 Pro, Claude Opus 5)', '2026-09-22', 'private test set, submitted answers (L1 98.9, L2 93.1, L3 85.7)', 'ind', 'gaialb'))
ISS('gaia', X('The leaderboard takes uploaded answers with no sandboxed run; a scorer bug splits "1,500" into a list, so "1500" is marked wrong.', 'rdi'))
EV('webarena', E(74.3, '%', 'WebTactix (DeepSeek V3.2)', '2026-02', 'official leaderboard sheet, success rate', 'ind', 'walb'))
ISS('webarena', X('Berkeley RDI reached about 100% by navigating to file:// and reading gold answers from local task configs.', 'rdi'))
EV('taubench', E(85.43, '%', 'Gemini 3.0 Pro', '2025-11-18', 'legacy v1 task set, mean pass^1 over retail, airline and telecom', 'lab', 'taub'))
ISS('taubench', X('Sierra fixed 50+ airline and retail tasks; legacy results are not directly comparable to current submissions.', 'taub'))
U('tau2', st='saturating', why='The text core\'s telecom domain is near 98% pass^1 and the core board has no 2026 frontier models; the live frontier moved to tau3-Banking (top 55%) and tau3-Voice.')
EV('tau2', E(87.91, '%', 'Qwen3.5-397B-A17B', '2026-03-02', 'core board v1.0.1, mean pass^1 (retail 84.4, airline 81.5, telecom 97.8), 4 trials', 'ind', 'taub'),
   E(55.15, '%', 'Qwen 3.8 Max (xhigh)', '2026-08-04', 'tau3-Banking (knowledge retrieval over about 700 documents), pass^1; a different domain set', 'ind', 'taub'))
ISS('tau2', X('Scores depend on the user-simulator model (GPT-5.2 now, GPT-4.1 for older rows) and the scaffold.', 'taub'))
U('hyper_tau', it=I('A developer agent builds a customer-service agent from a simulated business\'s records; scored on held-out tasks', 'hypertau'))
BY['hyper_tau']['ev'] = [E(23.9, '%', 'Claude Opus 5 (max) in Claude Code, alone', '2026-09-08', 'held-out tasks', 'ind', 'hypertau'),
                         E(82.2, '%', 'an engineer with deep context working with the same class of model', '2026-09-08', 'same tasks, human plus model reference', 'ind', 'hypertau')]
CORR('hyper_tau', C('"82.2% paired with an engineer ... a 3.4x gap on identical work"', 'Confirmed (3.44 times), with a nuance: the 82.2% is an engineer paired with the same class of model, a human-plus-model reference rather than the same configuration.', 'hypertau'))
U('automationbench', n='AutomationBench 1.0.6 (Zapier)', by='Zapier; also run by Artificial Analysis as AutomationBench-AA (a different, partial-credit metric)', paper='zapier',
  it=I('Held-out private set (657 tasks implied) over 47 tools; a public 600-task set for research', 'zapier', n=657),
  why='The leader is near 51%: far from saturation, with a price per task beside every score.')
BY['automationbench']['ev'] = [E(51.29, '%', 'Gemini 4 Argon (high)', '2026-10-01', 'AutomationBench 1.0.6, held-out set, $1.70 per task', 'ind', 'zapier')] + BY['automationbench']['ev'] + [
                               E(33.2, '%', 'GPT-6 Sol (xhigh)', '2026-09-22', 'AutomationBench 1.0.6, $0.27 per task (OpenAI\'s post citing Zapier)', 'lab', 'oaisol')]
ISS('automationbench', X('Safety-classifier fallbacks change scores: Fable 5.1\'s 31.4% includes about 40% of tasks completed by Opus 5 as fallback.', 'zapier'),
    X('Most failures involve false confidence: models declare success while failing (72% of Opus\'s failures, 91% of Gemini\'s).', 'zapier'))
CORR('automationbench', C('"GPT-6 Sol 33.2% at high effort for $0.27 per task, Claude Opus 5 26.9% at roughly nine times the cost"', 'GPT-6 Sol\'s setting is xhigh, and OpenAI\'s table puts Opus 5 at 11.1 times the cost. The current leader is Gemini 4 Argon (51.29%, Zapier\'s board).', 'oaisol'))
U('agents_last_exam', by='Berkeley RDI with 300+ experts; leaderboard hosted by Snorkel', paper='aleorg',
  it=I('147 public tasks (of a 1,500+ task corpus) across 55 sub-industries', 'aleorg', n=147),
  met='Pass rate (strict) and score (partial credit)', gr=['rubric'], why='The best pass rate is 38% (Claude Opus 5.5): far from saturation.')
BY['agents_last_exam']['ev'] = [E(38.2, '% pass rate', 'Claude Opus 5.5 (max, Claude Code)', R4, 'default view, strict pass rate (partial score 63.2%)', 'ind', 'ale'),
                                E(56.4, '% score', 'GPT-6 Sol (max)', '2026-09-22', 'OpenAI-reported; the partial score metric (board pass rate 32.2%)', 'lab', 'oaisol')]
CORR('agents_last_exam', C('"single reported figure: GPT-6 Sol 56.4% ... Nothing independent yet"', 'An independent leaderboard exists, led by Claude Opus 5.5 (38.2% pass rate, 63.2% score); OpenAI\'s 56.4% is the partial score, not the pass rate.', 'ale'))
EV('agentbench', E(70.4, '%', 'AgentRL with Qwen2.5-32B-Instruct', '2025-10', 'AgentBench FC (5 environments), average success', 'ind', 'agentbenchgh'))
U('browsecomp', why='Vendor tops of 90 to 92%, mixing single-agent and multi-agent setups; no independent leaderboard, and Anthropic dropped it from the Opus 5.5 table.')
EV('browsecomp', E(91.5, '%', 'GPT-6 Astra', '2026-09-02', 'single model, max over efforts', 'lab', 'oaiastra'),
   E(92.2, '%', 'GPT-5.6 Sol Ultra (four parallel agents)', '2026-07', 'multi-agent setting', 'lab', 'oai56'))
U('mcp_evals', st='retired', why='Both public boards stopped in late 2025 (no 2026 frontier entries); vendors now quote Scale\'s MCP Atlas.')
EV('mcp_evals', E(44.59, '%', 'Gemini 3 Pro Preview', '2026-08-23', 'MCP-Universe overall success rate', 'ind', 'mcpu'),
   E(57.5, '%', 'GPT-5.2 (high)', '2025-12-15', 'MCPMark pass@1 (pass^4 44.9%)', 'ind', 'mcpmark'))
CORR('mcp_evals', C('"Active, young"', 'Dormant: MCPMark last updated December 2025, MCP-Universe tops are 2025 models; vendors moved to MCP Atlas.', 'mcpmark'))
U('metr_horizon', st='saturating', why='The best measured 50% horizon (about 17 hours) is beyond the 16 hours METR calls reliable for its task suite, and no Opus 5.x, Fable or GPT-6 measurement exists yet.')
BY['metr_horizon']['ev'] = [E(1045, 'minutes (50% horizon)', 'Claude Mythos Preview (early)', '2026-05-08', 'METR-Horizon v1.1, 95% interval 509 to 3,304 minutes; 80% horizon 186 minutes', 'ind', 'metryaml')]
CORR('metr_horizon', C('"the doubling every ~7 months metric"', 'METR\'s current v1.1 file gives a doubling time of 128.7 days (about 4.2 months) from 2023 on, and 187.8 days (about 6.2 months) over the whole stitched series.', 'metryaml'))
U('gdpval', st='saturating', it=I('1,320 tasks across 44 occupations; 220-task gold subset public', AX('2510.04374'), n=1320, q='a gold subset of 220 tasks'),
  why='Several models win or tie against professionals more than 80% of the time; later cards moved to GDPval-AA.')
EV('gdpval', E(84.9, '% wins or ties', 'GPT-5.5', '2026-04-23', 'OpenAI-run GDPval, wins or ties against professionals', 'lab', 'oai55'), first=True)
U('vals_legal', it=I('413 lawyer-written questions: 5 public, 200 private validation (licensable), 208 test; all-pass rubric, LLM judge', 'valslegal', n=413),
  why='The test-set top is 55% all-pass (90% with partial credit), and retrieval moves the same weights by 15 points.')
BY['vals_legal']['ev'] = [E(55.29, '%', 'Muse Spark 1.3, Claude Opus 5 and Claude Fable 5.1 (tie)', R4, 'test set, all-pass (GPT-6 Astra 39.42%)', 'ind', 'valslegal'),
                          E(54.0, '%', 'Astra for Law (GPT-6 Astra plus a legal index)', '2026-09-17', '200-question private validation set; GPT-6 Astra with web search 38.7%', 'lab', 'oailaw')]
U('edgebench', by='ByteDance Seed', it=I('134 tasks, 51 released publicly', 'solpage', n=134),
  met='Average score (cost per hour is the SoL-Pi paper\'s derived metric, not EdgeBench\'s)')
CORR('edgebench', C('"51 agent tasks reporting cost per hour alongside success"', '51 is the public part of 134 tasks, made by ByteDance Seed; EdgeBench reports an average score, and cost per hour is SoL-Pi\'s derived metric.', 'solpage'))
U('bfcl', why='v4 adds agentic categories but the board has not been updated since 12 April 2026 and lacks current frontier models.')
EV('bfcl', E(77.47, '%', 'Claude Opus 4.5 (function calling)', '2026-04-12', 'BFCL v4 overall accuracy', 'ind', 'bfclcsv'))
CORR('bfcl', C('"Active (v4 is agentic)"', 'v4 is agentic, but the board stopped on 12 April 2026 with no 2026 frontier models.', 'bfclcsv'))


# ==== orchestrator cross-checks (other tabs' sources) ====
S('opus55_osw', 'Anthropic, Claude Opus 5.5 system card, section 8.13.3 (OSWorld 2.0, September 10 task files, new harness)', 'https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf', '2026-09-22', 'vendor')
S('opus55_t81', 'Anthropic, Claude Opus 5.5 system card, Table 8.1.A (HLE with and without tools)', 'https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf', '2026-09-22', 'vendor')
EV('hle', E(64.4, '%', 'Claude Opus 5.5', '2026-09-22', 'full HLE, NO tools, Anthropic\'s run (67.7% with tools; Opus 5: 56.6% without, 63.6% with)', 'lab', 'opus55_t81'))
CORR('hle', C('"Search access moves the number by 10 to 20 points"', 'In Anthropic\'s own runs tools add 3.3 points (Opus 5.5: 64.4 to 67.7) and 7.0 (Opus 5: 56.6 to 63.6).', 'opus55_t81'))
EV('osworld_2', E(37.2, '% strict', 'Claude Opus 5', '2026-09-22', 'Anthropic\'s re-run on the 10 September task files with a new context harness, strict pass rate (partial 74.0%; Opus 5.5 48.7% strict, 81.8% partial)', 'lab', 'opus55_osw'))
CORR('osworld_2', C('"Claude Opus 5 74.0%"', 'Unconfirmed as a leaderboard figure: it is Anthropic\'s partial score on the 10 September task files with a changed harness (strict 37.2%). The maintainers\' runs for Opus 5 (max) read 31.4% binary and 68.3% partial (release 2026.08.08) and 44.3% binary and 77.7% partial (release 2.1).', 'opus55_osw'))
ISS('tb4', X('One model, one board: GPT-6 Astra ranges from 50.6% to 58.2% pass@1 across effort levels on the official leaderboard.', 'tbench'))
ISS('aime', X('AIME 2026 reached 98.3% from GPT-5.2 (high), a model already public on the day of the contest, so even the freshest vintage was near the ceiling at once.', 'maaime26'))
EV('truthfulqa', E(58, '% truthful', 'best model in the 2021 paper (GPT-3 family); humans 94%', '2021-09-08', 'generation task, original paper', 'ind', AX('2109.07958'), q='The best model was truthful on 58% of questions'))
