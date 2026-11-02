"""Coverage of the paper's own claims (a brand-new Papers row has no old body, so there is no live.md).

  python3 mk_coverage.py      -> coverage.json; exits 1 if any claim is missing from the paper extract or the page

Each item: the claim, a string that must occur in inputs/paper_v1.txt (the source, so the item is this paper's)
and a string that must occur in the built page's visible text (so the page carries it). Written for this paper.
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = re.sub(r'\s+', ' ', open(os.path.join(HERE, 'inputs', 'paper_v1.txt'), encoding='utf-8').read())
raw = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
PAGE = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S))))
JS = raw  # numbers the page renders from data (tables, pair plot) live in the scripts' data

ITEMS = [
 ('Frameworks export the bf16 copy by round-to-nearest (verl, TRL, OpenRLHF, slime, prime-rl, AReaL)', 'verl, TRL, OpenRLHF, slime', 'verl, TRL, OpenRLHF, slime'),
 ('bf16 gap u = 2^(floor(log2|w|) - 7), about |w|/128', '7-bit significand', '7 significand bits'),
 ('Round-to-nearest discards updates below u/2, about |w|/256', 'u/2 ≈ |w|/256', '|w|/256'),
 ('The master starts on the bf16 grid, so the dead zone acts from step one', 'exactly on the bf16 grid', 'exactly on the bf16 grid'),
 ('Estimated 0.3 to 0.7% of weights change per step at 1e-6', '0.3–0.7%', '0.3 to 0.7%'),
 ('Measured 0.4 to 0.5% on Qwen3-1.7B', '0.4–0.5%', '0.4 to 0.5%'),
 ('tau = u/(2|mean update|), 50 to 200 steps; infinite under decay', '50–200 steps', '50 to 200 steps'),
 ('Muon updates nearly uniform, almost none cross', 'Muon’s per-element updates are nearly uniform', 'nearly uniform in size'),
 ('Knights-and-knaves frozen start 0.12, 0.15, 0.22 against 0.12, 0.51, 0.79', '0.12 → 0.51 → 0.79', '0.12, 0.51, 0.79'),
 ('Single-step test: fp32 sampler 0.17 to 0.84, bf16 stays 0.19', 'from 0.17 to 0.84', '0.17 to 0.84'),
 ('Visible ratio stays near 0.01, hidden ratio 0.10 to 0.16 on MATH and about 0.45 on knights-and-knaves', '0.10–0.16 on MATH', '0.10 to 0.16 on MATH'),
 ('Per-token ESS 0.2 to 0.35 at 2,000 tokens, about 0.9 at 500', '0.2–0.35 on tasks with 2,000-token', '0.2 to 0.35'),
 ('Lower learning rates reduce the visible ratio and increase the hidden one', 'Lower learning rates reduce the visible ratio', 'reduce the visible ratio and increase the hidden one'),
 ('Stochastic rounding: upper value with probability (theta - floor)/u; E[q] = theta', 'p = (θ −', 'E[ q ] = θ exactly'),
 ('SR kernel: add 16 random bits and truncate', '16 uniformly distributed random bits', '16 uniformly random bits'),
 ('Error feedback recursion; accumulated error bounded by u', 'sigma-delta', 'their sum stays within u forever'),
 ('Train on the served copy with a straight-through estimator', 'straight-through estimator', 'straight-through estimator'),
 ('Unbiasedness is about weights, not the policy', 'Unbiasedness is a statement about weights', 'Unbiasedness is about weights'),
 ('Storage-swap variant reproduces: 0.977 against 0.967, 0.756 against 0.742', '0.977 against 0.967', '0.977 against 0.967'),
 ('Setup: group 8, 24 prompts, 150 steps, one H100 per arm, vLLM plus HF trainer', '24 prompts per step', '24 prompts per step'),
 ('MBPP+ scored on the 224 problems not in the training split', '224', '224'),
 ('One seed per arm unless stated', 'One seed per arm unless stated', 'One seed per arm unless stated'),
 ('EF without served-copy training collapsed in 4 of 4 runs; SR degenerated on 0.6B (0.61 to 0.13; MATH 0.002)', '0.61 → 0.13', '0.61 to 0.13'),
 ('Nearest plus served copy is the same policy: 0.889 against 0.865, 0.705 against 0.742', '0.889 against 0.865', '0.889 against 0.865'),
 ('Zebra: nearest peak 0.57 then 0.33 +/- 0.10; truncation 0.47 to 0.89; penalty 0.45; Fair Cast 0.57 +/- 0.16, oracle 0.69, one run to 0.34', 'fell to 0.34', 'fell to 0.34'),
 ('Knights-and-knaves: 0.88 at step 9, Muon 0.988 against 0.907, 0.6B +10.2, 4B 0.992 against 0.988', '0.988 ± 0.003 versus 0.907 ± 0.016', '0.988 ± 0.003 against 0.907 ± 0.016'),
 ('Nim peaks 0.736 against 0.596, converges 0.580 against 0.570', '0.736 against 0.596', '0.736 against 0.596'),
 ('0.6B: +2.7 MATH, +5.1 GSM8K', 'gains 2.7 points on MATH', '2.7 points on MATH'),
 ('25 pairs: 18 ahead, 6 within, 1 behind, mean +6.1', 'mean endpoint difference of +6.1', 'mean +6.1'),
 ('Master and served copy drift up to 50 points (59.8 against 9.1)', 'served 59.8, master 9.1', 'served 59.8, master 9.1'),
 ('5 of 9 nearest runs gap at least 12 points; Fair Cast within 3 over 12 runs', '5 show a gap of at least 12 points', 'at least 12 points'),
 ('Exports finer than bf16 inherit the drift (Table 3); fp16 responses 1,679 against 344 tokens', '1,679 tokens against 344', '1,679 tokens'),
 ('List functions: Fair Cast 0.523, nearest 0.668, EMA 0.707 and 0.709, alpha 0.01 0.666', '0.707 and 0.709', '0.707 and 0.709'),
 ('Transfer: AIME24 0.204 against 0.152, AMC23 0.548 against 0.495, MATH-500 0.790 against 0.754', '0.204 against 0.152', '0.204 against 0.152'),
 ('SR and EF equal except 500-step Countdown; composes with TIS; FP16 sampler eightfold', 'shrinks the dead zone eightfold', 'eightfold'),
 ('Higher round-to-nearest learning rates produced two MATH collapses', 'two MATH collapses', 'two MATH collapses'),
 ('Cost: 4.3 ms, 21.7 ms, 37.2 ms plus 6.9 GB, naive 136.6 ms; steps 31 to 130 s', '136.6 ms', '136.6 ms'),
 ('Fair Cast changes 2 to 15% of served weights per step; delta sync compresses less', '2–15% of served weights', '2 to 15%'),
 ('Limitations: up to 4B, one implementation, single seeds, SE about 3 points at 512 and 6 at 128', 'about 3 points at 512', 'One training implementation'),
 ('Prior prime-rl pull requests applied SR to FP8 export without learning results', 'prime-rl pull requests', 'prime-rl pull requests'),
 ('LoRA adapters predicted to escape the dead zone', 'LoRA adapters would largely escape', 'escape the dead zone'),
]
out, bad = [], 0
for claim, s_key, p_key in ITEMS:
    ins, onp = s_key in SRC, (p_key in PAGE)
    out.append({'claim': claim, 'source_key': s_key, 'page_key': p_key, 'in_source': ins, 'on_page': onp})
    if not (ins and onp):
        bad += 1; print('MISSING', 'source' if not ins else 'page', '|', claim)
json.dump({'n': len(out), 'found': len(out) - bad, 'items': out}, open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print('coverage: %d of %d claims in the paper extract and on the page' % (len(out) - bad, len(out)))
sys.exit(1 if bad else 0)
