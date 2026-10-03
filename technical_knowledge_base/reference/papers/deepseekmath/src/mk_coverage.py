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
 ('Reading time line "14 min read, +~4h 15m resources"', 'dropped: replaced by the build-computed reading time and resources total of the new page', ['min to read', 'of resources']),
 ('Authors/lab: Shao, Wang, Zhu, Xu, Song, et al. (DeepSeek-AI, with Tsinghua and Peking University)', R + ', headline card (full author list)', ['Zhihong Shao', 'Peiyi Wang', 'Qihao Zhu', 'Runxin Xu', 'Junxiao Song', 'DeepSeek-AI, with Tsinghua University and Peking University']),
 ('Date: February 2024 (arXiv v1; v3 April 2024)', R + ', headline card, with what each version changed', ['February 2024 (arXiv v1)', 'v3 April 2024']),
 ('Link arXiv 2402.03300 (~1h 30m, long paper)', 'card; Further reading', ['https://arxiv.org/abs/2402.03300', '(1h 30m)']),
 ('Link GitHub (~20 min for the README and entry path)', 'card; Further reading; What it takes', ['https://github.com/deepseek-ai/DeepSeek-Math', 'About 20 minutes for the README and the evaluation entry point']),
 ('Link Models on HF (~10 min)', 'Further reading; What it takes', ['https://huggingface.co/deepseek-ai/deepseek-math-7b-rl', '(10 min)']),
 ('Introduced GRPO, later the default RL algorithm for reasoning models (DeepSeek-R1, most of the open RLVR ecosystem)', R + ', Problem; Why it matters', ['GRPO became the default algorithm for RL with verifiable rewards', 'The open ecosystem standardised on it']),
 ('Built a 120B-token Common Crawl math corpus that let a 7B model match Minerva 540B', R + ', Base model (corrected: ahead on GSM8K and MATH, behind on OCW and MMLU-STEM; "comparable")', ['behind on OCW Courses (15.4 against 17.6) and MMLU-STEM (56.5 against 63.9)', '"comparable", the paper\'s word in §1.1, is fairer than "outperforms"']),
 # resources
 ('Yuge Shi: A vision researcher\'s guide to PPO & GRPO (~40 min): PPO machinery and what GRPO deletes', 'Further reading, Best resources', ['https://yugeten.github.io/posts/2025/01/ppogrpo/', 'exactly what GRPO deletes from it', '(40 min)']),
 ('RLHF Book, Policy Gradient chapter (Lambert, ~30 min): GRPO among REINFORCE/PPO variants, formulas and caveats', 'Further reading, Best resources', ['https://rlhfbook.com/c/11-policy-gradients.html', 'with the advantage formulas and the implementation caveats side by side', '(30 min)']),
 ('TRL GRPOTrainer docs (~20 min): reference open implementation; where modern practice diverges (loss aggregation, KL handling)', 'Further reading; What it takes', ['https://huggingface.co/docs/trl/grpo_trainer', 'where modern practice departs from the paper (loss aggregation, KL handling)', '(20 min)']),
 ('Dr. GRPO paper (~45 min): length and difficulty biases; read after the original', 'Further reading; Why it matters; Then and now', ['https://arxiv.org/abs/2503.20783', 'read it after the original', '(45 min)']),
 # problem
 ('Open models trailed GPT-4 and Gemini Ultra on competition math (best open MATH ~25-36% vs GPT-4 ~53%)', R + ', Problem (corrected with Table 5: best open chain-of-thought 37.7%, best open base 25.3%; GPT-4 52.9%, Gemini Ultra 53.2%)', ['GPT-4 scored 52.9% and Gemini Ultra 53.2%', 'InternLM2-Math 20B at 37.7%', 'Llemma 34B, was at 25.3%']),
 ('Bottleneck 1: no public math corpus of scale and quality (Minerva closed; OpenWebMath 13.6B tokens)', R + ', Problem', ['Minerva\'s math web data was closed; the open OpenWebMath had 13.6B tokens']),
 ('Bottleneck 2: PPO memory-hungry, critic as large as the policy, reward only at the final token', R + ', Problem; GRPO', ['trains a value model (the critic) about as large as the policy', 'the reward usually arrives only at the last token']),
 # corpus
 ('Iterative fastText loop over deduplicated Common Crawl (40B HTML pages after URL dedup)', R + ', The corpus, step 2', ['URL deduplication and near-deduplication is 40B HTML pages']),
 ('1. fastText: 500K OpenWebMath positives, 500K random CC negatives; dim 256, word n-grams up to 3, 3 epochs', R + ', The corpus, step 1 (plus learning rate 0.1 and minimum count 3)', ['500,000 OpenWebMath pages as positives and 500,000 random Common Crawl pages as negatives', 'vector dimension 256', 'word n-grams up to 3', '3 epochs']),
 ('2. Score and rank all CC pages, keep the top (top 40B in round one)', R + ', The corpus, step 2', ['rank by score, keep the top', 'the first round keeps 40B tokens']),
 ('3. Domains with over 10% of pages recalled flagged math-related (mathoverflow.net); humans annotate math URL patterns; uncollected pages under them become positives', R + ', The corpus, steps 3 and 4; animation', ['over 10% of its pages collected is called math-related (for example mathoverflow.net)', 'People mark the math URL patterns inside those domains (mathoverflow.net/questions)', 'become new positives']),
 ('4. Retrain and repeat; four iterations: 35.5M pages, 120B tokens; by iteration 3 nearly 98% already found, so they stopped', R + ', The corpus; animation', ['35.5M pages, 120B tokens', 'nearly 98% of what was collected had already been collected in the third, so they stopped']),
 ('Decontamination: drop pages with a 10-gram exactly matching GSM8K, MATH, CMATH or AGIEval; exact match for 3-9 gram segments', R + ', The corpus (Decontamination)', ['10-gram that exactly matches a substring of GSM8K, MATH, CMATH or AGIEval', 'shorter than 10 grams but at least 3 grams are matched exactly']),
 ('Controlled 1.3B / 150B-token runs: beats MathPile, OpenWebMath, Proof-Pile-2 by wide margins; keeps improving where smaller corpora plateau from repetition; multilingual (English and Chinese)', R + ', Is it any good (Table 1 chart; quality, multilingual, scale)', ['trained for 150B tokens on each corpus', 'leads on all eight', 'repeated several times over 150B tokens, plateau', 'mostly English and Chinese']),
 # base model
 ('DeepSeekMath-Base 7B: continue DeepSeek-Coder-Base-v1.5 7B for 500B tokens (56% corpus, 20% GitHub code, 10% arXiv, 10% CC natural language, 4% AlgebraicStack)', R + ', Base model; data-mix bar', ['DeepSeek-Coder-Base-v1.5 7B', '500B tokens', 'DeepSeekMath Corpus 56%', 'GitHub code 20%', 'arXiv 10%', 'AlgebraicStack 4%']),
 ('Starting from a code model beats starting from a general LLM; code training helps math, tool-free and tool-using', R + ', Base model, Lesson 1 (Tables 6 and 7)', ['code first helps math', 'without tools (GSM8K 21.9% against 19.1%', 'and with tools (17.4% against 14.3%']),
 ('arXiv papers surprisingly ineffective as math pretraining data', R + ', predict question (Tables 8 and 9) with the authors\' own caveats', ['It fell: 11.5% after MathPile, 11.1% after ArXiv-RedPajama', '"Seem ineffective", in their words']),
 # SFT
 ('SFT: 776K English and Chinese math examples in CoT, program-of-thought, tool-integrated formats gives Instruct 7B', R + ', Instruction tuning', ['776K examples', 'chain-of-thought, program-of-thought, and tool-integrated reasoning']),
 # GRPO
 ('PPO maximises the clipped surrogate with per-token advantage from GAE, which requires learning a value function', R + ', GRPO (Eq. 1)', ['Generalized Advantage Estimation (GAE), which needs a learned value function']),
 ('Critic is a second full-size model, trained to predict per-token values from a last-token reward: noisy, hard to fit', R + ', Problem; GRPO (animation; GAE reach widget)', ['A second network, as large as the policy', 'Why the critic is the hard part']),
 ('GRPO deletes the critic; baseline = mean reward of a group of samples for the same question', R + ', Problem; GRPO', ['deletes the critic and uses the average reward of a group of answers to the same question as the baseline']),
 ('Objective: sample G outputs from the old policy; J = E[(1/G) sum_i (1/|o_i|) sum_t {min(r A, clip(r) A) - beta D_KL}]', R + ', GRPO (Eq. 3)', ['𝒥 GRPO (θ) = 𝔼 (1/ G ) Σ i (1/| o i |) Σ t', 'clip( ρ i,t , 1 − ε, 1 + ε)']),
 ('r_{i,t}(theta) = per-token importance ratio pi_theta / pi_theta_old', R + ', GRPO (ρ in Eq. 1)', ['ρ t = π θ ( o t | q , o < t ) / π old ( o t | q , o < t )']),
 ('Departure 1: KL moved out of the reward into the loss, so it does not contaminate the advantage; Schulman\'s unbiased k3 estimator, always nonnegative', R + ', GRPO (Eq. 4), plus the k3 gradient caveat (Tang and Munos) and widget', ['KL moves out of the reward into the loss', 'π ref /π θ − log(π ref /π θ ) − 1', '"guaranteed to be positive"', 'k3 is an unbiased, always-positive']),
 ('Departure 2: group-relative advantage matches how reward models are trained (comparisons of answers to the same question)', R + ', GRPO', ['"aligns well with the comparative nature of rewards models"', 'trained as they are on comparisons between answers to the same question']),
 ('Outcome supervision: normalise r within the group; every token of o_i gets A = (r_i - mean)/std; what everyone now means by GRPO', R + ', GRPO; animation; unified-view widget', ['Outcome supervision', 'the variant everyone now means by GRPO', '( r i − mean( r )) / std( r )']),
 ('Process supervision: PRM per step; step rewards normalised across all steps of all G outputs; token advantage = sum of normalised rewards of steps ending at or after t', R + ', GRPO; GRPO (PS) in the widget and the toy', ['a process reward model scores each reasoning step', 'the sum of the normalised rewards of the steps ending at or after it']),
 ('In their ablations GRPO+PS beats GRPO+OS, especially on MATH', R + ', Unified view (corrected: +1.7 GSM8K, +0.3 MATH; the reverse of "especially on MATH")', ['GRPO+PS leads GRPO+OS by 1.7 points on GSM8K and 0.3 on MATH']),
 ('Iterative GRPO: RM goes stale; retrain RM on current-policy samples with 10% replay; reset reference to current policy; two iterations, most gain in the first', R + ', GRPO (Iterative RL); Unified view (Figure 6 decoded)', ['continue training the reward model on the new data with a replay of 10% historical data, reset the reference model to the current policy', 'Iterating helps, mostly once']),
 ('Recipe: start from Instruct 7B; RL only on ~144K GSM8K/MATH CoT questions (other SFT data excluded to test generalisation); RM from Base 7B (LR 2e-5)', R + ', GRPO (recipe)', ['about <b>144K questions', 'leaving out the rest on purpose', 'initialised from the Base 7B, learning rate 2e-5']),
 ('Policy LR 1e-6, beta 0.04, G = 64, max length 1024, batch 1024, single policy-gradient update per sampling batch (on-policy, eps clipping barely binds)', R + ', GRPO (recipe; predict question: the clip does not bind at all)', ['Policy learning rate 1e-6', 'KL coefficient β = 0.04', 'G = 64 samples per question', 'maximum length 1,024, training batch size 1,024', 'Nothing. The ratio compares the policy']),
 # unified
 ('Section 5.2 rewrites every method\'s gradient as E[(1/|o|) sum_t GC(q,o,t,r) grad log pi]', R + ', Unified view (Eq. 5)', ['GC 𝒜 ( q , o , t , π rf ) ∇ θ log π θ']),
 ('Three knobs: data source (offline from SFT model: RFT, DPO; online from current policy: Online RFT, PPO, GRPO), reward (rule vs learned model), gradient coefficient (SFT 1; RFT correctness indicator; DPO sigmoid pairwise; PPO/GRPO advantage)', R + ', Unified view; GC widget; Tables tab (Table 10)', ['the data source', 'the reward function', 'the gradient coefficient', '1 if the answer is right, 0 if not (Eq. 10)', 'σ(β(log-ratio of o⁻ − log-ratio of o⁺))']),
 ('Ablations: Online RFT overtakes offline RFT late (policy drifts from SFT model)', R + ', Unified view (Figure 5 decoded); toy', ['Online beats offline, late.']),
 ('GRPO beats Online RFT because graded, reward-proportional GC penalises wrong answers', R + ', Unified view (with the decoded margins: within one standard error); How much to believe', ['Graded coefficients beat a 0/1 rule.', 'inside one standard error of a single evaluation']),
 ('Iterative RL beats static; the cleanest published mental model for why these methods differ', R + ', Unified view', ['Iterating helps, mostly once', 'one of the cleanest mental models for why these methods behave differently']),
 ('Why RL works: RL boosts Maj@K but not Pass@K; reweights mass toward already-reachable answers; prefigured the 2025 "sharpen or add capability" debate', R + ', Why RL works (Figure 7 decoded, predict question, toy)', ['Pass@K', 'Maj@K', 'prefigured the 2025 debate']),
 # results
 ('Base 7B: 64.2% GSM8K, 36.2% MATH; beats all open base models incl. Llemma-34B by over 10 points on MATH; matches Minerva 540B (77x larger)', R + ', Base model (Minerva claim corrected)', ['64.2% GSM8K and 36.2% MATH', '10.9 points above Llemma 34B on MATH', '77 times larger']),
 ('Instruct 7B: 46.8% MATH, above all open models and most proprietary (Inflection-2, Gemini Pro) by 9+ points', R + ', Instruction tuning', ['46.8% on MATH', 'Inflection-2 (34.8%) and Gemini Pro (32.6%) by 12 and 14 points', '9.1 points above the best other open model']),
 ('RL 7B: GSM8K 82.9 -> 88.2, MATH 46.8 -> 51.7 (first open model over 50% on MATH); CMATH 84.6 -> 88.8 although RL touched only GSM8K/MATH', R + ', Results (with the qualifier: first over 50% without tools)', ['GSM8K 82.9% to <b>88.2%', 'MATH 46.8% to <b>51.7%', 'CMATH 84.6% to 88.8%', 'is true <b>without tools']),
 ('60.9% MATH with self-consistency over 64 samples', R + ', Results; Figure 7', ['Self-consistency over 64 samples reaches 60.9% on MATH']),
 ('Corpus ablation at 1.3B: DeepSeekMath Corpus beats MathPile, OpenWebMath, Proof-Pile-2 on every benchmark, steeper non-plateauing curve', R + ', Is it any good (Table 1)', ['leads on all eight', 'its curve keeps climbing']),
 # why it matters
 ('R1 and R1-Zero run GRPO with rule-based rewards instead of a learned RM: cheap and stable enough to work', R + ', Why it matters; Then and now', ['DeepSeek-R1 and R1-Zero run GRPO with rule-based rewards instead of a learned reward model']),
 ('Ecosystem standardised: HF open-r1, TRL GRPOTrainer, verl, most 2025 reasoning-RL papers', R + ', Why it matters', ['Hugging Face\'s open-r1', 'verl, and most 2025 reasoning-RL papers']),
 ('Dropping the critic roughly halves the trained-model memory and removes the hardest-to-tune component', R + ', Why it matters; memory widget (derived: 44% of weight and optimiser memory)', ['halves the number of trained models and removes PPO\'s hardest-to-tune component', 'saving']),
 ('Dr. GRPO: 1/|o_i| rewards long wrong answers; std(r) over-weights too-easy and too-hard questions; drop both: unbiased REINFORCE-style estimator with group-mean baseline', R + ', Why it matters; Then and now; toy (Dr. GRPO)', ['favours long wrong answers', 'too-easy and too-hard questions more weight', 'unbiased REINFORCE-style estimator with a group-mean baseline']),
 ('DAPO: clip-higher (decoupled eps_low/eps_high), dynamic sampling (discard all-equal groups), token-level loss, overlong shaping', R + ', Why it matters; Then and now', ['Clip-Higher (decoupled ε', 'Dynamic Sampling (drop groups whose rewards are all equal', 'a token-level loss', 'Overlong Reward Shaping']),
 ('Much later work drops the KL entirely with verifiable rewards; TRL implements most of these as flags', R + ', Why it matters; Then and now', ['drops the KL term entirely when the reward is verifiable', 'TRL implements most of these as flags']),
 ('Data chapter: one of the best public recipes for domain-targeted CC mining; code helps reasoning, arXiv does not, shaped data-mixing', R + ', Why it matters', ['one of the best public recipes for domain-targeted Common Crawl mining', 'shaped later data-mixing decisions']),
 # connections
 ('InstructGPT (2022-03): PPO pipeline GRPO simplifies; keeps clipping and KL-to-reference', 'Connections; Further reading', ['3c65c17b0d0d8180b958d8299996a063', 'GRPO keeps its clipping and its KL to a reference']),
 ('DPO (2023-05): fellow remove-a-model method; unified paradigm places DPO as offline, rule-rewarded, pairwise GC', 'Connections; Further reading', ['3c65c17b0d0d818bb1d8cafd30e20f9e', 'offline, rule-rewarded, with a pairwise coefficient']),
 ('DeepSeek-R1 (2025-01): GRPO at scale with verifiable rewards, the direct descendant', 'Connections; Further reading', ['3c65c17b0d0d813faca4f7a51eaa0c65', 'the direct descendant']),
 ('DeepSeek-V3 (2024-12): model family whose post-training inherits this pipeline', 'Connections; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'whose post-training inherits this pipeline']),
 ('KB topics: rl, llm-training-and-post-training, data-curation-and-datasets', 'Connections; Further reading, Topics', ['3c65c17b0d0d8195a6c6c11ad093c16e', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d811fa5ecda8d365ab00f']),
 ('Database property Takeaway', 'stays in the database; also the headline card\'s one line', ['taking a 7B math model to 51.7% MATH and becoming the default RLVR algorithm']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:38)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
