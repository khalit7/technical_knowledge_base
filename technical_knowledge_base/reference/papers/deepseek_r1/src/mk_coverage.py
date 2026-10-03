"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "16 min read, +~5h 35m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors/lab: DeepSeek-AI, core contributors Daya Guo, Dejian Yang, Junxiao Song, Peiyi Wang, Zhihong Shao', R + ', headline card', ['Daya Guo', 'Dejian Yang', 'Junxiao Song', 'Peiyi Wang', 'Zhihong Shao']),
 ('Date: January 2025 (v1); v2 January 2026 is the expanded Nature version (Nature, September 2025)', R + ', headline card; Two versions', ['arXiv v1 22 January 2025', 'arXiv v2 4 January 2026', 'published 17 September 2025']),
 ('Link arXiv 2501.12948 (~2h, long report)', 'card; Further reading', ['https://arxiv.org/abs/2501.12948', '(2h)']),
 ('Link Nature paper (~1h 30m, expanded version)', 'Further reading', ['https://www.nature.com/articles/s41586-025-09422-z', '(1h 30m)']),
 ('Link GitHub (~20 min README and entry path)', 'card; Further reading; What it takes', ['https://github.com/deepseek-ai/DeepSeek-R1', 'About 20 minutes for the README and the entry path']),
 ('Link Models on HF (~10 min)', 'Further reading', ['https://huggingface.co/deepseek-ai', '(10 min)']),
 ('Pure RL against rule-based verifiable rewards, no reasoning SFT (R1-Zero); four-stage R1; distillation by plain SFT', R + ', Problem', ['can reasoning <b>emerge from reinforcement learning alone</b>', 'builds DeepSeek-R1 in four stages']),
 ('Open blueprint for o1-style reasoning and founding recipe of RLVR', R + ', Why it matters', ['It showed that RL with verifiable rewards works at scale, in the open']),
 # resources
 ('Illustrated DeepSeek-R1 (Alammar, ~20 min)', 'Further reading', ['https://newsletter.languagemodels.co/p/the-illustrated-deepseek-r1', 'the fastest way to get the whole picture']),
 ('Understanding Reasoning LLMs (Raschka, ~30 min)', 'Further reading', ['https://magazine.sebastianraschka.com/p/understanding-reasoning-llms', 'four ways to build reasoning models']),
 ("DeepSeek R1's recipe to replicate o1 (Lambert, ~20 min)", 'Further reading', ['https://www.interconnects.ai/p/deepseek-r1-recipe-for-o1', 'the o1 replication race']),
 ('Open-R1 (HF, repo ~25 min)', 'Further reading; What it takes', ['https://github.com/huggingface/open-r1', '(25 min)']),
 # problem
 ('Gains came from human CoT SFT plus inference tricks (few-shot CoT, majority voting, PRM search)', R + ', Problem', ['human-written chains of thought used for supervised fine-tuning', 'search against a process reward model']),
 ('Human demonstrations expensive, do not scale, cap at human patterns', R + ', Problem', ['inherently capped by the human-provided exemplars']),
 ('PRM and MCTS hit reward hacking and search-space problems', R + ', Failed attempts', ['inevitably leads to reward hacking', 'exponentially larger search space']),
 ('o1 proved long-CoT test-time scaling, published nothing on how', R + ', Problem', ['published nothing about how it was trained']),
 # R1-Zero
 ('V3-Base (671B MoE, 37B active), no SFT, large-scale GRPO with rule rewards only', R + ', R1-Zero', ['671B-parameter mixture of experts with 37B active']),
 ('GRPO recap: G outputs, z-scored advantage shared across tokens, clipped ratio, k3 KL, no critic', R + ', R1-Zero (linked to DeepSeekMath)', ['divided by the group\'s standard deviation, shared by all its tokens', 'unbiased k3 estimator', 'No value model']),
 ('Nature adds PPO vs GRPO: PPO matches only with lambda 1.0; 0.95 much worse; still a value model', R + ', R1-Zero', ['the default value in most open-source PPO implementations', 'with λ = 1.0 it nearly matches GRPO']),
 ('Reference refreshed every 400 steps', R + ', settings', ['replaced by the latest policy every 400 steps']),
 ('Rewards: accuracy (boxed answer, sympy; compiler + tests) + format (think tags), equal weight', R + ', reward', ['accuracy reward', 'format reward', '"combined with the same weight"']),
 ('No neural reward models: hacked at scale, retraining complexity', R + ', reward', ['neural reward models are susceptible to reward hacking']),
 ('Template: minimal think-then-answer with tags, no content constraints', R + ', template (verbatim)', ['The assistant first thinks about the reasoning process in the mind']),
 ('Hyperparameters: lr 3e-6, KL 0.001, temp 1.0, G=16, max 32,768 then 65,536 after 8.2k (jump), 32 q/step batch 512, 10,400 steps 1.6 epochs, 8,192 outputs, 16 minibatches, single inner epoch (nearly on-policy)', R + ', settings (with the epochs arithmetic flagged)', ['learning rate 3e-6, KL coefficient 0.001', '16 answers per question; 32 questions per step, so 512 answers per step', '32,768 tokens until step 8.2k, then 65,536', '"corresponding to 1.6 training epochs"', 'randomly split into 16 minibatches', '"Nearly on-policy" is fair']),
 ('RL data (Table 4): 26k math, 17k algorithm + 8k bug-fixing, 22k STEM MC, 15k logic incl. code-IO and puzzles; binary reward', R + ', questions (table and text differ on code)', ['Maths, 26K', '"along with 8K bug fixing problems"', 'STEM, 22K', 'Logic, 15K', 'code-IO']),
 ('AIME 2024 pass@1 15.6 -> 77.9 (86.7 with self-consistency)', R + ', What emerged; Figure 1 decoded', ['rises from 15.6% to 77.9%, and to 86.7% with a majority vote']),
 ('Length grows from hundreds to ~10k+ tokens because longer thinking earns reward', R + ', What emerged (corrected: about 500 to about 14,200 tokens)', ['from about 500 tokens', 'to about 14,200 (last 100), 28 times longer']),
 ('Reflective words rise 5-7x; "wait" nearly absent, spikes after step 8000', R + ', Figure 9 decoded', ['4.8 to 6.6 times', 'spikes after 8,000']),
 ('Aha moment quote', R + ', aha moment (verbatim)', ["Wait, wait. Wait. That's an aha moment I can flag here."]),
 ('Self-verification, reflection, strategy switching incentivized not demonstrated', R + ', What emerged; with caveats', ['What RL changed is how often and how long, not whether']),
 ('Failure modes: readability, EN/CN mixing (V3-Base bilingual), narrow (instruction following, writing, open QA)', R + ', What was wrong with it', ['poor readability', 'occasionally combining English and Chinese', 'which might be the cause for DeepSeek-R1-Zero language mixing']),
 # R1
 ('Dev1/Dev2/Dev3 named checkpoints in Nature version', R + ', four stages', ['Dev1, Dev2 and Dev3 in the Nature version']),
 ('Cold start: thousands of long CoT samples from R1-Zero at temp 1.0, keep correct (sympy) and readable (repetition, language filters), V3 + humans rewrite to first-person style, add summary; SFT V3-Base', R + ', Stage 1', ['sample several answers per prompt from R1-Zero at temperature 1.0', 'checked with sympy', 'in the first person']),
 ('Cold start costs raw math: AIME 59.0 vs 77.9', R + ', Stage 1; predict question', ['AIME 77.9 to 59.0']),
 ('Reasoning RL: same recipe + language consistency reward (fraction target words, slight cost, more readable) + clip eps 10 (low truncates gradients, high unstable); AIME 74.0', R + ', Stage 2; toy tests the clip', ['A language-consistency reward', 'A clip ratio ε of 10.', 'a lower value can lead to the truncation of gradients', 'AIME 74.0']),
 ('Rejection-sampling SFT: from Dev2, keep correct, V3 as generative judge, filter mixed/rambling/code-block CoTs; ~600k reasoning + ~200k non-reasoning (writing, QA, translation, SWE) some with V3 CoT; SFT V3-Base again on 800k, 2-3 epochs, lr 5e-5 cosine to 5e-6, ctx 32,768, batch 128', R + ', Stage 3', ['About 600K reasoning samples', 'About 200K non-reasoning samples', 'V3-Base, not Dev2', 'cosine learning rate from 5e-5 to 5e-6, context 32,768, batch 128']),
 ('Adds general and writing ability (AlpacaEval, Aider jumps)', R + ', Stage 3', ['Aider-Polyglot 25.6 to 44.8']),
 ('All-scenario RL: rule rewards for reasoning, helpful RM (66k V3-judged pairs, arena-hard format, length-debiased, summary only), safety RM (pointwise, 106k prompts, whole response), language reward; temp 0.7; 1,700 steps, preference rewards only last 400 (reward hacking)', R + ', Stage 4; Figure 6 decoded', ['66,000 pairs', '106,000 prompts', 'Temperature drops to 0.7', '1,700 steps, with general data and preference rewards only in the last 400']),
 ('Cost Table 7: R1-Zero 101K GPU-h ($202K, ~198h on 512 H800s), SFT data 5K ($10K), R1 41K ($82K, ~80h): $294K total on top of V3-Base', R + ', Cost (with the 4-days inconsistency)', ['R1-Zero 101K GPU hours ($202K), SFT data creation 5K ($10K), R1 41K ($82K): 147K hours, $294K', '512 × 198 = 101,376']),
 ('RL infra: vLLM rollout with EP and MTP self-speculative decoding, async rule rewards, offloading, best-fit length-sorted packing, DualPipe', R + ', Cost and infrastructure', ['self-speculative decoding', 'run asynchronously', 'packs it into fixed-length chunks with best-fit', 'uses DualPipe', 'offloaded from GPU memory']),
 # distillation
 ('Distillation: same 800k samples, plain SFT, no RL, on Qwen2.5-Math-1.5B/7B, Qwen2.5-14B/32B, Llama-3.1-8B, Llama-3.3-70B-Instruct; 2-3 epochs, ctx 32,768, batch 64, lr 1e-4 to 2e-5', R + ', Distillation', ['Qwen2.5-Math-1.5B and 7B, Qwen2.5-14B and 32B, Llama-3.1-8B and Llama-3.3-70B-Instruct', 'initial learning rates from 1e-4 (1.5B) to 2e-5 (70B)', 'batch 64']),
 ('Qwen2.5-32B-Zero (10k+ steps) only reaches QwQ-32B-Preview; Distill-Qwen-32B beats it on every benchmark', R + ', predict question; Table 16', ['The RL-trained Qwen2.5-32B-Zero only matches QwQ-32B-Preview', 'A, by 25.6 points (72.6% against 47.0%)']),
 ('Conclusion: patterns transfer cheaply by SFT; small models cannot discover them via RL at reasonable compute; frontier needs strong base + large RL', R + ', Distillation (corrected: overstated; Qwen2-Math-7B-Zero)', ['overstates it', 'may not even achieve the performance of distillation']),
 # results
 ('R1-Zero: 15.6 -> 77.9 pass@1 (86.7 cons@16), above average human AIME competitor', R + ', What emerged', ['above the 37.8% average of human AIME participants']),
 ('Stage-wise AIME 77.9 -> 59.0 -> 74.0 -> 78.1 -> 79.8', R + ', stage animation; predict reveal', ['74.0% (Dev2), the 800K fine-tune to 78.1% (Dev3) and the last RL stage to 79.8%']),
 ('Final R1: MATH-500 97.3, Codeforces 2029 (96.3 pct), LiveCodeBench 65.9, GPQA 71.5, MMLU 90.8, SWE Verified 49.2', R + ', Results', ['MATH-500 97.3% against 96.4%', 'Codeforces 2,029 against 2,061 (96.3rd percentile)', 'LiveCodeBench 65.9%', 'GPQA Diamond 71.5%', 'MMLU 90.8%', '49.2% against 48.9%']),
 ('Stage 4 lifts AlpacaEval 2.0 by 25% and ArenaHard by 17% (to 87.6 / 92.3)', R + ', Stage 4 (corrected: points, not percent)', ['they are 25.5 and 16.7 <i>points</i>']),
 ('On par with o1-1217 at a fraction of the price', R + ', Results; What it takes (launch prices, beyond the paper)', ['On par with o1-1217 in maths and competitive code', '$0.55 per million input tokens', "against o1's $15 and $60"]),
 ('Distill-Qwen-7B 55.5 AIME / 92.8 MATH-500; Distill-Qwen-32B 72.6 / 94.3 / 62.1 GPQA; Distill-Llama-70B 70.0 / 94.5', 'Tables tab (Table 15); distillation chart', ['92.8', '94.3', '94.5', '62.1']),
 ('Distills crush GPT-4o and Claude on reasoning; 32B roughly matches o1-mini', R + ', Distillation', ['beat o1-mini on five of six']),
 ('Negative results: PRM (fuzzy steps, unscalable annotation, hacking) and MCTS (exponential space, value model too hard)', R + ', Failed attempts', ['A fine-grained "step" is hard to define', 'a fine-grained value model is hard to train']),
 # why it matters
 ('Proof RLVR works at scale: hard verifiable questions + reliable verifier + compute; capability latent in base, RL elicits', R + ', Why it matters; Conclusion quotes', ['with capability elicited and sharpened from what the base model already had']),
 ('Open agenda: MIT weights for R1, R1-Zero, six distills; replication wave (Open-R1, TinyZero, SimpleRL, verl/TRL); GRPO+binary rewards default', R + ', Why it matters; What it takes (corrected: students inherit Qwen/Llama licences)', ['Open weights for R1, R1-Zero and six students started a replication wave', 'the Qwen-based students inherit Apache 2.0']),
 ('Market reaction to the $294K figure', R + ', Why it matters (corrected: the reaction came in January 2025; the $294K was published in September)', ['the $294K cost of R1\'s RL was published eight months later']),
 ('Practical lessons for a GRPO loop: rule rewards only in long runs; clip ratio; refresh reference; group advantage temp 1 single inner epoch; length as signal and cost; small cold start trades pass@1 for control', R + ', Why it matters (lessons kept)', ['Practical lessons the old summary drew for building a GRPO loop']),
 ('Known limitations: no tool use, prompt-sensitive, language mixing outside EN/CN, weak SWE gains, token inefficiency', R + ', Results, limitations', ['weak structured output and no tool use', 'sensitivity to prompts', 'little gain on software engineering']),
 ('Dr. GRPO, DAPO later corrected GRPO length and difficulty biases', R + ', Why it matters; toy', ["fixed GRPO's length and difficulty biases"]),
 # connections
 ('DeepSeekMath: introduced GRPO; R1 is GRPO scaled up with verifiable rewards', 'Connections; Further reading', ['3c65c17b0d0d817f9fc5cb9a9fbcbee5', 'R1 is GRPO scaled up with verifiable instead of learned rewards']),
 ('DeepSeek-V3: base model; SFT data supplies 200k non-reasoning samples', 'Connections', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'its SFT data supplies the 200K non-reasoning samples']),
 ('InstructGPT: SFT-then-RLHF paradigm partly inverted', 'Connections', ['3c65c17b0d0d8180b958d8299996a063', 'partly inverts']),
 ('DPO: offline alternative; stage 4 shows where online RL with preference RMs is used and its hacking risk', 'Connections', ['3c65c17b0d0d818bb1d8cafd30e20f9e', 'the offline alternative for preference alignment']),
 ('Qwen3: descendant with R1-style pipeline; Qwen2.5 are distillation students', 'Connections', ['3c65c17b0d0d81a19006e6b096a6e14b', 'R1-style long chain-of-thought RL pipeline']),
 ('KB topics rl and llm-training-and-post-training', 'Connections; Further reading', ['3c65c17b0d0d8195a6c6c11ad093c16e', '3c65c17b0d0d81b6876ee72b7056793b']),
 ('Database property Takeaway', "stays in the database; also the headline card's one line", ['800k R1 samples distill reasoning into 1.5B-70B models by SFT alone']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:38:49)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
