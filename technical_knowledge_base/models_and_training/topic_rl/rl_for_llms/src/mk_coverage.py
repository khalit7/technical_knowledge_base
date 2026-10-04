"""Coverage of the old Notion page (live.md) by the new HTML: every distinct fact, number, mechanism step, caveat
and source link, where the HTML carries it, and a substring that must be present in ../index.html (checked here).
Usage (from src/): python3 mk_coverage.py  -> coverage.json
"""
import json, re
H = open('../index.html').read()
T = re.sub(r'<[^>]+>', '', H)  # visible text plus scripts; enough for substring checks
C = []
def c(fact, where, needle, status='carried', note=''):
    ok = needle in H or needle in T
    C.append(dict(fact=fact, where=where, needle=needle, found=ok, status=status, note=note))

S = 'Reading, '
# What it is and why it matters
c('RL post-training treats the model as a policy: generate, score, shift probabilities', S + 'In one screen', 'treats the model as a <b>policy</b>')
c('SFT imitates; RL needs a way to score, not to write', S + 'In one screen', 'not a way to <b>write</b>')
c('RL is the engine behind RLHF chat models and RLVR reasoning models such as DeepSeek-R1', S + 'In one screen', 'reasoning models such as DeepSeek-R1')
c('Three methods, each removes one component; RLHF-PPO with four models', S + 'In one screen table', '4 (policy, reference, reward, value)')
c('GRPO deletes the value model; group mean as baseline', S + 'In one screen', 'GRPO deletes RLHF\'s critic')
c('RLVR deletes the learned reward model where a program can check', S + 'In one screen', 'RLVR deletes its learned reward model')
c('GRPO with verifiable rewards is the default open recipe; research on its biases (Dr. GRPO, DAPO, GSPO, off-policy)', S + 'In one screen', 'default open recipe for reasoning models')
c('Scope: this page owns the algorithms; Alignment owns SFT, RM training, DPO; Reward Hacking owns exploitation; Deep RL derivations', S + 'What this page owns', 'What this page owns, and what it links', note='"Deep RL" page link replaced by Policy gradients and actor-critic, its approved successor')
# MDP
c('State = prompt plus tokens so far; S_t = H_t; Markov by construction; fully observable, deterministic', S + '1', 'Markov by construction')
c('Action = next token; vocabulary of order 1e5', S + '1', 'of the order of 10<sup>5</sup>')
c('Transition deterministic: token appended', S + '1', 'the chosen token is appended to the state')
c('Reward zero except at the end; sparse, delayed; horizon = generation length; gamma typically 1', S + '1', 'the discount γ is typically 1')
c('Policy is the LLM itself', S + '1', 'the LLM itself')
c('With gamma 1 and one end reward, every token\'s return is the final score; objective J', S + '1', 'the return from every token of a response is the same number')
c('Policy-gradient estimator with advantage; baseline unbiased, cuts variance', S + '1', 'leaves the gradient unbiased and cuts its variance')
c('What separates the algorithms is how the advantage is estimated', S + '1', 'is exactly what separates the algorithms on this page')
c('Consequences: credit assignment severe; model trivially known; rollouts expensive', S + '1', 'rollouts are expensive')
# PPO
c('Four models: policy from SFT, frozen reference, frozen RM, value model initialised from RM', S + '2', 'InstructGPT initialised it from the RM')
c('RM Bradley-Terry training lives on Alignment', S + '2', 'Bradley-Terry pairwise loss')
c('The loop: sample, generate, score, per-token KL, GAE, clipped update, value regression', S + '2', 'The loop:')
c('Shaped reward formula r_t = 1[t=T] r_phi - beta log ratio', S + '2', 'The shaped reward.')
c('Summed penalties give InstructGPT\'s sequence-level term (arXiv 2203.02155)', S + '2', 'InstructGPT, Eq. 2')
c('GAE formula; lambda 0 trusts value, 1 is unbiased; value regressed on returns', S + '2', 'regressed onto the returns')
c('PPO clipped objective; ratio; eps 0.2; one-sided flatness enables epochs', S + '2', 'That one-sided flatness')
c('Why the KL penalty: on-distribution for RM, preserves capabilities, trust region to fixed anchor', S + '2', 'Why the KL penalty')
c('Pain points: four models; value as big as policy; per-token value hard', S + '2', 'Pain points:')
c('Derivation from TRPO lives on Deep RL', S + '2', 'The derivation from TRPO', note='now on Policy gradients and actor-critic')
# GRPO
c('GRPO = PPO minus value model (arXiv 2402.03300)', S + '3', 'is PPO minus the value model')
c('Group-relative advantage formula', S + '3', 'group-relative advantage')
c('Group mean is a Monte Carlo estimate of V(q); std rescales', S + '3', 'a Monte Carlo estimate of the prompt\'s value')
c('std over G or G-1; small constant; examples divide by G', S + '3', 'the examples on this page divide by <i>G</i>')
c('KL added to the loss, not the reward, so it does not contaminate advantages', S + '3', 'does not contaminate the advantages')
c('GRPO objective with 1/|o_i| and per-token ratio', S + '3', '𝒥<sub>GRPO</sub>')
c('k3 estimator formula; never negative; unbiased under pi_theta', S + '3', 'never negative, because')
c('DeepSeekMath-RL 7B: G 64, beta 0.04, lr 1e-6, single update so clip barely binds', S + '3', 'so its clip barely binds')
c('R1-Zero: G 16, beta 0.001, lr 3e-6', S + '3', 'β = 0.001, a learning rate of 3e-6')
c('Worked example: mean 0.25', S + '3 worked example', '(1 + 0 + 0 + 0) / 4')
c('Worked example: std 0.433 from 0.1875', S + '3 worked example', '√0.1875')
c('Worked example: +1.732 and -0.577, sum zero', S + '3 worked example', 'The four advantages sum to zero')
c('Worked example: clip on a correct token, 2.252 vs 2.078', S + '3 worked example', '1.3 × 1.732 = 2.252')
c('Worked example: wrong token, -0.751 vs -0.693, gradient flows', S + '3 worked example', '1.3 × (−0.577) = −0.751')
c('Worked example: k3 at x = 0.5 is 0.193', S + '3 worked example', '0.5 + 0.693 − 1')
c('All-correct or all-wrong group teaches nothing; DAPO dynamic sampling filters', S + '3', 'Such groups cost four rollouts and teach nothing')
c('Gained: no value model, half memory; R1 team: PPO matches GRPO only with lambda 1.0, 0.95 much worse', S + '3', 'λ = 1.0;')
c('GRPO closer to group-baselined REINFORCE with clipping than to PPO', S + '3', 'closer to group-baselined REINFORCE')
c('Pure Monte Carlo credit; fine for verifiable, noisier for agentic', S + '3', 'Pure Monte Carlo credit assignment')
c('Needs G rollouts per prompt (8 to 64), shifts cost from memory to inference', S + '3', 'shifts cost from memory to inference compute')
# RLVR
c('RLVR: programmatic verifier; exact match, unit tests, format, task success; binary or rubric', S + '4', 'exact-match answer checking for maths')
c('R1-Zero reward: accuracy + format in <think> tags, equally weighted, no neural RM', S + '4', 'equally weighted, and deliberately no neural reward model')
c('Benefits: no RM bias, no preference data, scales with compute', S + '4', 'no preference-data collection')
c('Limits: only where a verifier exists; imperfect verifiers reintroduce hacking', S + '4', 'imperfect verifiers reintroduce hacking')
c('Extending RLVR beyond maths and code is a main 2026 research front', S + '4', 'main 2026 research front')
c('TypeSafe Jev / Reinforcement Learning for Calibrated Decisions, 40x to 200x faster (vendor-reported)', S + '"On the old page, unverified" box', 'Reinforcement Learning for Calibrated Decisions', status='kept, marked unverified', note='vendor blog confirms the claim is made; no technical definition, paper or independent evaluation')
# R1
c('R1 released January 2025, arXiv 2501.12948', S + '6', 'arXiv 2501.12948')
c('R1-Zero: GRPO + RLVR on V3 base, no SFT; long CoT, self-verification, backtracking emerged', S + '6', 'with no SFT')
c('Response length grew with training', S + '6', 'about 500 to about 14,200 tokens')
c('AIME 2024 pass@1 15.6% to 77.9%', S + '6', '77.9% in the later version', status='corrected', note='old page gave 77.9% without a version; 71.0% is v1 (January 2025), 77.9% v2 and Nature')
c('pass@1 definition (AIME)', S + '6', 'American Invitational Mathematics Examination')
c('Weaknesses: readability, language mixing', S + '6', 'readability and language mixing')
c('R1 pipeline: cold-start SFT, reasoning RL, rejection sampling, second RL stage', S + '6', 'rejection sampling into about 800K new SFT samples')
c('Matched o1-class reasoning at open weights; default open recipe through 2025 and 2026', S + '6', 'matched o1-class reasoning')
c('Distillation cheaper and better; Qwen2.5-32B SFT on 800k beat R1-Zero recipe over 10,000 steps', S + '6', 'over 10,000 steps')
# Dr. GRPO
c('Dr. GRPO, arXiv 2503.20783: both normalisations bias', S + '7', 'GRPO Done Right')
c('Length bias: -0.577/100 = -0.00577 vs -0.000577', S + '7', '−0.577 / 100 = −0.00577')
c('Difficulty bias: 1 of 16 mean 0.0625 std 0.242 gives +3.873; 8 of 16 std 0.5 gives +1.0', S + '7', 'the standard deviation 0.242')
c('Fix: drop both, divide by constant (max generation length)', S + '7', 'the maximum generation length in the authors')
c('Unbiased REINFORCE-style estimator; better token efficiency; 43.3% AIME 2024 from 7B base', S + '7', '43.3% on AIME 2024')
# DAPO
c('DAPO: ByteDance Seed with Tsinghua AIR; 50 on AIME 2024 from Qwen2.5-32B, above R1-Zero-Qwen-32B 47, 50% steps', S + '7', 'with 50% of its training steps')
c('Clip-higher 0.2/0.28; 0.01 to 0.012 vs 0.0128; 0.9 unconstrained; entropy collapse', S + '7', '0.0128')
c('Dynamic sampling', S + '7', 'Dynamic sampling:')
c('Token-level loss formula', S + '7', 'Token-level loss:')
c('Overlong reward shaping formula; L_max 16,384, L_cache 4,096; 14,336 gives -0.5', S + '7', '(12,288 − 14,336) / 4,096 = −0.5')
# GSPO
c('GSPO, Qwen Team, arXiv 2507.18071: token ratios noisy, destabilise long sequences and MoE', S + '7', 'Group Sequence Policy Optimization')
c('Sequence ratio formula and objective', S + '7', '𝒥<sub>GSPO</sub>')
c('3-token example 1.1, 0.9, 1.0 gives 0.99666', S + '7', '0.99666')
c('Clip ranges 3e-4 and 4e-4', S + '7', '3e-4 below and 4e-4 above')
c('Contributed to Qwen3 RL', S + '7', 'Qwen3 models')
# off-policy
c('Two sources: minibatch updates; training/inference mismatch (vLLM/SGLang, kernels, precision, KV cache)', S + '8', 'training/inference mismatch')
c('Fixes: TIS, masked IS (MIS/CISPO-style), rejection sampling; verl rollout correction docs', S + '8', 'masked importance sampling')
c('TIS formula; C; verl default 2.0', S + '8', 'decoupled_token_is(threshold=2.0)', status='corrected', note='verl documents threshold 2.0 as the starting configuration and "typical 1.5-5.0"; "default" softened')
c('Examples: 0.20 vs 0.25 weight 1.25; 0.05 vs 0.25 ratio 5 truncated to 2', S + '8', 'truncated to 2')
c('Sequence-level variant thresholds 2 to 10; rejection sampling masks', S + '8', 'typical threshold 2.0-10.0')
c('Group-Relative REINFORCE is Secretly Off-Policy (arXiv 2509.24203)', S + '8', 'Secretly an Off-Policy Algorithm')
c('Log rollout logprobs and compare: mismatch diagnostic', S + '8', 'the gap is your mismatch diagnostic')
# Open questions
c('Teach or elicit: pass@k at large k; invisible leash; sharpening', S + '9', 'The invisible leash')
c('Spurious Rewards: random rewards improve Qwen-Math; ablate on multiple families', S + '9', 'Spurious rewards')
c('DeepSeekMath: Maj@K up, Pass@K not', S + '9', 'Maj@K')
c('Counter-evidence: CoT-Pass@k (ICLR 2026)', S + '9', 'CoT-Pass@k')
c('Consensus by mid-2026: pass@k into pass@1, reasoning validity; expansion contested; ProRL strongest', S + '9', 'prolonged multi-stage RL is the strongest claim')
c('Cognition SWE-2: one RL run with slope-matched cost penalties; 58% fewer turns, 81% less cost than SWE-1.7', S + '11', '81% lower average cost')
c('Turn count is where the money goes for agentic RL', S + '11', 'turn count is where the money goes')
c('Saturation-aware multi-objective RL (Learn What\'s Left, arXiv 2608.16072), cousin of dynamic sampling', S + '11', 'multi-objective cousin of DAPO')
c('Other threads: entropy control, process/turn-level credit, replacing the group baseline (RLOO), async RL infrastructure', S + '3, 7, 11, 12', 'RLOO')
# Trade-offs
c('Trade-off: PPO-RLHF', S + '13', 'Use it when')
c('Trade-off: GRPO default for single-turn reasoning', S + '13', 'The default for single-turn reasoning with a verifier')
c('Trade-off: GRPO with Dr. GRPO and DAPO fixes', S + '13', 'GRPO with the Dr. GRPO and DAPO fixes')
c('Trade-off: GSPO loses per-token view', S + '13', 'one outlier token no longer gets clipped on its own')
c('Trade-off: verifier vs RM; R1 final 400 steps', S + '13', 'final 400 steps of its last RL stage')
c('Trade-off: offline preference methods weaker than online RL at equal data', S + '13', 'Consistently weaker than online RL')
# Mistakes
for m in ['Assuming the rollout policy is the old policy', 'Forgetting that uniform groups teach nothing', 'Dividing by a zero standard deviation', 'Letting length normalisation happen by default', 'Calling GRPO "PPO without a critic"', 'Counting the KL penalty twice', 'Reading a pass@1 gain as new capability', 'Trusting the verifier']:
    c('Mistake: ' + m, S + '14', m)
# Checklist
for k in ['<b>Rollout:</b>', '<b>Reward:</b>', '<b>Advantage:</b>', '<b>Loss:</b>', '<b>Filter</b>', '<b>Monitor:</b>']:
    c('Checklist step ' + re.sub('<[^>]+>', '', k), S + '15', k)
c('Mercor with SkyRL: Qwen3.5-397B-A17B, 1,928 tasks, 70% relative APEX-Agents Pass@1; token accounting, async, environments, harness', S + '11', '1,928 expert knowledge-work tasks')
c('Mercor recipe in full on the post-training topic', S + '11', 'The recipe in full is on')
# How it connects and resources
c('How it connects: Topic: rl parent; GRPO and PPO model-free, approximately on-policy', 'Further reading and header', 'A child of')
c('How it connects: RL foundations (MDP vocabulary)', S + '1', 'The loop, state and return', note='RL foundations was folded into Topic: rl; linked there')
c('How it connects: Alignment, Reward Hacking, post-training topic', 'Further reading', 'The pipeline these algorithms slot into')
for name, url in [('RLHF Book', 'https://rlhfbook.com'), ('Understanding GRPO (Garg)', 'https://huggingface.co/blog/garg-aayush/derive-grpo-loss'), ('Illustrating RLHF', 'https://huggingface.co/blog/rlhf'), ('verl Rollout Correction', 'https://verl.readthedocs.io/en/latest/algo/rollout_corr.html'), ('37 implementation details', 'https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/'), ('Dr. GRPO paper', 'https://arxiv.org/abs/2503.20783'), ('DAPO paper', 'https://arxiv.org/abs/2503.14476'), ('GSPO paper', 'https://arxiv.org/abs/2507.18071'), ('Group-relative REINFORCE off-policy', 'https://arxiv.org/abs/2509.24203'), ('Cognition SWE-2', 'https://cognition.com/blog/swe-2'), ('Mercor 397B guide', 'https://www.mercor.com/blog/training-frontier-knowledge-work-agents-a-397b-rl-training-guide-with-skyrl/'), ('InstructGPT arXiv', 'https://arxiv.org/abs/2203.02155'), ('DeepSeekMath arXiv', 'https://arxiv.org/abs/2402.03300')]:
    c('Resource link: ' + name, 'Reading and Further reading', url)
c('Learn What\'s Left (arXiv 2608.16072) link', 'Section 11 and Further reading', 'n:3c65c17b0d0d81e38b0fe72f3daf44bc'.replace('n:', 'https://app.notion.com/p/'), note='linked through its paper page, which carries the arXiv link')
c('Paper pages: DeepSeekMath, DeepSeek-R1, InstructGPT', 'Further reading', 'https://app.notion.com/p/3c65c17b0d0d813faca4f7a51eaa0c65')
c('Header: 19 min read, +8h 40m resources', 'Header and Further reading', 'RES_TIME' if False else 'did not match its own list', status='corrected', note='resources total recomputed by the build from the listed times')

json.dump(C, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
miss = [x for x in C if not x['found']]
print(len(C), 'facts;', len(C) - len(miss), 'found;', len(miss), 'missing')
for x in miss: print('MISSING', x['fact'], '|', x['needle'])
