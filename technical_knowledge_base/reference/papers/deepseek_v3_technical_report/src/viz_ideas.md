# Visualisation ideas: DeepSeek-V3 Technical Report

The questions this page answers: **what is new in this report beyond V2, does its evidence support it, and is the bill real?** MLA, bias balancing, DualPipe and EPLB are already animated on the DeepSeek lab page and in Topic: llms ("Deeper: inside an MoE"), so they are linked, not rebuilt.

Scoring follows `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each; reproduces and computable count double; build cost subtracted; plus one for a step-by-step animation against the method it replaced), with the paper-page criteria **R** (runs the paper's mechanism on real numbers) and **P** (supports a predict-then-reveal question). Rows to merge into the ideas log use ids P-deepseek_v3_technical_report.k.

## Built

| id | Idea | Placement | Score | Why |
|---|---|---|---|---|
| P-deepseek_v3_technical_report.1 | **FP8 scaling granularity, animated**: one 32 × 512 activation matrix with outliers on channels or tokens, quantised per tensor, per 1×128 tile or per 128×128 block, in E4M3 or E5M2; heatmap, then rounding outcome (kept, subnormal, zero), then relative error; counters | Own tab, Quantise and accumulate | 14 (R 2, P 2, anim 1) | Shows the mechanism behind "mantissa over exponents" and Appendix B.2's divergence hypothesis (token outliers ruin 128×128 blocks) with exact arithmetic; the JS port matches `fp8_sim.py` bit for bit. |
| P-deepseek_v3_technical_report.2 | **14-bit accumulation against promotion every 128, animated**: one dot product, the 14-bit window sliding up as the sum grows, truncated product bits, running error; two readings of the paper's hardware description | Own tab | 13 (R 2, anim 1) | The paper's least-checkable numerical claim ("nearly 2%") made testable; both readings shown because the text supports both, and they bracket 2%. |
| P-deepseek_v3_technical_report.3 | **Error against K**, log-log, both readings and modes, recomputed live and compared with the Python run | Own tab | 10 (R 2) | The reproduce / does-not-reproduce statement in one chart. |
| P-deepseek_v3_technical_report.4 | **Utilisation against Llama 3.1 405B**: 6ND, attention and MTP toggles, BF16 or FP8 peak, Meta's reported MFU band | Own tab, Check the bill | 12 (P 2) | The strongest evidence that the GPU hours are plausible: both runs at about 34% of BF16 peak; the 11× bill gap is 11× less work. |
| P-deepseek_v3_technical_report.5 | **Predict: how much of Llama's 11× is work?** with two bars | Reading, The bill | 10 (P 2) | The intuition most readers hold (DeepSeek was 10× more efficient per FLOP) is the one the arithmetic overturns. |
| P-deepseek_v3_technical_report.6 | **Predict: batch-wise auxiliary loss** with §4.5.3's validation losses | Reading, Balancing | 9 (P 2) | The report's own evidence that the balancing gain is about scope, not about removing the loss. |
| P-deepseek_v3_technical_report.7 | **MTP acceptance calculator**: 1 + p tokens per step against the measured 1.8×, implied per-step overhead | Reading, MTP | 7 (P) | Turns two printed numbers into the one the paper does not print. |
| P-deepseek_v3_technical_report.8 | **Ablation gains per benchmark**, diverging bars at both scales, losses in red | Tables tab | 9 | "Consistently" seen honestly: 8 or 9 of 10, with MMLU dropping at the large scale in both ablations. |
| P-deepseek_v3_technical_report.9 | **Every table sortable with deltas and win counts**, Table 3's 0.3 tie rule applied | Tables tab | 8 | Win counts (20 / 7 / 5 against LLaMA-3.1 405B Base) replace "most benchmarks". |
| P-deepseek_v3_technical_report.10 | **Every number in the text checked** (30 claims) | Tables tab | 8 | Found three text-table disagreements (Arena-Hard 86 against 85.5; "about 10%" on AIME and CNMO). |
| P-deepseek_v3_technical_report.11 | **Parameter breakdown from config.json**, all against active | Reading, Architecture | 7 | 97.4% of the weights are routed experts; per token, attention becomes the second-largest share. |
| P-deepseek_v3_technical_report.12 | **Table 1 with a price slider** and wall-clock per stage, context extension per token | Check the bill | 6 | The price is an assumption; the hours are the claim. Context extension costs about 5× more per token. |

## Rejected

- **A toy MoE trained with and without the bias rule**: Topic: llms already animates the control loop and balancing scope; a toy would not reproduce Table 5's small benchmark gains, and the report's own §4.5.3 already answers the interesting question.
- **Rebuilding the MLA animation or the DualPipe simulator**: they exist on the DeepSeek lab page; linked instead.
- **A training-bill tab across generations or labs**: Khalid removed such tabs from the DeepSeek page; this tab is about this one claim only.
- **FP8 training of a toy model to measure the 0.25%**: at toy scale FP8 loss gaps are dominated by noise and would not test the paper's claim at 16B to 230B.
- **Reading Figure 10's loss curves**: no values are printed and the method forbids reading curves by eye.

## What the methodology lacked

A paper that is several kinds at once (architecture, systems, recipe, cost claim) with its mechanisms already built elsewhere in the KB: the method's table assumes one live ingredient chosen by kind. The rule used here: link what exists, and build the ingredient for the claims only this paper makes.
