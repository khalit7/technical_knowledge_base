"""Atlas rows: long context, instruction following, preference, safety, multimodal, multilingual, tool use, classic era, aggregators.
Written before their child pages existed (own='root'); rows_fix.py assigns the owning child page; judge methods are on Topic: evaluation-and-llm-judges."""
from lib import R, S, E, I, X, C, AX, AA, EP, GRID

S('aaidx', 'Artificial Analysis, Intelligence Index methodology', 'https://artificialanalysis.ai/methodology/intelligence-benchmarking', '2026-10-01', 'leaderboard', read='2026-10-01')
S('aav42', 'Artificial Analysis, Intelligence Index v4.2 article', 'https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-2', '2026-09-04', 'blog')
S('aabrief', 'Artificial Analysis, AA-Briefcase evaluation page', 'https://artificialanalysis.ai/evaluations/aa-briefcase', '2026-10-01', 'leaderboard', read='2026-10-01')
S('aalcr', 'Artificial Analysis, AA-LCR evaluation page', 'https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning', '2026-10-01', 'leaderboard', read='2026-10-01')
S('gdppdf', 'Surge AI, GDP.pdf leaderboard', 'https://surgehq.ai/benchmarks/gdp-pdf', '2026-10-04', 'leaderboard', read='2026-10-04')
S('lmarena', 'Arena (then LMArena) text leaderboard', 'https://lmarena.ai/leaderboard/text', '2026-10-01', 'leaderboard', read='2026-10-01')
S('niah', 'Kamradt, LLMTest_NeedleInAHaystack (GitHub)', 'https://github.com/gkamradt/LLMTest_NeedleInAHaystack', '2023-11', 'code')
S('fictionlive', 'Fiction.live, Fiction.liveBench leaderboard', 'https://fiction.live/stories/Fiction-liveBench/oQdzQvKHw8JyXbN87', '2026-10-04', 'leaderboard', read='2026-10-04')
S('mmmlu', 'OpenAI, MMMLU dataset (Hugging Face)', 'https://huggingface.co/datasets/openai/MMMLU', '2024-09', 'data')
S('bfcl', 'Berkeley Function Calling Leaderboard', 'https://gorilla.cs.berkeley.edu/leaderboard.html', '2026-10-04', 'leaderboard', read='2026-10-04')
S('imagenet09', 'Deng et al., ImageNet: A large-scale hierarchical image database (CVPR 2009)', 'https://doi.org/10.1109/CVPR.2009.5206848', '2009-06', 'paper')

# ---- aggregators ----
R(id='aa_index', n='Artificial Analysis Intelligence Index', fam='agg', yr=2024, by='Artificial Analysis', paper='aaidx',
  me='One number per model, a weighted average of about ten evaluations run by Artificial Analysis', fmt='Composite of component evaluations', met='Index points (only comparable within one index version)',
  it=I('Component list changes by version (v4.2 dropped GPQA Diamond; v4.3 moved Terminal-Bench 2.1 to 4.0)', 'aaidx'),
  gr=['exact', 'judge', 'exec'], cd=['private'], st='active',
  why='An index has no ceiling of its own, but each version is a different scale: a figure without its version is not comparable.',
  iss=[X('v4.2 (4 Sep 2026) removed GPQA Diamond and added AA-Briefcase and GDP.pdf; private held-out sets rose to 40% of the weight.', 'aav42')],
  own='root', old=None, rel=['gpqa', 'aa_briefcase', 'gdp_pdf', 'tb4', 'gdpval_aa', 'automationbench', 'hle', 'critpt', 'aa_lcr'])

R(id='aa_briefcase', n='AA-Briefcase', fam='agent', yr=2026, by='Artificial Analysis', paper='aabrief',
  me='Agentic knowledge work producing analyst-style deliverables', fmt='Private test set, deliverables compared head to head', met='Elo (and a rubric pass rate)',
  it=I('Private test set', 'aabrief'),
  gr=['judge'], cd=['private'], st='active',
  ev=[GRID('brief')],
  why='An Elo scale with no ceiling, on a private set added to the index in September 2026.',
  own='root', old='AA-Briefcase', rel=['aa_index'])

R(id='gdp_pdf', n='GDP.pdf', fam='long', yr=2026, by='Surge AI (also run by Artificial Analysis)', paper='gdppdf',
  me='Reasoning over long real-world PDF documents', fmt='Questions over a corpus of PDF pages', met='Accuracy',
  it=I('Questions across 4,592 PDF pages (old page)', 'oldpage'),
  gr=['judge'], cd=['private'], st='active',
  ev=[EP('gdp_pdf_external.csv', 'gpt-5.6-sol_max', 'Surge AI\'s own GDP.pdf leaderboard')],
  why='Top scores near 30%: nowhere near saturation.',
  own='root', old='GDP.pdf', rel=['aa_index'])

R(id='aa_lcr', n='AA-LCR', fam='long', yr=2025, by='Artificial Analysis', paper='aalcr',
  me='Long-context reasoning over sets of real documents', fmt='Questions over about 100k-token document sets', met='Accuracy',
  it=I('See evaluation page', 'aalcr'),
  gr=['judge'], cd=['private'], st='saturating',
  ev=[GRID('lcr')],
  why='The best runs are near 90%.',
  own='root', old=None, rel=['aa_index'])

# ---- long context ----
R(id='ruler', n='RULER', fam='long', yr=2024, by='NVIDIA (Hsieh et al.)', paper=AX('2404.06654'),
  me='Effective context length on synthetic retrieval, tracing, aggregation and QA', fmt='Synthetic tasks at configurable lengths', met='Accuracy against context length',
  it=I('13 tasks at lengths from 4K up', AX('2404.06654'), n=13, q='13 representative tasks'),
  gr=['exact'], cd=['interactive'], st='saturating',
  why='Generated, so contamination is not the issue; frontier models hold accuracy to their claimed lengths on its core tasks.',
  own='root', old='RULER', rel=['niah'])

R(id='longbench_v2', n='LongBench v2', fam='long', yr=2024, by='Tsinghua (THUDM)', paper=AX('2412.15204'),
  me='Realistic long-document understanding and reasoning', fmt='Multiple choice over contexts of 8k to 2M words', met='Accuracy',
  it=I('503 questions', AX('2412.15204'), n=503, q='503 challenging multiple-choice questions'),
  gr=['exact'], cd=['none'], st='active',
  own='root', old='LongBench v2')

R(id='niah', n='Needle in a Haystack (NIAH)', fam='long', yr=2023, by='Greg Kamradt (open-source test)', paper='niah',
  me='Retrieving one inserted fact from a long filler context', fmt='Single needle at varied depths and lengths', met='Retrieval accuracy by depth and length',
  it=I('Generated on demand', 'niah'),
  gr=['exact'], cd=['interactive'], st='saturated',
  why='Single-needle retrieval is solved by long-context models; it survives mainly in launch marketing.',
  own='root', old='NIAH / MRCR / Fiction.liveBench', rel=['mrcr', 'ruler'])

R(id='mrcr', n='MRCR', fam='long', yr=2024, by='Google DeepMind (Michelangelo); OpenAI open version (2025)', paper=AX('2409.12640'),
  me='Multi-round co-reference: find the k-th of several similar requests in a long conversation', fmt='Synthetic conversations with several needles (2, 4 or 8)', met='Similarity to the target answer',
  it=I('Generated sets by needle count and length', AX('2409.12640')),
  gr=['overlap'], cd=['interactive'], st='active',
  own='root', old='NIAH / MRCR / Fiction.liveBench', rel=['niah'])

R(id='fiction_live', n='Fiction.liveBench', fam='long', yr=2025, by='Fiction.live', paper='fictionlive',
  me='Comprehension of long fiction (tracking characters and facts)', fmt='Questions over stories at lengths from 0 to 192k tokens', met='Accuracy by context length',
  it=I('Stories at fixed lengths', 'fictionlive'),
  gr=['exact'], cd=['private'], st='active',
  ev=[EP('fictionlivebench_external.csv', 'gpt-5-2025-08-07_medium', '16k-token column of the Fiction.live leaderboard', note='The long columns (120k and above) are where models still differ.')],
  why='Short lengths are solved; long lengths still separate models.',
  own='root', old='NIAH / MRCR / Fiction.liveBench')

# ---- instruction following ----
R(id='ifeval', n='IFEval', fam='instr', yr=2023, by='Google (Zhou et al.)', paper=AX('2311.07911'),
  me='Following verifiable formatting instructions ("at least 300 words", "no commas")', fmt='Prompts with one or more verifiable instructions', met='% instructions or prompts satisfied (strict and loose)',
  it=I('About 500 prompts, 25 instruction types', AX('2311.07911'), q='25 types of those verifiable instructions'),
  gr=['exact'], cd=['none'], st='saturated',
  why='Frontier models are in the 90s and the instruction types are public and trainable.',
  own='root', old='IFEval', rel=['multichallenge_ifbench'])

R(id='multichallenge_ifbench', n='MultiChallenge / IFBench', fam='instr', yr=2025, by='Scale AI (MultiChallenge); AI2 (IFBench)', paper=AX('2501.17399'),
  mem=[{'n': 'MultiChallenge', 's': AX('2501.17399')}, {'n': 'IFBench', 's': AX('2507.02833')}],
  me='Multi-turn instruction retention (MultiChallenge); generalisation to unseen verifiable constraints (IFBench)', fmt='Multi-turn conversations; prompts with out-of-domain constraints', met='Judge score; constraint verifiers',
  it=I('IFBench: 58 new verifiable constraints', AX('2507.02833'), n=58, q='58 new, diverse, and challenging verifiable out-of-domain constraints'),
  gr=['judge', 'exact'], cd=['private'], st='active',
  own='root', old='MultiChallenge / IFBench', rel=['ifeval'])

# ---- human preference ----
R(id='lmarena', n='LMArena (Chatbot Arena)', fam='pref', yr=2023, by='LMSYS, now LMArena', paper=AX('2403.04132'),
  me='Crowd preference between two anonymous models on user prompts', fmt='Pairwise votes', met='Bradley-Terry rating (Elo-like), with and without style control',
  it=I('Open-ended: millions of votes; 410 models on the text board (30 Sep 2026)', 'lmarena'),
  gr=['pair'], cd=['rolling'], st='active',
  ev=[GRID('arena')],
  why='A rating with no ceiling; the top is crowded within the confidence intervals.',
  iss=[X('The Leaderboard Illusion: undisclosed private testing of many variants, unequal sampling and silent deprecations favour a few large labs.', AX('2504.20879'))],
  own='root', old='LMArena (Chatbot Arena)', rel=['arena_hard'])

R(id='arena_hard', n='Arena-Hard (v2)', fam='pref', yr=2024, by='LMSYS (Li et al.)', paper=AX('2406.11939'),
  me='Hard arena-style prompts graded offline by an LLM judge', fmt='Model answer against a baseline answer', met='Win rate against the baseline (judge)',
  it=I('500 prompts (v1); v2 adds creative-writing prompts', AX('2406.11939'), n=500, q='500 challenging prompts'),
  gr=['judge'], cd=['none'], st='saturating',
  iss=[X('A null model that outputs a constant response reached top-ranked win rates on automatic benchmarks including Arena-Hard-Auto.', AX('2410.07137'))],
  own='root', old='Arena-Hard (v2)', rel=['lmarena', 'alpacaeval'])

R(id='alpacaeval', n='AlpacaEval 2 (length-controlled)', fam='pref', yr=2023, by='Stanford (tatsu-lab)', paper=AX('2404.04475'),
  me='Instruction-following quality judged against a reference model', fmt='Model answer against GPT-4 Turbo\'s, judged by an LLM', met='Length-controlled win rate',
  it=I('805 instructions', AX('2410.07137'), n=805, q='805 samples of AlpacaEval 2.0'),
  gr=['judge'], cd=['none'], st='retired',
  why='Gameable: a constant null response scored an 86.5% length-controlled win rate.',
  iss=[X('Null model: 86.5% LC win rate on AlpacaEval 2.0.', AX('2410.07137'))],
  own='root', old='AlpacaEval 2 (LC)', rel=['arena_hard', 'mt_bench'])

R(id='mt_bench', n='MT-Bench', fam='pref', yr=2023, by='LMSYS (Zheng et al.)', paper=AX('2306.05685'),
  me='Two-turn conversation quality', fmt='Questions in 8 categories, judged by GPT-4', met='1 to 10 judge score',
  it=I('80 questions', AX('2306.05685'), n=80),
  gr=['judge'], cd=['none'], st='retired',
  why='Top models hit the ceiling of a 1 to 10 judge scale; replaced by Arena-Hard.',
  own='root', old='MT-Bench', rel=['arena_hard'])

# ---- safety ----
R(id='truthfulqa', n='TruthfulQA', fam='safe', yr=2021, by='Lin, Hilton and Evans (Oxford, OpenAI)', paper=AX('2109.07958'),
  me='Whether a model repeats popular misconceptions', fmt='Questions in 38 categories; generation and multiple-choice versions', met='% truthful (and informative); MC accuracy',
  it=I('817 questions', AX('2109.07958'), n=817, q='The benchmark comprises 817 questions'),
  gr=['judge', 'exact'], cd=['none'], st='retired',
  own='root', old='TruthfulQA')

R(id='harmbench', n='HarmBench / StrongREJECT', fam='safe', yr=2024, by='CAIS (HarmBench); Souly et al. (StrongREJECT)', paper=AX('2402.04249'),
  mem=[{'n': 'HarmBench', 's': AX('2402.04249')}, {'n': 'StrongREJECT', 's': AX('2402.10260')}],
  me='Robustness to jailbreaks and automated red teaming', fmt='Harmful behaviours attacked by red-teaming methods', met='Attack success rate (classifier or rubric judge)',
  it=I('Harmful behaviour sets (see papers)', AX('2402.04249')),
  gr=['judge'], cd=['none'], st='active',
  own='root', old='HarmBench / StrongREJECT / AgentHarm', rel=['agentharm'])

R(id='agentharm', n='AgentHarm', fam='safe', yr=2024, by='UK AI Security Institute and Gray Swan', paper=AX('2410.09024'),
  me='Whether agents carry out explicitly malicious multi-step tasks', fmt='Agent tasks with tools in 11 harm categories', met='Harm score and refusal rate',
  it=I('110 malicious agent tasks (440 with augmentations)', AX('2410.09024'), n=110, q='110 explicitly malicious agent tasks (440 with augmentations)'),
  gr=['judge', 'exec'], cd=['private'], st='active',
  own='root', old='HarmBench / StrongREJECT / AgentHarm', rel=['harmbench', 'mole'])

R(id='air_bench', n='AIR-Bench 2024', fam='safe', yr=2024, by='Stanford CRFM (HELM) and Virtue AI', paper=AX('2407.17436'),
  me='Refusal across risk categories taken from regulations and company policies', fmt='Prompts in 314 risk categories', met='Refusal rate, judged',
  it=I('5,694 prompts', AX('2407.17436'), n=5694, q='5,694 diverse prompts'),
  gr=['judge'], cd=['none'], st='active',
  own='root', old='AIR-Bench')

R(id='mask', n='MASK', fam='safe', yr=2025, by='CAIS and Scale AI', paper=AX('2503.03750'),
  me='Honesty: whether a model states what it believes when pressured to lie', fmt='Elicited belief, then a pressure prompt', met='Honesty (consistency of statement with belief)',
  it=I('Public and private splits (see paper)', AX('2503.03750')),
  gr=['judge'], cd=['private'], st='active',
  own='root', old='MASK')

# ---- multimodal ----
R(id='mmmu', n='MMMU', fam='mm', yr=2023, by='Yue et al. (OSU, Waterloo and others)', paper=AX('2311.16502'),
  me='College-level questions that need images (charts, diagrams, music sheets, chemical structures)', fmt='Mostly multiple choice, 30 subjects', met='Accuracy',
  it=I('11.5K questions', AX('2311.16502'), n=11500, q='MMMU includes 11.5K meticulously collected multimodal questions'),
  gr=['exact'], cd=['none'], st='saturating',
  own='root', old='MMMU / MMMU-Pro', rel=['mmmu_pro'])

R(id='mmmu_pro', n='MMMU-Pro', fam='mm', yr=2024, by='Yue et al.', paper=AX('2409.02813'),
  me='MMMU without questions text-only models can answer, with more options and a vision-only setting', fmt='Multiple choice (10 options); question embedded in the image', met='Accuracy',
  it=I('MMMU questions filtered and augmented (see paper)', AX('2409.02813')),
  gr=['exact'], cd=['none'], st='active',
  own='root', old='MMMU / MMMU-Pro', rel=['mmmu'])

R(id='mathvista_chartqa_docvqa', n='MathVista / ChartQA / DocVQA', fam='mm', yr=2020, by='Lu et al. (MathVista); Masry et al. (ChartQA); Mathew et al. (DocVQA)', paper=AX('2310.02255'),
  mem=[{'n': 'MathVista (2023)', 's': AX('2310.02255')}, {'n': 'ChartQA (2022)', 's': AX('2203.10244')}, {'n': 'DocVQA (2020)', 's': AX('2007.00398')}],
  me='Visual maths, chart reading and document question answering', fmt='Image plus question', met='Accuracy (DocVQA: ANLS string similarity)',
  it=I('MathVista 6,141 examples; ChartQA 9.6K human-written questions; DocVQA 50,000 questions on 12,000+ images', AX('2310.02255'), q='It consists of 6,141 examples'),
  gr=['exact', 'overlap'], cd=['none'], st='saturated',
  own='root', old='MathVista / ChartQA / DocVQA')

R(id='video_mme', n='Video-MME / VideoMMMU', fam='mm', yr=2024, by='Fu et al. (Video-MME); Hu et al. (VideoMMMU)', paper=AX('2405.21075'),
  mem=[{'n': 'Video-MME (2024)', 's': AX('2405.21075')}, {'n': 'Video-MMMU (2025)', 's': AX('2501.13826')}],
  me='Understanding videos from 11 seconds to an hour; learning knowledge from lecture videos', fmt='Multiple choice over videos, with or without subtitles', met='Accuracy',
  it=I('Video-MME: 900 videos, 2,700 questions; Video-MMMU: 300 videos, 900 questions', AX('2501.13826'), q='300 expert-level videos and 900 human-annotated questions'),
  gr=['exact'], cd=['none'], st='saturating',
  ev=[EP('video_mme_external.csv', 'video-SALMONN-2plus', 'Video-MME leaderboard, overall without subtitles', note='Epoch\'s table stops in 2025; frontier vendor figures are higher.')],
  own='root', old='Video-MME / VideoMMMU')

# ---- multilingual ----
R(id='mgsm', n='MGSM', fam='multi', yr=2022, by='Google (Shi et al.)', paper=AX('2210.03057'),
  me='GSM8K maths translated into ten typologically diverse languages', fmt='Free-form numeric answers', met='Exact match',
  it=I('250 problems in each of ten languages', AX('2210.03057'), n=250, q='250 grade-school math problems'),
  gr=['exact'], cd=['none'], st='saturated',
  own='root', old='MGSM', rel=['gsm8k'])

R(id='global_mmlu', n='Global-MMLU / MMMLU / INCLUDE', fam='multi', yr=2024, by='Cohere For AI (Global-MMLU); OpenAI (MMMLU); EPFL and others (INCLUDE)', paper=AX('2412.03304'),
  mem=[{'n': 'Global-MMLU', 's': AX('2412.03304')}, {'n': 'MMMLU', 's': 'mmmlu'}, {'n': 'INCLUDE', 's': AX('2411.19799')}],
  me='Knowledge in many languages, with culturally sensitive and regional questions', fmt='Multiple choice', met='Accuracy',
  it=I('Global-MMLU 42 languages; MMMLU 14 languages; INCLUDE 197,243 QA pairs in 44 languages', AX('2411.19799'), q='197,243 QA pairs'),
  gr=['exact'], cd=['none'], st='saturating',
  iss=[X('28% of MMLU questions need culturally sensitive knowledge, and 84.9% of geographic questions are about North America or Europe.', AX('2412.03304'))],
  own='root', old='Global-MMLU / MMMLU / INCLUDE', rel=['mmlu'])

R(id='flores', n='FLORES-200', fam='multi', yr=2022, by='Meta (No Language Left Behind)', paper=AX('2207.04672'),
  me='Machine translation across 200 languages', fmt='Professionally translated sentences in every language', met='chrF++ and spBLEU',
  it=I('About 200 languages; over 40,000 translation directions evaluated in the paper', AX('2207.04672'), q='over 40,000 different translation directions'),
  gr=['overlap'], cd=['none'], st='active',
  own='root', old='FLORES-200')

# ---- tool use ----
R(id='bfcl', n='BFCL (Berkeley Function Calling Leaderboard)', fam='tool', yr=2024, by='UC Berkeley (Gorilla)', paper='bfcl',
  me='Correct function and tool calls, from single calls to agentic multi-turn use (v4)', fmt='Function-call prompts; v3 multi-turn, v4 agentic (web search, memory)', met='AST match and execution accuracy, weighted overall',
  it=I('Several thousand test entries across categories (see leaderboard)', 'bfcl'),
  gr=['exact', 'exec'], cd=['none'], st='active',
  own='root', old='BFCL (Berkeley Function Calling)', rel=['mcp_evals'])

# ---- classic era ----
R(id='glue_superglue', n='GLUE / SuperGLUE', fam='classic', yr=2018, by='NYU, UW and DeepMind (Wang et al.)', paper=AX('1804.07461'),
  mem=[{'n': 'GLUE (2018)', 's': AX('1804.07461')}, {'n': 'SuperGLUE (2019)', 's': AX('1905.00537')}],
  me='Natural-language understanding for fine-tuned models (BERT era)', fmt='9 (GLUE) and 8 (SuperGLUE) classification and QA tasks', met='Average task score',
  it=I('GLUE 9 tasks; SuperGLUE 8 tasks', AX('1905.00537')),
  gr=['exact'], cd=['private'], st='retired',
  ev=[EP('superglue_external.csv', 'T5-11B', 'SuperGLUE test, as reported in the T5 paper')],
  why='Both passed their human baselines within about two years and were retired; historical only.',
  own='root', old='GLUE / SuperGLUE')

R(id='squad', n='SQuAD 1.1 / 2.0', fam='classic', yr=2016, by='Stanford (Rajpurkar et al.)', paper=AX('1606.05250'),
  mem=[{'n': 'SQuAD 1.1 (2016)', 's': AX('1606.05250')}, {'n': 'SQuAD 2.0 (2018)', 's': AX('1806.03822')}],
  me='Extractive reading comprehension on Wikipedia; 2.0 adds unanswerable questions', fmt='Answer is a span of the passage', met='Exact match and F1',
  it=I('100,000+ questions; 2.0 adds over 50,000 unanswerable ones', AX('1806.03822'), q='over 50,000 unanswerable questions'),
  gr=['overlap'], cd=['private'], st='retired',
  why='Human performance (86.8% F1 at launch) was passed by 2019 on both versions; historical only.',
  own='root', old='SQuAD 1.1/2.0')

R(id='imagenet', n='ImageNet (ILSVRC)', fam='classic', yr=2009, by='Deng, Fei-Fei Li et al.', paper='imagenet09',
  mem=[{'n': 'ImageNet (CVPR 2009)', 's': 'imagenet09'}, {'n': 'ILSVRC (2015 paper)', 's': AX('1409.0575')}],
  me='Image classification into 1,000 classes; started the deep-learning era (AlexNet, 2012)', fmt='Images with one label each', met='Top-1 and top-5 accuracy',
  it=I('1,000 classes; 1.28M training and 50,000 validation images', AX('1409.0575')),
  gr=['exact'], cd=['private'], st='retired',
  why='No longer a frontier target; still a reference for vision backbones, and its label noise caps meaningful top-1.',
  own='root', old='ImageNet (ILSVRC)')
