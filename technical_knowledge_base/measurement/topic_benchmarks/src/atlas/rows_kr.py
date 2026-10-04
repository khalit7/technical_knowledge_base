"""Atlas rows: knowledge, reasoning and science QA. Owner 'kr' = Knowledge and reasoning benchmarks child page."""
from lib import R, S, E, I, X, C, AX, AA, EP, GRID

S('redux', 'Gema et al., Are We Done with MMLU? (MMLU-Redux)', 'https://arxiv.org/abs/2406.04127', '2024-06-06', 'paper')
AX('2406.04127')
S('o1', 'OpenAI, Learning to reason with LLMs (o1 evals table)', 'https://openai.com/index/learning-to-reason-with-llms/', '2024-09-12', 'vendor')
S('fh', 'FutureHouse, About 30% of Humanity\'s Last Exam chemistry/biology answers are likely wrong', 'https://www.futurehouse.org/research/hle-exam', '2025-07', 'analysis')

R(id='mmlu', n='MMLU', fam='know', yr=2020, by='Hendrycks et al. (UC Berkeley)', paper=AX('2009.03300'),
  me='Breadth of academic and professional knowledge across 57 subjects', fmt='4-option multiple choice', met='Accuracy (5-shot originally; 0-shot chain of thought in later reports)',
  it=I('15,908 questions in 57 subjects', AX('2009.03300'), n=15908, q='57 tasks'),
  gr=['exact'], cd=['none'], st='saturated',
  ev=[EP('mmlu_external.csv', 'gpt-4o-2024-11-20', '5-shot, log-likelihood scoring as reported in the Phi-4 report', note='Highest MMLU row in Epoch\'s hub; labs stopped reporting MMLU on 2026 frontier cards, so there is no current frontier reading.')],
  why='Top reported scores sit close to the ceiling MMLU-Redux implies (about 6.5% of questions contain an error), so a gap between frontier models is mostly answer-key noise.',
  iss=[X('MMLU-Redux re-annotated 5,700 questions and estimates 6.49% contain an error; 57% of analysed Virology questions are flawed.', AX('2406.04127'))],
  own='kr', old='MMLU', rel=['mmlu_pro', 'global_mmlu'])

R(id='mmlu_pro', n='MMLU-Pro', fam='know', yr=2024, by='TIGER-Lab (Wang et al.)', paper=AX('2406.01574'),
  me='Harder, reasoning-heavy MMLU successor', fmt='10-option multiple choice', met='Accuracy, chain of thought',
  it=I('12,032 questions across 14 disciplines', AX('2406.01574'), n=12032),
  gr=['exact'], cd=['none'], st='saturating',
  why='Frontier scores cluster near 90% on a 10-option test; it still separates mid-tier and open models.',
  iss=[X('Ten options cut the guessing floor to 10% and the paper reports prompt sensitivity falling from 4-5% to 2%.', AX('2406.01574'))],
  own='kr', old='MMLU-Pro', rel=['mmlu'])

R(id='gpqa', n='GPQA Diamond', fam='know', yr=2023, by='Rein et al. (NYU, Cohere, Anthropic)', paper=AX('2311.12022'),
  me='Graduate-level, "Google-proof" biology, physics and chemistry', fmt='4-option multiple choice', met='Accuracy (good reports average over option shuffles)',
  it=I('448 questions; Diamond is the 198-question subset both experts answered correctly and most non-experts missed', AX('2311.12022'), n=198, q='448 multiple-choice questions'),
  gr=['exact'], cd=['none'], st='saturated',
  ev=[EP('gpqa_diamond.csv', 'gpt-6-astra_max', 'Diamond, 198 questions, Epoch\'s own run, best across scorers')],
  why='Three frontier models within half a point of each other near 96% on 198 questions: the 95% binomial interval is about plus or minus 3 points, so the top no longer separates; Artificial Analysis removed it from its index at v4.2 as saturated.',
  iss=[X('Experts reach 65% (74% discounting clear mistakes), so part of the remaining errors are disputed items rather than model failures.', AX('2311.12022'))],
  own='kr', old='GPQA Diamond', rel=['aa_index'])

R(id='hle', n="Humanity's Last Exam (HLE)", fam='know', yr=2025, by='Center for AI Safety and Scale AI', paper=AX('2501.14249'),
  me='Expert-written frontier questions selected because 2024 models failed them', fmt='Exact-answer and multiple choice, about 14% multimodal', met='Accuracy, graded by an LLM judge; calibration error also reported',
  it=I('2,500 questions', AX('2501.14249'), n=2500, q='HLE consists of 2,500 questions'),
  gr=['judge', 'exact'], cd=['private'], st='active',
  ev=[GRID('hle', note='Artificial Analysis\'s own run inside Intelligence Index v4.3; tools off.')],
  why='The best independent run is near 60%, far below the ceiling, though part of the gap is answer-key error rather than model failure.',
  iss=[X('HLE-Verified validated 668 items as correct and released 689 as an uncertain set; part of the unsolved residue is unfixable noise.', AX('2602.13964')),
       X('Experts re-grading HLE-Physics removed 86 of 202 questions as defective; GPT-5.6 Sol rose from 47.3% to 78.7% on the 116 kept.', AX('2609.13009'))],
  own='kr', old="HLE (Humanity's Last Exam)", rel=['critpt'])

R(id='simpleqa', n='SimpleQA (and SimpleQA Verified)', fam='know', yr=2024, by='OpenAI (Verified: Google DeepMind, 2025)', paper=AX('2411.04368'),
  me='Short-form factual recall and whether the model abstains instead of hallucinating', fmt='Short open answers', met='Correct / incorrect / not attempted (Verified: F1 of correct and attempted)',
  it=I('4,326 questions (SimpleQA); 1,000 prompts (SimpleQA Verified)', AX('2509.07968'), n=4326, q='a 1,000-prompt benchmark'),
  gr=['judge'], cd=['none'], st='active',
  ev=[EP('simpleqa_verified.csv', 'gpt-6-astra_max', 'SimpleQA Verified (1,000 prompts), Epoch\'s own run; not comparable with original SimpleQA scores')],
  why='Top score near 75% on the cleaned set, and abstention versus hallucination is still the property reported.',
  own='kr', old='SimpleQA')

R(id='hellaswag_wino_arc', n='HellaSwag / WinoGrande / ARC-Challenge', fam='reas', yr=2018, by='AI2 and University of Washington',
  paper=AX('1905.07830'),
  mem=[{'n': 'HellaSwag (2019)', 's': AX('1905.07830')}, {'n': 'WinoGrande (2019)', 's': AX('1907.10641')}, {'n': 'ARC, AI2 Reasoning Challenge (2018)', 's': AX('1803.05457')}],
  me='Commonsense sentence completion, pronoun resolution and grade-school science', fmt='Multiple choice (4, 2 and 4 options)', met='Accuracy',
  it=I('HellaSwag about 10,000 validation contexts; WinoGrande 44k problems; ARC 7,787 questions (Challenge set is the hard part)', AX('1803.05457'), q='7,787 questions'),
  gr=['exact'], cd=['none'], st='retired',
  ev=[EP('hella_swag_external.csv', 'gpt-4-0314', 'HellaSwag, 10-shot, GPT-4 technical report'),
      EP('wino_grande_external.csv', 'Llama-3.1-405B', 'WinoGrande, as reported in the DeepSeek-V3 technical report'),
      EP('arc_ai2_external.csv', 'GPT-4', 'ARC-Challenge, 25-shot, GPT-4 technical report')],
  why='Scores reached the mid-90s in 2023 and frontier cards dropped them; humans score above 95% on HellaSwag.',
  own='root', old='HellaSwag / WinoGrande / ARC-Challenge (AI2)')

R(id='bbh', n='BIG-Bench Hard (BBH)', fam='reas', yr=2022, by='Suzgun et al. (Google, Stanford)', paper=AX('2210.09261'),
  me='The 23 BIG-Bench tasks where 2022 models trailed average human raters', fmt='Mixed: multiple choice and short answers', met='Accuracy (few-shot, with or without chain of thought)',
  it=I('23 tasks', AX('2210.09261'), n=23, q='a suite of 23 challenging BIG-Bench tasks'),
  gr=['exact'], cd=['none'], st='saturated',
  ev=[EP('bbh_external.csv', 'gemini-1.5-pro-001', 'BBH average, as reported in the Gemini 1.5 report')],
  why='High-80s by 2024; its successor BBEH (2025) was built because BBH stopped separating models.',
  iss=[X('BIG-Bench Extra Hard replaces each task with a harder one; the best reasoning model averaged 44.8% at release.', AX('2502.19187'))],
  own='root', old='BIG-Bench Hard')

R(id='simplebench', n='SimpleBench', fam='reas', yr=2024, by='AI Explained (independent)', paper=None,
  me='Trick and commonsense questions (spatial, temporal, social) where people beat models', fmt='6-option multiple choice', met='Accuracy, average of 5 runs',
  it=I('Over 200 questions, mostly private', 'simplebench'),
  gr=['exact'], cd=['private'], st='saturating',
  ev=[EP('simplebench_external.csv', 'claude-fable-5_max', 'SimpleBench leaderboard, AVG@5')],
  why='The best model is now around the human baseline the site reports, so the gap it was built to show is closing.',
  own='root', old='SimpleBench')
S('simplebench', 'SimpleBench leaderboard and about page', 'https://simple-bench.com/', '2026-10-04', 'leaderboard', read='2026-10-04')

R(id='arc_agi_1', n='ARC-AGI-1', fam='reas', yr=2019, by='Chollet; ARC Prize Foundation', paper=AX('1911.01547'),
  me='Few-shot induction of novel grid-transformation rules (skill-acquisition efficiency)', fmt='Input-output grid puzzles', met='% tasks solved within 2 attempts, plus cost per task',
  it=I('400 public training, 400 public evaluation, plus semi-private and private evaluation sets', 'arcprize'),
  gr=['exact'], cd=['private'], st='saturated',
  ev=[EP('arc_agi_external.csv', 'gpt-6-astra_xhigh', 'ARC Prize leaderboard, semi-private set')],
  why='Top systems at 98.5% on the semi-private set; the prize track moved to ARC-AGI-2 and 3.',
  own='kr', old='ARC-AGI-1', rel=['arc_agi_2', 'arc_agi_3'])
S('arcprize', 'ARC Prize, ARC-AGI benchmark pages and leaderboard', 'https://arcprize.org/leaderboard', '2026-10-04', 'leaderboard', read='2026-10-04')

R(id='arc_agi_2', n='ARC-AGI-2', fam='reas', yr=2025, by='ARC Prize Foundation', paper=AX('2505.11831'),
  me='Harder ARC tasks calibrated so people still solve them; efficiency counted', fmt='Input-output grid puzzles', met='% tasks solved (2 attempts) and cost per task',
  it=I('120 public evaluation tasks plus semi-private and private sets', 'arcprize'),
  gr=['exact'], cd=['private'], st='saturated',
  ev=[GRID('arc', note='Cost per task $1.12.')],
  why='95% on the semi-private set exceeds the 85% Grand Prize target the Foundation set for it.',
  own='kr', old='ARC-AGI-2', rel=['arc_agi_1', 'arc_agi_3'])

R(id='arc_agi_3', n='ARC-AGI-3', fam='reas', yr=2026, by='ARC Prize Foundation', paper=None,
  me='Interactive turn-based games: explore, infer the goal and plan with no instructions', fmt='Game environments played through an API', met='Share of games completed, efficiency-weighted against human action counts',
  it=I('Public and private game sets', 'arcprize'),
  gr=['exec'], cd=['interactive', 'private'], st='active',
  why='Under the neutral standard harness the best frontier figure is far from the 100% people reach; a provider or research harness moves the same model close to the ceiling, so the harness must be named.',
  own='kr', old='ARC-AGI-3', rel=['arc_agi_2'])

R(id='critpt', n='CritPt', fam='know', yr=2025, by='CritPt collaboration (physicists); run by Artificial Analysis', paper=None,
  me='Research-level physics reasoning challenges', fmt='Open answers checked against keys', met='Accuracy',
  it=I('70 challenges', 'regrade'),
  gr=['exact'], cd=['private'], st='active',
  ev=[GRID('critpt', note='Artificial Analysis run inside Intelligence Index v4.3.')],
  why='About 32% on the official keys, but expert re-grading suggests most of the gap is broken keys and graders, so the low score overstates the headroom.',
  iss=[X('Re-grading kept 54 of 70 challenges; GPT-5.6 Sol went from 32.3% (Artificial Analysis) to 87.5% against the repaired set, and corrected pass@4 reached 94.4%.', AX('2609.13009'))],
  own='root', old=None, rel=['hle', 'aa_index'],
  corr=[C('(new row) Low CritPt scores show frontier models still struggle with research physics.', 'Most checked failures were broken questions, keys or graders; on the repaired subset the same model reaches 87.5%. Read the 32% as an upper bound on headroom, not a capability floor.', AX('2609.13009'))])
S('regrade', 'Re-grading six physics benchmarks (knowledge base paper page)', 'https://app.notion.com/p/3e25c17b0d0d8165b0c8d15600421259', '2026-09-11', 'kb')
