"""Judge atlas data for Topic: evaluation-and-llm-judges (tab t-judges).

Writes judges.json and ../parts/33_js_judges_a.js (window.JUDGE_ATLAS). Every number in a reading carries
`chk`, a pointer into inputs/ (a TSV table parsed from the arXiv HTML, the JudgeBench leaderboard CSV, a verbatim
quote, or the knowledge base's own RocketEval page); recompute.py re-reads each pointer and fails on any mismatch.
Read date: 2026-10-04.

Reading kinds: 'ind' = run by a third party (not the judge's or method's authors); 'self' = reported by the
authors of the judge or method; 'vendor' = submitted to a leaderboard by the model's maker.
"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
READ = '2026-10-04'

def ax(i, v=None):
    return 'https://arxiv.org/abs/' + i + (v or '')

# ---- sources: key -> title, url, date of the version read ----
S = {
 'mtbench': ('Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arXiv 2306.05685 v4)', ax('2306.05685'), '2023-12-24'),
 'judgebench': ('Tan et al., JudgeBench: A Benchmark for Evaluating LLM-based Judges (ICLR 2025; arXiv 2410.12784 v2)', ax('2410.12784'), '2025-04-05'),
 'judgebench_v1': ('Tan et al., JudgeBench (arXiv 2410.12784 v1)', ax('2410.12784', 'v1'), '2024-10-16'),
 'jb_lb': ('JudgeBench leaderboard (Hugging Face space ScalerLab/JudgeBench, file nemotron_results.csv; commits of 3 Jul and 31 Oct 2025)', 'https://huggingface.co/spaces/ScalerLab/JudgeBench', '2025-10-31'),
 'rewardbench': ('Lambert et al., RewardBench: Evaluating Reward Models for Language Modeling (arXiv 2403.13787 v2)', ax('2403.13787'), '2024-06-08'),
 'rewardbench2': ('Malik et al., RewardBench 2: Advancing Reward Model Evaluation (arXiv 2506.01937 v2)', ax('2506.01937'), '2026-04-23'),
 'llmbar': ('Zeng et al., Evaluating Large Language Models at Evaluating Instruction Following (LLMBar; ICLR 2024; arXiv 2310.07641 v2)', ax('2310.07641'), '2024-04-16'),
 'offsetbias': ('Park et al., OffsetBias: Leveraging Debiased Data for Tuning Evaluators (EvalBiasBench; arXiv 2407.06551 v2)', ax('2407.06551'), '2024-10-07'),
 'poll': ('Verga et al., Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models (PoLL; arXiv 2404.18796 v2)', ax('2404.18796'), '2024-05-01'),
 'ropoll': ('Acharya et al., RoPoLL: Robust Panel of LLM Judges (arXiv 2606.30931 v1, preprint)', ax('2606.30931'), '2026-06-29'),
 'prometheus2': ('Kim et al., Prometheus 2: An Open Source Language Model Specialized in Evaluating Other Language Models (arXiv 2405.01535 v2)', ax('2405.01535'), '2024-12-04'),
 'judgelm': ('Zhu et al., JudgeLM: Fine-tuned Large Language Models are Scalable Judges (ICLR 2025; arXiv 2310.17631 v2)', ax('2310.17631'), '2025-03-01'),
 'pandalm': ('Wang et al., PandaLM: An Automatic Evaluation Benchmark for LLM Instruction Tuning Optimization (arXiv 2306.05087 v2)', ax('2306.05087'), '2024-05-24'),
 'autoj': ('Li et al., Generative Judge for Evaluating Alignment (Auto-J; arXiv 2310.05470 v2)', ax('2310.05470'), '2023-12-07'),
 'rocketeval': ('Wei et al., RocketEval: Efficient Automated LLM Evaluation via Grading Checklist (ICLR 2025; arXiv 2503.05142 v1)', ax('2503.05142'), '2025-03-07'),
 'rocket_kb': ('RocketEval paper page in this knowledge base (claims checked against the released gradings)', 'https://app.notion.com/p/3cd5c17b0d0d81ffa8e5f8fa5a5806c8', '2026-10-03'),
 'genrm': ('Zhang et al., Generative Verifiers: Reward Modeling as Next-Token Prediction (arXiv 2408.15240 v3)', ax('2408.15240'), '2025-02-22'),
 'aaj': ('Zhuge et al., Agent-as-a-Judge: Evaluate Agents with Agents (arXiv 2410.10934 v2)', ax('2410.10934'), '2024-10-16'),
 'ajbench': ('Shi et al., AJ-Bench: Benchmarking Agent-as-a-Judge for Environment-Aware Evaluation (arXiv 2604.18240 v1, preprint)', ax('2604.18240'), '2026-04-20'),
 'ifrb': ('Wen et al., IF-RewardBench: Benchmarking Judge Models for Instruction-Following Evaluation (ACL 2026; arXiv 2603.04738 v2)', ax('2603.04738'), '2026-04-16'),
 'rubriceval': ('Pan et al., RubricEval: A Rubric-Level Meta-Evaluation Benchmark for LLM Judges in Instruction Following (arXiv 2603.25133 v1, preprint)', ax('2603.25133'), '2026-03-26'),
 'ljb': ('Chen et al., Benchmarking LLM-as-a-Judge for Long-Form Output Evaluation (LongJudgeBench; arXiv 2606.01629 v4, preprint)', ax('2606.01629'), '2026-08-28'),
 'mjb': ('Wang et al., Benchmarking LLM Judges for Mobile Agent Evaluation (MobileJudgeBench; arXiv 2608.11434 v1, preprint)', ax('2608.11434'), '2026-08-11'),
 'rmbench': ('Liu et al., RM-Bench: Benchmarking Reward Models of Language Models with Subtlety and Style (arXiv 2410.16184 v1)', ax('2410.16184'), '2024-10-21'),
 'reliab': ('Norman et al., Reliability without Validity: A Systematic, Large-Scale Evaluation of LLM-as-a-Judge Models (arXiv 2606.19544 v1, preprint)', ax('2606.19544'), '2026-06-17'),
 'biaslab': ('Judge bias lab tab of this page (position-consistency recount on the released MT-Bench judgments)', '#t-bias', ''),
 'shi': ('Shi et al., Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge (arXiv 2406.07791)', ax('2406.07791'), '2024-06-12'),
 'guard_child': ('Guardrails: staged runtime safety for LLM systems (child page of this topic)', 'https://app.notion.com/p/3c65c17b0d0d819bbfa5dffa9246c297', ''),
 'safety_child': ('Safety and honesty benchmarks (child page of Topic: benchmarks)', 'https://app.notion.com/p/3ef5c17b0d0d818da9d5efda1a443166', ''),
 'hf_prom7': ('prometheus-eval/prometheus-7b-v2.0 on Hugging Face (Apache-2.0)', 'https://huggingface.co/prometheus-eval/prometheus-7b-v2.0', '2024-02-13'),
 'hf_judgelm': ('BAAI/JudgeLM-33B-v1.0 on Hugging Face (no licence tag on the repo)', 'https://huggingface.co/BAAI/JudgeLM-33B-v1.0', '2023-10-28'),
 'hf_pandalm': ('WeOpenML/PandaLM-7B-v1 on Hugging Face (Apache-2.0)', 'https://huggingface.co/WeOpenML/PandaLM-7B-v1', '2023-04-30'),
 'hf_autoj': ('GAIR/autoj-13b on Hugging Face (no licence tag on the repo)', 'https://huggingface.co/GAIR/autoj-13b', '2023-10-04'),
 'hf_skyv2': ('Skywork/Skywork-Reward-V2-Llama-3.1-8B on Hugging Face (Llama 3.1 licence)', 'https://huggingface.co/Skywork/Skywork-Reward-V2-Llama-3.1-8B', '2025-06-26'),
 'hf_nemo': ('nvidia/Qwen3-Nemotron-32B-GenRM-Principle on Hugging Face (licence: other)', 'https://huggingface.co/nvidia/Qwen3-Nemotron-32B-GenRM-Principle', '2025-10-12'),
 'rocket_code': ('Joinn99/RocketEval-ICLR (MIT-licensed code)', 'https://github.com/Joinn99/RocketEval-ICLR', '2025-03-07'),
 'aaj_code': ('metauto-ai/agent-as-a-judge (code and the DevAI dataset)', 'https://github.com/metauto-ai/agent-as-a-judge', '2024-10-14'),
}

# ---- metrics: each one is its own axis; readings on different metrics are never plotted together ----
# key: (short name, what it is, unit, chance level or None, higher is better)
M = {
 'jb_acc': ('JudgeBench accuracy', 'Accuracy on the 350 GPT-4o response pairs (one correct, one wrong answer), each pair judged in both orders and the two verdicts combined; the official protocol', '%', 50, 1),
 'jb_kappa': ('JudgeBench kappa (Norman et al.)', "Cohen's kappa against JudgeBench's correctness labels, one judgment per item, run by Norman et al. in March and April 2026: a different protocol and metric from the official accuracy", 'kappa', 0, 1),
 'mtb_kappa': ('MT-Bench kappa (Norman et al.)', "Cohen's kappa against the MT-Bench expert votes (2,391 pairwise items, A, B or tie), Norman et al. 2026", 'kappa', 0, 1),
 'rb_kappa': ('RewardBench kappa (Norman et al.)', "Cohen's kappa on RewardBench with the chosen response's position randomised per item (2,981 items), Norman et al. 2026", 'kappa', 0, 1),
 'mtb_s2': ('MT-Bench human agreement, no ties (S2)', 'Share of agreeing verdicts with MT-Bench expert votes, counting only votes where neither side said tie (setup S2 of Zheng et al.); two random judges agree 50%', '%', 50, 1),
 'mtb_s1': ('MT-Bench human agreement, with ties (S1)', 'Agreement with MT-Bench expert votes counting tie votes, and position-inconsistent judge verdicts as ties (setup S1); two random judges agree 33%', '%', 33, 1),
 'mtb_rocket': ('MT-Bench human agreement (RocketEval protocol)', 'Agreement ratio with MT-Bench human judgments as computed in RocketEval Table 2 (pairwise verdicts derived from each judge\'s scores)', '%', None, 1),
 'mtb_prom': ('MT-Bench human judgments, accuracy without ties (Prometheus 2 protocol)', 'Pairwise accuracy on the MT-Bench human-judgment set with ties removed, as run in the Prometheus 2 paper', '%', 50, 1),
 'rb1': ('RewardBench score', 'RewardBench (v1) score: accuracy at preferring the chosen over the rejected completion, averaged over Chat, Chat Hard, Safety, Reasoning (and Prior Sets where run)', '%', 50, 1),
 'rb2': ('RewardBench 2 accuracy', 'Average accuracy over six domains at picking the one correct completion out of four (best-of-4)', '%', 25, 1),
 'ebb': ('EvalBiasBench accuracy', 'Accuracy on 80 hand-made pairs built to trigger six biases, each pair in both orders (160 items), micro-averaged', '%', 50, 1),
 'llmbar_adv': ('LLMBar adversarial accuracy', 'Accuracy on the four adversarial LLMBar subsets (pairs where the worse output is superficially more appealing), averaged', '%', 50, 1),
 'pandalm_acc': ('PandaLM test-set accuracy', 'Accuracy against the three-annotator human labels on the PandaLM test set (win, lose or tie; both orders, conflicts become ties)', '%', None, 1),
 'autoj_agr': ('Auto-J pairwise agreement', 'Agreement with human labels on the Auto-J pairwise test set (eight scenario groups), overall', '%', None, 1),
 'kilt_kappa': ('KILT NQ kappa', "Cohen's kappa against human correctness labels on KILT Natural Questions answers (PoLL Table 1)", 'kappa', 0, 1),
 'arena_r': ('Pearson with Chatbot Arena', "Pearson correlation between the judge's ranking of models and the Chatbot Arena leaderboard (PoLL Table 2)", 'r', None, 1),
 'devai': ('DevAI alignment with human consensus', 'Share of the 365 DevAI requirement verdicts that match three experts\' consensus (OpenHands outputs, black-box setting)', '%', None, 1),
 'ajb': ('AJ-Bench Avg@3', 'AJ-Bench overall score averaged over three runs (155 tasks, 516 trajectories in search, data systems and GUI domains)', '%', None, 1),
 'ifrb_tau': ('IF-RewardBench Kendall tau', 'Kendall tau-b between the judge\'s ranking of several responses and the preference graph, overall assessment, averaged over single-turn, multi-turn and system-prompt sets', 'tau', 0, 1),
 'rubric_hard': ('RubricEval Hard accuracy', 'Rubric-level judgment accuracy on the Hard subset of RubricEval (3,486 instances in all)', '%', None, 1),
 'ljb_acc': ('LongJudgeBench accuracy', 'Accuracy averaged over the LongJudgeBench scenarios other than WritingPreferenceBench (outputs of about 9,000 tokens on average)', 'frac', None, 1),
 'mjb_acc': ('MobileJudgeBench accuracy', 'Trajectory-level judge accuracy on 931 human-annotated mobile-agent trajectories', '%', None, 1),
 'rmb_hard': ('RM-Bench hard accuracy', 'Accuracy when the rejected response has the more favourable style (RM-Bench "hard" setting)', '%', 50, 1),
 'jb_incons': ('JudgeBench order inconsistency', 'Share of JudgeBench pairs on which the two orderings gave inconsistent verdicts (lower is better)', '%', None, 0),
 'bon_gsm8k': ('Best-of-N on GSM8K', 'Share of GSM8K test problems solved when the verifier picks one of N sampled solutions (a downstream measure, not agreement)', '%', None, 1),
}
M['wb_rho'] = ('WildBench ranking vs Arena (Spearman)', 'Spearman correlation between the ranking of 12 test models produced from WildBench grades and their Chatbot Arena Elo (hard prompts, English; RocketEval Table 3)', 'rho', None, 1)

# ---- readings ----
RD = []
def R(id, row, on, j, m, v, d, k, s, setup, chk, note=None, run=None):
    RD.append(dict(id=id, row=row, on=on, j=j, m=m, v=v, d=d, k=k, s=s, set=setup, chk=chk, note=note, run=run))

T = lambda f, lab, col: ['tsv', f, lab, col]
Q = lambda key, txt=None: ['q', key, txt]
JB1, JB2 = '2024-10-16', '2025-04-05'
jbset = 'JudgeBench GPT-4o pairs (350), both orders combined'
# JudgeBench, official protocol (paper Tables 1 to 3; v1 rows dated v1, rows added in v2 dated v2)
for id, row, j, f, lab, d, s in [
  ('jb_g4o_van', 'gpt4', 'GPT-4o, vanilla prompt', 'T1', 'Vanilla (GPT-4o)', JB1, 'judgebench_v1'),
  ('jb_g4o', 'gpt4', 'GPT-4o, Arena-Hard judge prompt', 'T2', 'GPT-4o', JB1, 'judgebench_v1'),
  ('jb_g4omini', None, 'GPT-4o-mini, Arena-Hard prompt', 'T2', 'GPT-4o-mini', JB1, 'judgebench_v1'),
  ('jb_c35s', 'gpt4', 'Claude 3.5 Sonnet, Arena-Hard prompt', 'T2', 'Claude-3.5-Sonnet', JB1, 'judgebench_v1'),
  ('jb_haiku3', None, 'Claude 3 Haiku, Arena-Hard prompt', 'T2', 'Claude-3-Haiku', JB1, 'judgebench_v1'),
  ('jb_l405', None, 'Llama 3.1 405B Instruct, Arena-Hard prompt', 'T2', 'Llama-3.1-405B-Instruct', JB1, 'judgebench_v1'),
  ('jb_l70', None, 'Llama 3.1 70B Instruct, Arena-Hard prompt', 'T2', 'Llama-3.1-70B-Instruct', JB1, 'judgebench_v1'),
  ('jb_l8', None, 'Llama 3.1 8B Instruct, Arena-Hard prompt', 'T2', 'Llama-3.1-8B-Instruct', JB1, 'judgebench_v1'),
  ('jb_g15p', None, 'Gemini 1.5 Pro, Arena-Hard prompt', 'T2', 'Gemini-1.5-pro', JB1, 'judgebench_v1'),
  ('jb_g15f', None, 'Gemini 1.5 Flash, Arena-Hard prompt', 'T2', 'Gemini-1.5-flash', JB1, 'judgebench_v1'),
  ('jb_vertex', None, 'Vertex AI evaluation (Gemini 1.5 Pro)', 'T1', 'VertexAI Evaluation (Gemini-1.5-pro)', JB1, 'judgebench_v1'),
  ('jb_o1p', 'frontier', 'o1-preview, Arena-Hard prompt', 'T2', 'o1-preview', JB1, 'judgebench_v1'),
  ('jb_o1m', 'frontier', 'o1-mini, Arena-Hard prompt', 'T2', 'o1-mini', JB1, 'judgebench_v1'),
  ('jb_o3h', 'frontier', 'o3-mini (high effort), Arena-Hard prompt', 'T2', 'o3-mini (high)', JB2, 'judgebench'),
  ('jb_o3m', 'frontier', 'o3-mini (medium effort)', 'T2', 'o3-mini (medium)', JB2, 'judgebench'),
  ('jb_o3l', 'frontier', 'o3-mini (low effort)', 'T2', 'o3-mini (low)', JB2, 'judgebench'),
  ('jb_r1', 'frontier', 'DeepSeek-R1, Arena-Hard prompt', 'T2', 'Deepseek-R1', JB2, 'judgebench'),
  ('jb_panda', 'pandalm', 'PandaLM-7B', 'T1', 'PandaLM', JB1, 'judgebench_v1'),
  ('jb_p7', 'prometheus2', 'Prometheus 2 7B', 'T1', 'Prometheus2-7b', JB1, 'judgebench_v1'),
  ('jb_p8x7', 'prometheus2', 'Prometheus 2 8x7B', 'T1', 'Prometheus2-8x7b', JB1, 'judgebench_v1'),
  ('jb_jlm7', 'judgelm', 'JudgeLM-7B', 'T1', 'JudgeLM-7B', JB1, 'judgebench_v1'),
  ('jb_jlm33', 'judgelm', 'JudgeLM-33B', 'T1', 'JudgeLM-33B', JB1, 'judgebench_v1'),
  ('jb_autoj', 'autoj', 'Auto-J 13B', 'T1', 'AutoJ', JB1, 'judgebench_v1'),
  ('jb_skyc70', None, 'Skywork-Critic Llama 3.1 70B (fine-tuned judge)', 'T1', 'Skywork-LLaMA-3.1B-70B', JB1, 'judgebench_v1'),
  ('jb_chateval', None, 'ChatEval (multi-agent debate, GPT-4o)', 'T1', 'ChatEval', JB1, 'judgebench_v1'),
  ('jb_skyrm27', 'scalar_rm', 'Skywork-Reward-Gemma-2-27B (reward model)', 'T3', 'Skywork-Reward-Gemma-2-27B', JB1, 'judgebench_v1'),
  ('jb_irm20', 'scalar_rm', 'InternLM2-20B-Reward (reward model)', 'T3', 'InternLM2-20B-Reward', JB1, 'judgebench_v1'),
  ('jb_grm2', 'scalar_rm', 'GRM-Gemma-2B (reward model)', 'T3', 'GRM-Gemma-2B', JB1, 'judgebench_v1')]:
    v = None  # filled from the table by fill() below
    R(id, row, 'judgebench', j, 'jb_acc', v, d, 'ind', s, jbset, T('judgebench_v2_' + f, lab, 5))
for id, row, j, lab, kind in [
  ('jb_nemo_genrm', 'genrm', 'Qwen3-Nemotron-32B-GenRM-Principle (generative RM)', 'Qwen3-Nemotron-32B-GenRM-Principle', 'g'),
  ('jb_nemo_49', 'genrm', 'Llama-3.3-Nemotron-Super-49B-GenRM', 'Llama-3.3-Nemotron-Super-49B-GenRM', 'g'),
  ('jb_nemo_49v', 'genrm', 'Llama-3.3-Nemotron-Super-49B-GenRM, voting over 32 samples', 'Llama-3.3-Nemotron-Super-49B-GenRM + voting@32', 'g'),
  ('jb_nemo_70r', 'scalar_rm', 'Llama-3.3-Nemotron-70B-Reward (reward model)', 'Llama-3.3-Nemotron-70B-Reward', 'r'),
  ('jb_nemo_q32r', 'scalar_rm', 'Qwen-3-Nemotron-32B-Reward (reward model)', 'Qwen-3-Nemotron-32B-Reward', 'r')]:
    R(id, row, 'judgebench', j, 'jb_acc', None, '2025-10-31', 'vendor', 'jb_lb', jbset + '; submitted by NVIDIA, listed on the official leaderboard', ['csv', 'judgebench_leaderboard_nemotron.csv', lab, 'Overall'],
      note='Vendor submission: NVIDIA ran its own models; the maintainers list the CSV as given. The commit history dates the file to 3 July and 31 October 2025.')
R('jb_inc_jlm7', 'judgelm', 'judgebench', 'JudgeLM-7B', 'jb_incons', 59.71, JB1, 'ind', 'judgebench_v1', jbset, Q('jb_incons', '59.71'))
R('jb_inc_p7', 'prometheus2', 'judgebench', 'Prometheus 2 7B', 'jb_incons', 52.29, JB1, 'ind', 'judgebench_v1', jbset, Q('jb_incons', '52.29'))

# MT-Bench human agreement, Zheng et al. Table 5 (first turn)
mset = 'MT-Bench, first turn, expert votes (58 labelers) on 6 models x 80 questions'
R('mt_g4p_s2', 'gpt4', 'mtbench', 'GPT-4, pairwise', 'mtb_s2', None, '2023-06-09', 'self', 'mtbench', mset, T('mtbench_T5a', 'G4-Pair', 4), note='859 votes. The MT-Bench authors proposed this judge setup and measured it.')
R('mt_g4s_s2', 'gpt4', 'mtbench', 'GPT-4, single-answer grading', 'mtb_s2', None, '2023-06-09', 'self', 'mtbench', mset, T('mtbench_T5a', 'G4-Single', 4), note='739 votes')
R('mt_hum_s2', None, 'mtbench', 'Human vs human (another expert)', 'mtb_s2', None, '2023-06-09', 'ref', 'mtbench', mset, T('mtbench_T5a', 'Human', 4), note='479 votes: the human ceiling for this metric')
R('mt_g4p_s1', 'gpt4', 'mtbench', 'GPT-4, pairwise', 'mtb_s1', None, '2023-06-09', 'self', 'mtbench', mset, T('mtbench_T5a', 'G4-Pair', 2), note='1,343 votes')
R('mt_hum_s1', None, 'mtbench', 'Human vs human (another expert)', 'mtb_s1', None, '2023-06-09', 'ref', 'mtbench', mset, T('mtbench_T5a', 'Human', 2), note='721 votes: the human ceiling for this metric')
# RocketEval's protocol on MT-Bench human judgments (Table 2)
rset = 'MT-Bench human judgments, RocketEval Table 2'
R('mt_rk_hum', None, 'mtbench', 'Human to human', 'mtb_rocket', 64.7, '2025-03-07', 'ref', 'rocketeval', rset, ['rocket_t2', 'Human-to-human', None])
R('mt_rk_g4o', 'gpt4', 'mtbench', 'GPT-4o', 'mtb_rocket', 66.6, '2025-03-07', 'ind', 'rocketeval', rset, ['rocket_t2', 'GPT-4o', None])
R('mt_rk_p7', 'prometheus2', 'mtbench', 'Prometheus 2 7B', 'mtb_rocket', 55.7, '2025-03-07', 'ind', 'rocketeval', rset, ['rocket_t2', 'Prometheus-7B-v2.0', None])
R('mt_rk_gem', 'rocketeval', 'mtbench', 'Gemma-2-2B with RocketEval checklists', 'mtb_rocket', 57.9, '2025-03-07', 'self', 'rocketeval', rset, ['rocket_t2', 'Gemma-2-2B', 3], note='Unsupervised variant. The knowledge base page could check this only on the 3 of 6 human-judged models whose gradings were released.')
R('mt_rk_gemcot', None, 'mtbench', 'Gemma-2-2B as a chain-of-thought judge (no checklist)', 'mtb_rocket', 37.9, '2025-03-07', 'self', 'rocketeval', rset, ['rocket_t2', 'Gemma-2-2B', 0])
R('mt_rk_l8', 'rocketeval', 'mtbench', 'Llama-3-8B with RocketEval checklists', 'mtb_rocket', 63.8, '2025-03-07', 'self', 'rocketeval', rset, ['rocket_t2', 'Llama-3-8B', 3])
# Prometheus 2 protocol (Table 4)
pset = 'MT-Bench human judgments, ties removed, Prometheus 2 Table 4'
for id, row, j, lab, k in [('mt_pr_8x7', 'prometheus2', 'Prometheus 2 8x7B', 'Prometheus-2-8x7B', 'self'), ('mt_pr_7', 'prometheus2', 'Prometheus 2 7B', 'Prometheus-2-7B', 'self'),
                           ('mt_pr_autoj', 'autoj', 'Auto-J 13B', 'Auto-J (13B)', 'ind'), ('mt_pr_g4', 'gpt4', 'GPT-4-1106-preview', 'GPT-4-1106-Preview', 'ind'), ('mt_pr_opus3', 'gpt4', 'Claude 3 Opus', 'Claude-3-Opus', 'ind')]:
    R(id, row, 'mtbench', j, 'mtb_prom', None, '2024-05-02', k, 'prometheus2', pset, T('prometheus2_T4', lab, 7), note=('Run by the Prometheus 2 authors, a competing judge\'s team' if k == 'ind' else None))
# RewardBench (v1)
R('rb_armo', 'scalar_rm', 'rewardbench', 'ArmoRM-Llama3-8B-v0.1 (reward model)', 'rb1', None, '2024-06-08', 'ind', 'rewardbench', 'RewardBench, 2,985 prompt-chosen-rejected trios', T('rewardbench_T2', 'RLHFlow/ArmoRM-Llama3-8B-v0.1', 1), note='Top open model in the paper\'s Table 2 (v2, June 2024); the live leaderboard moved on.')
R('rb_g4o', 'gpt4', 'rewardbench', 'GPT-4o (2024-05-13) as generative judge', 'rb1', None, '2024-06-08', 'ind', 'rewardbench', 'RewardBench', T('rewardbench_T8', 'openai/gpt-4o-2024-05-13', 1))
R('rb_p8x7', 'prometheus2', 'rewardbench', 'Prometheus 2 8x7B', 'rb1', None, '2024-06-08', 'ind', 'rewardbench', 'RewardBench (no Prior Sets)', T('rewardbench_T8', '[O] prometheus-eval/prometheus-8x7b-v2.0', 1))
R('rb_p7', 'prometheus2', 'rewardbench', 'Prometheus 2 7B', 'rb1', None, '2024-06-08', 'ind', 'rewardbench', 'RewardBench (no Prior Sets)', T('rewardbench_T8', '[O] prometheus-eval/prometheus-7b-v2.0', 1))
# RewardBench 2 (Table 3 as printed in v2)
for id, row, j, lab in [('rb2_sky', 'scalar_rm', 'Skywork-Reward-V2-Llama-3.1-8B (reward model)', 'Skywork/Skywork-Reward-V2-Llama-3.1-8B'),
                        ('rb2_lmunit', None, 'LMUnit-Qwen2.5-72B (generative judge)', 'ContextualAI/LMUnit-qwen2.5-72b *'),
                        ('rb2_g25p', 'frontier', 'Gemini 2.5 Pro as judge', 'google/gemini-2.5-pro*'),
                        ('rb2_opus4', 'frontier', 'Claude Opus 4 as judge', 'anthropic/claude-opus-4-20250514*'),
                        ('rb2_c37', 'frontier', 'Claude 3.7 Sonnet as judge', 'anthropic/claude-3-7-sonnet-20250219*')]:
    R(id, row, 'rewardbench2', j, 'rb2', None, '2026-04-23', 'ind', 'rewardbench2', 'RewardBench 2, best-of-4, six domains', T('rewardbench2_T3', lab, 1))
# LLMBar (Tables 2 and 5)
R('lb_g4', 'gpt4', 'llmbar', 'GPT-4, vanilla prompt', 'llmbar_adv', None, '2024-04-16', 'ind', 'llmbar', 'LLMBar adversarial set, average of 4 subsets', T('llmbar_T2', 'Vanilla', 11))
R('lb_g4best', 'gpt4', 'llmbar', 'GPT-4 with rules, metrics and reference (the paper\'s best prompt)', 'llmbar_adv', None, '2024-04-16', 'ind', 'llmbar', 'LLMBar adversarial set', T('llmbar_T2', 'Metrics+Reference*', 11), note='The prompting strategy is the LLMBar authors\' own.')
R('lb_chatgpt', None, 'llmbar', 'ChatGPT, vanilla prompt', 'llmbar_adv', None, '2024-04-16', 'ind', 'llmbar', 'LLMBar adversarial set', T('llmbar_T5', 'Vanilla', 11), note='Below the 50% a coin would score.')
# EvalBiasBench (OffsetBias Table 4)
eset = 'EvalBiasBench, 80 pairs x 2 orders'
for id, row, j, lab, k in [('eb_g4o', 'gpt4', 'GPT-4o (2024-05-13)', 'GPT-4o-0513', 'ind'), ('eb_l70', None, 'Llama 3 70B Instruct', 'LLaMA3-70B-Instruct', 'ind'),
                           ('eb_panda', 'pandalm', 'PandaLM-7B', 'PandaLM', 'ind'), ('eb_autoj', 'autoj', 'Auto-J 13B', 'AutoJ-13B', 'ind'),
                           ('eb_p7', 'prometheus2', 'Prometheus 2 7B', 'PROMETHEUS-2-7B', 'ind'), ('eb_p8x7', 'prometheus2', 'Prometheus 2 8x7B', 'PROMETHEUS-2-8x7B', 'ind'),
                           ('eb_fsfair', 'scalar_rm', 'FsfairX-LLaMA3-RM (reward model)', 'FsfairX-LLaMA3-RM', 'ind'),
                           ('eb_offset', None, 'OffsetBias judge (Llama 3 8B trained with the debiasing data)', '+OFFSETBIAS‡', 'self')]:
    R(id, row, 'evalbiasbench', j, 'ebb', None, '2024-10-07', k, 'offsetbias', eset, ['qnum', 'offsetbias_t4', lab])
# PandaLM test set (PandaLM Table 2; JudgeLM Table 2)
R('pl_p7', 'pandalm', None, 'PandaLM-7B', 'pandalm_acc', 59.26, '2024-05-24', 'self', 'pandalm', 'PandaLM human-labelled test set', Q('pandalm_t2', '0.5926'))
R('pl_p70', 'pandalm', None, 'PandaLM-70B', 'pandalm_acc', 66.87, '2024-05-24', 'self', 'pandalm', 'PandaLM human-labelled test set', Q('pandalm_t2', '0.6687'))
R('pl_g4', 'gpt4', None, 'GPT-4', 'pandalm_acc', 66.47, '2024-05-24', 'ind', 'pandalm', 'PandaLM human-labelled test set', Q('pandalm_t2', '0.6647'), note='Run by the PandaLM authors')
R('pl_jlm33', 'judgelm', None, 'JudgeLM-33B, zero-shot', 'pandalm_acc', None, '2025-03-01', 'self', 'judgelm', 'PandaLM test set, as run by the JudgeLM authors', T('judgelm_T2', 'JudgeLM-33B', 1))
R('pl_jlm7', 'judgelm', None, 'JudgeLM-7B, zero-shot', 'pandalm_acc', None, '2025-03-01', 'self', 'judgelm', 'PandaLM test set, as run by the JudgeLM authors', T('judgelm_T2', 'JudgeLM-7B', 1))
# Auto-J pairwise test (Auto-J Table 1)
for id, row, j, lab, k in [('aj_autoj', 'autoj', 'Auto-J 13B', 'Auto-J', 'self'), ('aj_g4', 'gpt4', 'GPT-4', 'GPT-4', 'ind'), ('aj_panda', 'pandalm', 'PandaLM-7B', 'PandaLM', 'ind')]:
    R(id, row, None, j, 'autoj_agr', None, '2023-12-07', k, 'autoj', 'Auto-J pairwise test set', T('autoj_T1', lab, 9))
# PoLL (Tables 1 and 2)
for id, row, j, lab, k in [('po_poll', 'poll', 'PoLL jury (Command R, Claude 3 Haiku, GPT-3.5)', 'PoLL', 'self'), ('po_g4', 'gpt4', 'GPT-4 alone', 'GPT-4', 'ind'), ('po_haiku', None, 'Claude 3 Haiku alone', 'Haiku', 'ind'), ('po_em', None, 'Exact match (no judge)', 'EM', 'ref')]:
    R(id + '_k', row, None, j, 'kilt_kappa', None, '2024-05-01', k, 'poll', 'KILT Natural Questions answers', T('poll_T1', lab, 1), note=('Run by the PoLL authors' if k == 'ind' else None))
for id, row, j, lab, k in [('po_poll', 'poll', 'PoLL jury', 'PoLL', 'self'), ('po_g4', 'gpt4', 'GPT-4 alone', 'GPT-4', 'ind'), ('po_haiku', None, 'Claude 3 Haiku alone', 'Haiku', 'ind')]:
    R(id + '_r', row, None, j, 'arena_r', None, '2024-05-01', k, 'poll', 'Ranking of models vs the Chatbot Arena leaderboard', T('poll_T2', lab, 1))
# RocketEval (headline, checked on the knowledge base page)
R('rk_rho_gem', 'rocketeval', None, 'Gemma-2-2B with RocketEval checklists', 'wb_rho', 0.965, '2025-03-07', 'self', 'rocketeval', 'WildBench, 12 test models vs Arena Elo', ['rocket_t3', 'Gemma-2-2B', None], note='The gap to GPT-4o is one discordant pair out of 66 (knowledge base RocketEval page).')
R('rk_rho_g4o', 'gpt4', None, 'GPT-4o as WildBench grader', 'wb_rho', 0.979, '2025-03-07', 'ind', 'rocketeval', 'WildBench, 12 test models vs Arena Elo', ['rocket_t3', 'GPT-4o', 1], note='Reproduced from the released GPT-4o grades on the knowledge base RocketEval page.')
# Agent-as-a-Judge and AJ-Bench
R('aaj_align', 'agentjudge', None, 'Agent-as-a-Judge (the paper\'s agent)', 'devai', 90.44, '2024-10-16', 'self', 'aaj', 'DevAI, OpenHands outputs, black-box', Q('aaj_align', '90.44'))
R('aaj_llm', None, None, 'LLM-as-a-Judge baseline in the same paper', 'devai', 60.38, '2024-10-16', 'self', 'aaj', 'DevAI, OpenHands outputs, black-box', Q('aaj_align', '60.38'))
for id, row, j, lab, ag in [('ajb_g3p', 'frontier', 'Gemini 3 Pro preview, LLM-as-a-judge', 'gemini-3-pro-preview', '✗'), ('ajb_ds', None, 'DeepSeek V3.2, LLM-as-a-judge', 'deepseek-v3.2', '✗'),
                            ('ajb_ds_ag', 'agentjudge', 'DeepSeek V3.2 as agent judge', 'deepseek-v3.2', '✓'), ('ajb_g5m', None, 'GPT-5-mini (low), LLM-as-a-judge', 'gpt-5-mini-low', '✗'), ('ajb_g5m_ag', 'agentjudge', 'GPT-5-mini (low) as agent judge', 'gpt-5-mini-low', '✓')]:
    R(id, row, 'ajbench', j, 'ajb', None, '2026-04-20', 'ind', 'ajbench', 'AJ-Bench, all domains, mean of 3 runs', ['tsv', 'ajbench_T3', [lab, ag], 9])
# IF-RewardBench, RubricEval, LongJudgeBench, MobileJudgeBench, RM-Bench, GenRM
for id, row, j, lab in [('if_g3f', None, 'Gemini 3 Flash', 'Gemini-3-Flash'), ('if_g5m', None, 'GPT-5-mini', 'GPT-5-mini'),
                        ('if_sky', 'scalar_rm', 'Skywork-Reward-V2-Llama-3.1-8B (reward model)', 'Skywork-Reward-V2-Llama-3.1-8B'),
                        ('if_rrm', 'genrm', 'RRM-32B (generative reward model)', 'RRM-32B'), ('if_rmr1', 'genrm', 'RM-R1 DeepSeek-distilled Qwen 32B (generative reward model)', 'RM-R1-DeepSeek-Distilled-Qwen-32B')]:
    R(id, row, 'ifrb', j, 'ifrb_tau', None, '2026-04-16', 'ind', 'ifrb', 'IF-RewardBench, overall assessment', T('ifrewardbench_T4', lab, 4))
R('re_g4o', 'gpt4', 'rubriceval', 'GPT-4o', 'rubric_hard', 55.97, '2026-03-26', 'ind', 'rubriceval', 'RubricEval Hard subset', Q('rubric_gpt4o', '55.97'))
for id, row, j, lab, setn in [('lj_qmax', None, 'Qwen3-Max, reference-based', 'Qwen3-Max', 'Reference'), ('lj_g52', None, 'GPT-5.2, rubric', 'GPT-5.2', 'Rubric'), ('lj_g4om', None, 'GPT-4o-mini, reference plus rubric', 'GPT-4o-mini', 'Ref.+Rubric')]:
    R(id, row, 'ljb', j, 'ljb_acc', None, '2026-08-28', 'ind', 'ljb', 'LongJudgeBench, average without WritingPreferenceBench', ['ljb', lab, setn])
R('mj_simple', None, 'mjb', 'Simple screenshot baseline, Gemini 3 Flash', 'mjb_acc', None, '2026-08-11', 'self', 'mjb', 'MobileJudgeBench, 931 trajectories', T('mobilejudgebench_T2', 'Simple Baseline †', 3), note='The baseline is the MobileJudgeBench authors\' own design.')
R('mj_arb', None, 'mjb', 'AgentRewardBench judge method, Gemini 3 Flash', 'mjb_acc', None, '2026-08-11', 'ind', 'mjb', 'MobileJudgeBench, 931 trajectories', T('mobilejudgebench_T2', 'AgentRewardBench', 3))
R('rm_sky', 'scalar_rm', 'rmbench', 'Skywork-Reward (reward model)', 'rmb_hard', 46.6, '2024-10-21', 'ind', 'rmbench', 'RM-Bench, style-biased hard setting', Q('rmbench_style', '46.6'))
R('gv_cot', 'genrm', None, 'GenRM-CoT verifier (Gemma 2 9B), Best-of-N', 'bon_gsm8k', 93.4, '2025-02-22', 'self', 'genrm', 'GSM8K test, Best-of-N with a fixed generator', Q('genrm_abs', '93.4'))
R('gv_base', None, None, 'Baseline verifier in the same figure', 'bon_gsm8k', 73, '2025-02-22', 'self', 'genrm', 'GSM8K test, Best-of-N with a fixed generator', Q('genrm_abs', '73%'), note='The abstract gives the improvement as 73% to 93.4%.')

# Norman et al. 2026 (Table 4): every judge on the three kappas, generated from the TSV
rel = [l.rstrip('\n').split('\t') for l in open(os.path.join(H, 'inputs', 'reliability_T4.tsv')) if not l.startswith('#')][2:]
tier = {r[0]: r for r in [l.rstrip('\n').split('\t') for l in open(os.path.join(H, 'inputs', 'reliability_T1.tsv')) if not l.startswith('#')][1:]}
for r in rel:
    if r[0].startswith('Cohort'): continue
    t = tier[r[0]]
    row = 'frontier' if t[2] == '3' else ('gpt4' if r[0] == 'GPT-4o' else None)
    slug = ''.join(c for c in r[0].lower() if c.isalnum())
    note = 'Tier %s in the study; released %s; list price $%s per million input tokens (April 2026).' % (t[2], t[3], t[4])
    for m, col, on in [('jb_kappa', 6, 'judgebench'), ('mtb_kappa', 2, 'mtbench'), ('rb_kappa', 10, 'rewardbench')]:
        R('nm_' + m + '_' + slug, row, on, r[0], m, None, '2026-06-17', 'ind', 'reliab', 'Single judgment per item, temperature 0', T('reliability_T4', r[0], col), note=note, run='March to April 2026')

# ---- rows ----
# kind: judge (a judge model used as is), method (a way of judging), rm (reward model or verifier used as a judge),
#       meta (a test that rates judges), study (a measurement study across judges), pointer (lives on another page)
# st: active, legacy, new (2026, little independent replication), saturated (no longer separates judges), pointer
ROWS = []
def W(**k):
    k.setdefault('corr', []); k.setdefault('iss', []); k.setdefault('ow', 'n/a'); k.setdefault('owt', ''); k.setdefault('cost', None)
    ROWS.append(k)

W(id='gpt4', n='GPT-4-class single judge', sub='GPT-4, GPT-4o, Claude 3.5 Sonnet with a judge prompt', kind='judge', modes=['pointwise', 'pairwise'], d='2023-06', s='mtbench',
  ow='no', owt='Closed API models.',
  cost=[['GPT-4 Turbo: $10 per million input tokens and $30 per million output (as quoted in the PoLL paper, April 2024)', 'poll'], ['GPT-4o: $2.50 per million input tokens (list price, April 2026, Norman et al. Table 1)', 'reliab']],
  st='legacy', what='One strong chat model reads the question and the answer (or two answers) and returns a score or a preference: the setup MT-Bench named in 2023.',
  why='On MT-Bench it agrees with experts as often as experts agree with each other (85% against 81% without ties). On JudgeBench\'s hard pairs with an objectively right answer, GPT-4o with the Arena-Hard prompt scores 56.57%, near the 50% of a coin, and its 2026 kappa there is 0.309. Reasoning models have replaced it as the strong single judge.',
  iss=[['Position bias, hardest case: GPT-4 kept its verdict after swapping the two answers in 65.0% of cases with the default prompt (MT-Bench Table 2), on pairs built as two GPT-3.5 samples at temperature 0.7 of the same first-turn question, so the answers are near-identical.', 'mtbench'],
       ['Position bias, ordinary case (a different measurement, not the same metric as the 65.0%): on the released MT-Bench judgments of the leaderboard models, the GPT-4 judge names the same winner in both orders 83.6% of the time (recount on the Judge bias lab tab), and consistency rises as the quality gap between the two answers grows (Shi et al. 2024).', 'biaslab'],
       ['Shi et al., Judging the Judges: a systematic study of position bias in LLM-as-a-judge (15 judges, MT-Bench and DevBench).', 'shi']])
W(id='frontier', n='Frontier reasoning model as single judge', sub='o1, o3-mini, DeepSeek-R1, Claude Opus 4.6, Gemini 3.1 Pro, GPT-5.4', kind='judge', modes=['pairwise', 'pointwise'], d='2024-10', s='judgebench',
  ow='mixed', owt='Some are open weights (DeepSeek-R1 and V3.2, GPT-oss 120B, Kimi K2.5, GLM-5); most are API-only.',
  cost=[['List prices from $0.15 (GPT-oss 120B) to $5.00 (Claude Opus 4.6) per million input tokens, April 2026 (Norman et al. Table 1); reasoning tokens come on top', 'reliab']],
  st='active', what='The same single-judge setup with a model that reasons before answering; on hard verifiable pairs the gain over chat models is large.',
  why='Highest official JudgeBench accuracy run by a third party: o3-mini (high) 80.86% against GPT-4o\'s 56.57%. In Norman et al.\'s March to April 2026 runs the top JudgeBench kappas are Claude Opus 4.6 (0.875) and Gemini 3.1 Pro (0.841). The ranking does not transfer: on MT-Bench the same 21 judges sit inside a 0.376 to 0.511 kappa band, and on LongJudgeBench GPT-5.2\'s best setting (0.525) is below GPT-4o-mini\'s (0.555).',
  corr=[['"JudgeBench: best frontier judges reach only ~64%; fine-tuned open judge models and reward models cluster at 55-64%."',
         '64.29% was Claude 3.5 Sonnet, the best chat model in v1 (October 2024). o1-preview already scored 75.43% in v1, and o3-mini (high) 80.86% in v2 (April 2025). Fine-tuned judges scored 13.14% (PandaLM) to 57.43% (Skywork-Critic 70B), most of them below a coin; reward models 59.43% to 64.29%.', 'judgebench'],
        ['"Rule of thumb ordering: frontier reasoning models > frontier chat models > specialised fine-tuned judges > small open models."',
         'True at the top of JudgeBench, but the fine-tuned judges sit below small general models there (Llama 3.1 8B 40.86% against JudgeLM-33B 35.71% and PandaLM 13.14%), and on LongJudgeBench GPT-5.2 trails GPT-4o-mini. Per-task calibration decides.', 'judgebench']])
W(id='poll', n='PoLL: a jury of smaller judges', sub='Panel of LLM evaluators from different families, votes or scores pooled', kind='method', modes=['pointwise', 'pairwise'], d='2024-04', s='poll',
  ow='mixed', owt='The paper\'s panel mixed an open-weights model (Command R) with two API models (Claude 3 Haiku, GPT-3.5).',
  cost=[['Seven to eight times cheaper than one GPT-4 Turbo judge; the panel cost $1.25 per million input and $4.25 per million output tokens (PoLL section 4.5)', 'poll']],
  st='active', what='Three judges from different model families score independently; the verdicts are pooled by vote or average, which dilutes any one family\'s bias toward its own outputs.',
  why='Beat GPT-4 alone on agreement with human labels in the paper\'s QA sets (KILT NQ kappa 0.763 against 0.627) and on correlation with the Arena ranking (Pearson 0.917 against 0.817). The evidence is the authors\' own, in three settings. RoPoLL (2026) proves mean pooling can be dragged arbitrarily far by one juror that fails in a biased way; use a median.')
W(id='ropoll', n='RoPoLL: robust jury aggregation', sub='The PoLL panel with a geometric-median aggregate', kind='method', modes=['pointwise', 'pairwise'], d='2026-06', s='ropoll',
  st='new', what='Keeps the jury but replaces the mean with the geometric median, which tolerates up to half of the jurors failing.',
  why='Preprint, not yet replicated. It reports that RoPoLL beats mean-pooled PoLL under every biased corruption it tried (13 open-weights judges, three reward-model benchmarks); its scores are on its own corruption setups, so no shared metric with the rows here.',
  quote=['ropoll_unbounded', 'ropoll_claim'])
W(id='prometheus2', n='Prometheus 2', sub='7B and 8x7B open judges for rubric scores and pairwise ranking', kind='judge', modes=['rubric', 'pairwise'], d='2024-05', s='prometheus2',
  ow='yes', owt='Apache-2.0 on Hugging Face.', ows='hf_prom7', st='legacy',
  what='Open judge models trained on GPT-4-written feedback for 1 to 5 rubric scores and pairwise verdicts, merged into one model.',
  why='Close to GPT-4 on its own tests (MT-Bench human judgments without ties: 71.96% for 8x7B against 79.90% for GPT-4-1106), but third-party meta-evaluations put it below a coin on JudgeBench (34.86% and 40.29%) and on EvalBiasBench (33.8% and 34.4%), and the 7B gave inconsistent verdicts across the two orders on 52.29% of JudgeBench pairs.')
W(id='judgelm', n='JudgeLM', sub='7B, 13B, 33B judges fine-tuned on GPT-4 judgments', kind='judge', modes=['pairwise'], d='2023-10', s='judgelm',
  ow='yes', owt='Weights on Hugging Face (no licence tag on the repository).', ows='hf_judgelm',
  cost=[['JudgeLM-7B judged the paper\'s validation set in 3 minutes on 8 A100 GPUs when run in parallel without explanations (6 hours 40 minutes with explanations, one at a time); JudgeLM Table 3', 'judgelm']],
  st='legacy', what='Scores both answers 1 to 10 in one pass; trained with swapped-order augmentation against position bias.',
  why='Beats GPT-4 on the PandaLM test set in its own paper (75.18% for 33B against 66.47%), but scores 25.14% to 35.71% on JudgeBench in independent runs and was inconsistent across orders on 59.71% of pairs (7B).')
W(id='pandalm', n='PandaLM', sub='7B (and 70B) pairwise judge for instruction tuning', kind='judge', modes=['pairwise'], d='2023-06', s='pandalm',
  ow='yes', owt='PandaLM-7B on Hugging Face, Apache-2.0.', ows='hf_pandalm', st='legacy',
  what='A judge trained to compare two responses and explain, built to pick fine-tuning hyperparameters without sending data to an API.',
  why='Its 70B reached GPT-4\'s accuracy on its own human-labelled test set (66.87% against 66.47%), but the 7B scores 13.14% on JudgeBench and 18.1% on EvalBiasBench in independent runs: an instrument calibrated on one distribution and broken off it.')
W(id='autoj', n='Auto-J', sub='13B generative judge with scenario-specific criteria', kind='judge', modes=['pairwise', 'pointwise'], d='2023-10', s='autoj',
  ow='yes', owt='GAIR/autoj-13b on Hugging Face (no licence tag on the repository).', ows='hf_autoj', st='legacy',
  what='Judges pairs or single responses with a written critique, using criteria chosen per scenario (summarisation, code, creative writing and so on).',
  why='55.0% agreement on its own pairwise test against GPT-4\'s 62.3%; independent runs give 36.57% on JudgeBench and 37.5% on EvalBiasBench.')
W(id='rocketeval', n='RocketEval checklist judges', sub='A frontier model writes per-query yes/no checklists once; a small model answers them', kind='method', modes=['checklist'], d='2025-03', s='rocketeval',
  ow='yes', owt='The judges are small open models (Gemma-2-2B, Llama-3-8B, Qwen2.5-1.5B); code MIT-licensed.', ows='rocket_code',
  cost=[['$27.70 per 1,000 runs of WildBench with Gemma-2-2B including checklist creation, against $3,400 with GPT-4o at batch prices (Table 4; arithmetic checked on the knowledge base page, which found the Llama-3-70B row does not reproduce)', 'rocket_kb']],
  st='active', what='Moves the judgment out of the judge: each query becomes 5 to 10 binary questions, each answered independently, and the score is read from the Yes/No logits rather than a sampled token.',
  why='Believe the cost arithmetic and the list-level result: 0.965 Spearman with Arena for Gemma-2-2B against 0.979 for GPT-4o, one discordant pair out of 66. On single responses it stays short of humans: 57.9% agreement with MT-Bench votes against a 64.7% human-to-human ceiling and GPT-4o\'s 66.6%.',
  page=['RocketEval paper page', 'n:3cd5c17b0d0d81ffa8e5f8fa5a5806c8'])
W(id='scalar_rm', n='Reward models used as judges', sub='Scalar (Bradley-Terry) scorers: ArmoRM, Skywork-Reward, Nemotron Reward, InternLM2 Reward', kind='rm', modes=['pointwise', 'best-of-N'], d='2024-03', s='rewardbench',
  ow='mixed', owt='Most leaders are open weights under their base model\'s licence (Skywork-Reward-V2-Llama-3.1-8B: Llama 3.1 licence).', ows='hf_skyv2',
  st='active', what='A model with a scalar head trained on preference pairs; one forward pass per response, no rationale. Built for RLHF and best-of-N, often reused as an automatic judge.',
  why='Cheap and strong on the tests built for them: Skywork-Reward-V2-Llama-3.1-8B tops RewardBench 2 at 84.1%. They do not transfer: the same model scores a Kendall tau of 0.133 on IF-RewardBench against 0.513 for Gemini 3 Flash, and Skywork-Reward fell to 46.6% on RM-Bench\'s style-biased pairs, below a coin. The training-time mirror is reward hacking.',
  page=['Topic: rl (reward models and reward hacking)', 'n:3c65c17b0d0d8195a6c6c11ad093c16e'], page2=['Reward Hacking (training topic)', 'n:3c65c17b0d0d8196a6f1f29a817aa974'])
W(id='genrm', n='Generative verifiers and generative reward models', sub='GenRM, Nemotron GenRM, RM-R1, RRM: the judgment written out as next-token prediction', kind='rm', modes=['pointwise', 'pairwise', 'best-of-N'], d='2024-08', s='genrm',
  ow='mixed', owt='NVIDIA\'s Qwen3-Nemotron-32B-GenRM-Principle is open weights (licence: other); no weights were found for the GenRM paper\'s own verifiers.', ows='hf_nemo',
  st='active', what='A verifier trained to write a verification (optionally with reasoning) and then a Yes or No token, so it can use chain of thought and majority voting at test time.',
  why='Its paper reports Best-of-N on GSM8K rising from 73% to 93.4%. On JudgeBench the best figure is NVIDIA\'s own submission (81.4%, vendor-run); independent rankings of generative reward models on IF-RewardBench put RRM-32B and RM-R1 at Kendall tau 0.072 and 0.052, far below general models.')
W(id='agentjudge', n='Agent-as-a-judge', sub='A judge with tools: reads files, runs code, inspects the environment and the trajectory', kind='method', modes=['agentic'], d='2024-10', s='aaj',
  owt='A framework; the original code and the DevAI dataset are open.', ows='aaj_code',
  cost=[['DevAI: $30.58 in API calls and 118.43 minutes, against about $1,297.50 for three experts (86.5 hours at $15 an hour); the LLM judge without tools cost $29.63', 'aaj']],
  iss=[['Section 4.4 says the agent judge cost 2.29% of the human cost and took 2.36% of the time; its own figures give the reverse ($30.58 / $1,297.50 = 2.36% of the cost; 118.43 of 5,190 minutes = 2.28% of the time), and the abstract\'s savings (97.64% of the cost, 97.72% of the time) agree with the figures.', 'aaj']],
  st='active', what='Instead of reading a transcript, the judge acts: it explores the produced repository, runs checks and verifies each requirement against evidence.',
  why='The original paper reports 90.44% alignment with expert consensus against 60.38% for an LLM judge (its own runs, 55 tasks). AJ-Bench (April 2026, third party) confirms the direction: the agentic mode adds 12.85 points for DeepSeek V3.2 and 13.41 for GPT-5-mini (low). MobileJudgeBench adds a caution: a simple screenshot judge matched purpose-built pipelines.')
W(id='guard', n='Guard models', sub='Safety classifiers that screen prompts and outputs at runtime', kind='pointer', modes=['classifier'], d='', s='guard_child', st='pointer',
  what='A judge specialised for one question (is this unsafe?) and run in the request path, not offline.',
  why='Owned by the Guardrails child page of this topic; their benchmark side (XSTest, HarmBench, refusal graders) is on the Safety and honesty child of Topic: benchmarks. Not scored here.',
  page=['Guardrails: staged runtime safety for LLM systems', 'n:3c65c17b0d0d819bbfa5dffa9246c297'], page2=['Safety and honesty benchmarks', 'n:3ef5c17b0d0d818da9d5efda1a443166'])

# meta-evaluations
W(id='mtbench', n='MT-Bench human judgments', sub='Expert pairwise votes on 80 multi-turn questions', kind='meta', modes=['pairwise'], d='2023-06', s='mtbench',
  size='About 3K expert votes on 6 models x 80 questions (paper); 2,391 pairwise items in Norman et al.\'s loader', chance='33% with ties, 50% without', ceil='Expert vs expert: 63% with ties, 81% without (first turn)',
  st='saturated', what='The first standard test of a judge: how often it picks the same answer as a human expert.',
  why='It no longer separates judges: Norman et al. (2026) found all 21 judges, GPT-4o-mini to Gemini 3.1 Pro, inside a 0.376 to 0.511 kappa band, and raw agreement overstates chance-corrected agreement by 33 to 41 points on every judge.',
  corr=[['"Human agreement is the ceiling: inter-annotator agreement on open-ended tasks is often 75-85%."',
         'It depends on what counts. On MT-Bench, experts agree 63% of the time when ties count and 81% without ties (first turn, Table 5); LLMBar\'s curated pairs reach 94%; DevAI\'s three experts disagreed with each other on 10% to 30% of requirements. Quote the metric with the number.', 'mtbench']])
W(id='llmbar', n='LLMBar', sub='419 pairs: one output follows the instruction, the other only looks better', kind='meta', modes=['pairwise'], d='2023-10', s='llmbar',
  size='419 instances (100 natural, 319 adversarial)', chance='50%', ceil='Expert annotators agree 94%', st='active',
  what='Tests whether a judge rewards instruction following over surface quality; the adversarial pairs are built so the wrong answer is more fluent or longer.',
  why='Still discriminates: ChatGPT with a plain prompt scores 32.0% on the adversarial set, below a coin, and GPT-4 needs the paper\'s best prompting to reach 82.8%. IF-RewardBench (2026) still reports its adversarial split.')
W(id='rewardbench', n='RewardBench', sub='Chosen vs rejected trios across chat, chat-hard, safety, reasoning', kind='meta', modes=['pairwise'], d='2024-03', s='rewardbench',
  size='2,985 prompt-chosen-rejected trios', chance='50%', st='saturated',
  what='The first broad benchmark for reward models, also run on generative judges.',
  why='Top scores crowd the ceiling: Norman et al. measured exact match up to 0.956 (Gemini 3.1 Pro) in 2026, and the RewardBench 2 authors report models scoring about 20 points lower on the successor. Use RewardBench 2.')
W(id='rewardbench2', n='RewardBench 2', sub='Best-of-4 on unseen human prompts, six domains', kind='meta', modes=['best-of-N'], d='2025-06', s='rewardbench2',
  size='Six domains: Factuality, Precise IF, Math, Safety, Focus, Ties', chance='25% (one correct out of four)', st='active',
  what='Picks the one correct or preferred completion out of four, on prompts the models have not seen; the authors also measure how scores carry over to best-of-N sampling and to RLHF training downstream.',
  why='Leaves room: the best printed average is 84.1% (Skywork-Reward-V2-Llama-3.1-8B), and generative judges trail it (Gemini 2.5 Pro 79.5%, Claude Opus 4 76.5%). Precise instruction following is the weak domain for nearly all.')
W(id='judgebench', n='JudgeBench', sub='Hard pairs where one answer is objectively right: knowledge, reasoning, math, code', kind='meta', modes=['pairwise'], d='2024-10', s='judgebench',
  size='350 pairs from GPT-4o responses (the official set) and 270 from Claude 3.5 Sonnet', chance='50%', st='active',
  what='Rates judges on factual and logical correctness rather than taste: each pair has one correct and one incorrect response from the same model, and the judge sees both orders.',
  why='The widest-spread judge test in 2026: Norman et al. found 21 judges spread over 60.4 points of kappa (0.271 to 0.875), against 13.5 on MT-Bench. Official accuracy runs from 13.14% (PandaLM) to 80.86% (o3-mini high) among third-party runs; vendor submissions reach 81.4%.')
W(id='evalbiasbench', n='EvalBiasBench', sub='Hand-written pairs that trigger six known judge biases', kind='meta', modes=['pairwise'], d='2024-07', s='offsetbias',
  size='80 pairs, each in both orders (160 items)', chance='50%', st='active',
  what='Length, concreteness, empty reference, content continuation, nested instruction and familiar knowledge: each pair is built so the biased choice is the wrong one.',
  why='Separates judges sharply: GPT-4o 86.9%, Llama 3 70B 75.0%, but PandaLM 18.1% and Prometheus 2 near 34%. Small: 24 to 34 pairs per bias, so per-bias numbers carry wide error bars. The Judge bias lab tab goes deeper on the biases themselves.')
W(id='rmbench', n='RM-Bench', sub='Reward models on subtle content changes and style bias', kind='meta', modes=['pairwise'], d='2024-10', s='rmbench',
  size='Chat, safety, code, math; normal, easy and hard settings', chance='50%', st='active',
  what='Pairs that differ in one subtle factual point, shown with the style of each side varied, so a judge that prefers style over substance fails the hard setting.',
  why='Skywork-Reward scored 46.6% on the hard (style-against-substance) setting, below a coin.')
W(id='ifrb', n='IF-RewardBench', sub='Ranking several responses to complex instructions', kind='meta', modes=['listwise'], d='2026-03', s='ifrb',
  size='Preference graphs over multiple responses per instruction; single-turn, multi-turn and system-prompt sets', chance='tau 0', st='new',
  what='Asks the judge to rank all responses for an instruction, closer to how judges are used in training than a single pair.',
  why='Exposes reward models: the RewardBench 2 leader Skywork-Reward-V2-Llama-3.1-8B gets tau 0.133, against 0.513 for Gemini 3 Flash. ACL 2026.')
W(id='rubriceval', n='RubricEval', sub='Rubric-level judgments for instruction following', kind='meta', modes=['rubric'], d='2026-03', s='rubriceval',
  size='3,486 instances, Easy and Hard subsets', st='new',
  what='Checks each rubric item\'s verdict instead of one score per response, the level at which rubric-based benchmarks actually grade.',
  why='GPT-4o, a common judge in instruction-following benchmarks, reaches 55.97% on the Hard subset. Rubric-level grading beat checklist-level in the authors\' runs; preprint.')
W(id='ajbench', n='AJ-Bench', sub='Judges that must act in an environment: search, data systems, GUI', kind='meta', modes=['agentic'], d='2026-04', s='ajbench',
  size='155 tasks, 516 annotated trajectories', st='new',
  what='Rates judges on verifying agent trajectories, where the evidence must be gathered with tools.',
  why='The best LLM-as-a-judge score is Gemini 3 Pro preview at 75.05; giving DeepSeek V3.2 tools lifts it from 64.49 to 77.34. Preprint, one group.')
W(id='ljb', n='LongJudgeBench', sub='Judging long outputs: deep research, surveys, long-chain analysis', kind='meta', modes=['pointwise', 'pairwise', 'listwise'], d='2026-06', s='ljb',
  size='1,944 instances; outputs average about 9,250 tokens (cl100k_base)', st='new',
  what='Meta-evaluation where the candidate is a whole report, not a paragraph.',
  why='No judge setting is reliable: the best average is 0.674 (Qwen3-Max with a reference), and GPT-5.2\'s best (0.525, with a rubric) is below GPT-4o-mini\'s (0.555). References help more than rubrics. Preprint.')
W(id='mjb', n='MobileJudgeBench', sub='Judging mobile-agent trajectories from screenshots', kind='meta', modes=['agentic'], d='2026-08', s='mjb',
  size='931 trajectories, 6 agent benchmarks, 4 agent models, 68 apps', st='new',
  what='Rates the judges that mobile-agent benchmarks rely on to say whether a task was completed.',
  why='A simple baseline with sampled screenshots (the authors\' own, 90.9% with Gemini 3 Flash) matched or beat purpose-built judge pipelines; the backbone model mattered more than the method. Preprint.')
W(id='reliab', n='Reliability without validity (Norman et al.)', sub='21 judges, three meta-evaluations, about 541,000 judgments', kind='study', modes=['pairwise'], d='2026-06', s='reliab',
  size='MT-Bench 2,391, JudgeBench 350, RewardBench 2,981 items; runs in March and April 2026', st='new',
  what='Runs every judge through the same harness on three meta-evaluations and reports Cohen\'s kappa, test-retest and bias audits side by side.',
  why='Three lessons for any judge choice: report kappa, not exact match (it overstated agreement by 33 to 41 points on MT-Bench); judge rankings move by up to 14 places between meta-evaluations; and high test-retest reliability coexisted with strong position bias in two production judges. Preprint.')

QUO = json.load(open(os.path.join(H, 'inputs', 'quotes.json')))
for w in ROWS:
    if w.get('quote'): w['quote'] = [QUO[k]['text'] for k in w['quote']]

# ---- presets for side by side ----
PRE = [['Judges on JudgeBench', ['gpt4', 'frontier', 'prometheus2']], ['Open fine-tuned judges', ['prometheus2', 'judgelm', 'autoj']],
       ['Reward model vs generative verifier', ['scalar_rm', 'genrm']], ['RewardBench, then and now', ['rewardbench', 'rewardbench2']],
       ['Cheap judging patterns', ['poll', 'rocketeval', 'agentjudge']], ['Agentic judge tests', ['ajbench', 'mjb', 'agentjudge']]]

# ---- fill and check, then write ----
from judge_checks import resolve
bad = 0
for r in RD:
    v, cell = resolve(r['chk'])
    if v is None:  # pointer to a whole row: the stated value must be printed in it
        if ('%.3f' % r['v']) not in cell: print('MISMATCH', r['id'], r['v'], cell); bad += 1
    elif r['v'] is None:
        r['v'] = v
    elif abs(r['v'] - v) > 1e-9:
        print('MISMATCH', r['id'], r['v'], v); bad += 1
    r['cell'] = cell if len(cell) < 140 else None
ids = [r['id'] for r in RD]
assert len(ids) == len(set(ids)), 'duplicate reading ids'
rowids = {w['id'] for w in ROWS}
for r in RD:
    assert r['row'] is None or r['row'] in rowids, r['id']
    assert r['on'] is None or r['on'] in rowids, r['id']
    assert r['m'] in M and r['s'] in S, r['id']
for w in ROWS:
    assert w['s'] in S, w['id']
    for c in w.get('cost') or []: assert c[1] in S
    for c in w['corr']: assert c[2] in S
for p in PRE:
    for x in p[1]: assert x in rowids, x
if bad: raise SystemExit('%d mismatches' % bad)

# headline per row: independent first (best by the metric's direction among the row's preferred metric), then self or vendor
PREF = {'gpt4': 'jb_acc', 'frontier': 'jb_acc', 'poll': 'kilt_kappa', 'prometheus2': 'jb_acc', 'judgelm': 'jb_acc', 'pandalm': 'jb_acc', 'autoj': 'jb_acc',
        'rocketeval': 'wb_rho', 'scalar_rm': 'rb2', 'genrm': 'jb_acc', 'agentjudge': 'ajb',
        'mtbench': 'mtb_kappa', 'llmbar': 'llmbar_adv', 'rewardbench': 'rb_kappa', 'rewardbench2': 'rb2', 'judgebench': 'jb_acc', 'evalbiasbench': 'ebb',
        'rmbench': 'rmb_hard', 'ifrb': 'ifrb_tau', 'rubriceval': 'rubric_hard', 'ajbench': 'ajb', 'ljb': 'ljb_acc', 'mjb': 'mjb_acc', 'reliab': 'jb_kappa'}
def best(cands, m):
    hi = M[m][4]
    return sorted(cands, key=lambda r: -r['v'] if hi else r['v'])[0] if cands else None
for w in ROWS:
    mine = [r for r in RD if (r['row'] == w['id'] or (w['kind'] in ('meta', 'study') and (r['on'] == w['id'] or (w['id'] == 'reliab' and r['s'] == 'reliab'))))]
    w['n_read'] = len(mine)
    m = PREF.get(w['id'])
    if not m: w['hl'] = None; w['hl2'] = None; continue
    if w['id'] == 'genrm':  # independent JudgeBench run does not exist for this row; independent reading is IF-RewardBench
        ind = best([r for r in mine if r['k'] == 'ind' and r['m'] == 'ifrb_tau'], 'ifrb_tau')
    else:
        ind = best([r for r in mine if r['k'] in ('ind',) and r['m'] == m], m) or best([r for r in mine if r['k'] == 'ind'], m)
    slf = best([r for r in mine if r['k'] in ('self', 'vendor') and r['m'] == m], m) or (best([r for r in mine if r['k'] in ('self', 'vendor')], [r for r in mine if r['k'] in ('self', 'vendor')][0]['m']) if any(r['k'] in ('self', 'vendor') for r in mine) else None)
    if w['id'] == 'gpt4': ind = next(r for r in RD if r['id'] == 'jb_g4o')  # the row is about GPT-4o-era judges; Claude 3.5 Sonnet's 64.29 stays in the detail
    w['hl'] = ind['id'] if ind else None
    w['hl2'] = slf['id'] if slf and (not ind or slf['v'] != ind['v'] or slf['m'] != ind['m']) else None

ENUM = {
 'kind': {'judge': ['Judge model', 'A model used as the judge with a prompt'], 'method': ['Judging method', 'A way of judging that works with several models'],
          'rm': ['Reward model or verifier', 'A model trained to score responses, used as a judge'], 'meta': ['Meta-evaluation', 'A test that rates judges against labels'],
          'study': ['Measurement study', 'One harness, many judges, several meta-evaluations'], 'pointer': ['Pointer', 'Owned by another page']},
 'mode': {'pointwise': 'pointwise', 'pairwise': 'pairwise', 'listwise': 'listwise', 'rubric': 'rubric', 'checklist': 'checklist', 'best-of-N': 'best-of-N', 'agentic': 'agentic (tools)', 'classifier': 'classifier'},
 'st': {'active': ['Active', 'Current practice, or still separates judges'], 'new': ['New (2026)', 'Published in 2026; little or no independent replication yet'],
        'legacy': ['Legacy', 'Beaten by later judges on independent meta-evaluations; kept for history and lineage'],
        'saturated': ['Saturated', 'No longer separates current judges'], 'pointer': ['Pointer', 'Covered on another page']},
 'k': {'ind': ['independent', 'Run by a third party, not the judge\'s or method\'s authors'], 'self': ['self-reported', 'Reported by the authors of the judge or method'],
       'vendor': ['vendor-run', 'Submitted to a leaderboard by the model\'s maker'], 'ref': ['reference', 'A baseline or human ceiling, not a judge']},
 'ow': {'yes': 'open weights', 'no': 'closed', 'mixed': 'mixed', 'n/a': 'not a model'},
}
OUT = dict(read_date=READ, about='Judge atlas for Topic: evaluation-and-llm-judges. Built by src/judges/mk_judges.py; every number is checked against src/judges/inputs by recompute.py.',
           sources={k: dict(t=v[0], u=v[1], d=v[2]) for k, v in S.items()}, metrics={k: dict(n=v[0], t=v[1], u=v[2], ch=v[3], hi=v[4]) for k, v in M.items()},
           enums=ENUM, rows=ROWS, readings=RD, presets=PRE)
json.dump(OUT, open(os.path.join(H, 'judges.json'), 'w'), indent=1, ensure_ascii=False)
JSO = dict(OUT, readings=[{k: v for k, v in r.items() if k not in ('chk', 'cell') and v is not None} for r in RD])
js = '// ---- Judge atlas (t-judges), part a: data ----\n// Written by src/judges/mk_judges.py; do not edit by hand. Same content as src/judges/judges.json.\nwindow.JUDGE_ATLAS=' + json.dumps(JSO, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(H, '..', 'parts', '33_js_judges_a.js'), 'w').write(js)
print(len(ROWS), 'rows,', len(RD), 'readings,', len(js), 'bytes of JS')
