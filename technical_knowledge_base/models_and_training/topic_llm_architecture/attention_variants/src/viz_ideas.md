# Attention variants: visuals built and rejected (2026-10-19)

Central question: what does each design keep per token, what does a decoded token read, and what does the model give up?
Scores 0 to 2 on the skill's eight criteria (2 and 3 count double), minus build cost.

## Built
| Visual | Where | Type | Score | Why |
|---|---|---|---|---|
| Variance of trained MHA keys and values against directions kept, per layer | Reading s2 | measured lines | 12 | Turns "sharing costs little" into a measurement; leads to MLA as a factorisation |
| Conversions without training: head averaging, projection, uptraining, trained from scratch | Reading s2 | measured bars, with predict-then-reveal | 13 | Corrects the belief that averaging heads is a conversion; tests the GQA paper's recipe at toy scale |
| Absorbed vs naive MLA on the trained at_mla, and the RoPE trap | Reading s3 | table of measured errors | 12 | The derivation checked numerically, as the brief asked |
| Three ways to decode MLA: bytes, FLOPs, FLOPs per byte (tiny and DeepSeek-V3 shapes) | Reading s3 | calculation table + drill | 11 | Why absorption matters and why MLA sits near the H100 balance point |
| MLA investigation: held-out loss bars and learning curves for latent and RoPE-key sizes | Reading s3 | measured | 12 | Answers the lab's open question cheaply (three runs) |
| Window sweep: loss for W 16 to 256, interleaves, and the full model served with windows; loss by position | Reading s4 | measured bars and lines, drill | 12 | The window-size sweep the brief asked for, with train-test mismatch beside it |
| Sink ablation table (plain, learned sink, output gate): weights, gates, residual peaks, ablations, windowed serving | Reading s6 | measured table | 12 | The sink ablation the brief asked for, plus the gate |
| One head before and after its sink, stepping through query positions | Reading s6 | before/after animation on the same input | 13 | Shows where weight goes when the softmax must sum to 1 |
| Cache ladder: eleven configs, held / read / FLOPs per decoded token, FLOPs per byte, context slider | Cache ladder tab | calculator over real configs (type 8), checked equal to CC.cache | 15 | Reads and arithmetic intensity are absent from the root and gallery |
| Two-rung decode race at H100 roofline speeds | Cache ladder tab | before/after animation | 12 | Makes memory-bound vs compute-bound visible for any pair |
| Which keys are read: SmolLM2 real attention under full / window / sink+window / top-k / blocks | Keys tab | explorer on real weights (type 7) | 13 | The which-tokens-are-attended explorer of the brief, with kept-mass counters |
| Stacked-window reach, all-local vs 2 : 1, layer by layer | Keys tab | before/after animation | 11 | Explains "theoretical span" and why interleaves exist |
| Top-k / block / window mass per layer, SmolLM2 and tiny GPT | Keys tab | measured table | 11 | The measured premise of DSA and NSA |
| Seven design questions with computed reveals | Design drill tab | predict-then-reveal | 11 | The design drill of the brief; arithmetic from the ladder code |

## Rejected
| Visual | Why rejected |
|---|---|
| MLA step-by-step animation | The DeepSeek page owns it (Khalid's favourite); linked. |
| Another KV-cache sizing calculator with batch and GPU | The root's Attention lab has it; the ladder adds reads and FLOPs instead. |
| Per-layer strips of real models | The gallery child and the root's Architecture map own them. |
| NSA or DSA trained on the tiny GPT | At 256 tokens there is nothing to skip; speed needs CUDA kernels. The oracle top-k on SmolLM2 shows the premise. |
| Differential attention trained on the tiny GPT | Its gains are reported at billions of parameters; the tiny model's attention is mostly local, so there is little noise to cancel. Published numbers instead. |
| A V4 compression animation | The DeepSeek page derives V4's cache; the ladder places it beside the others. |
| SmolLM2 served with each variant | SmolLM2 was trained with full attention; running it under DSA or windows measures mismatch, not the variant. The explorer reports kept mass instead, and the Long context child measures eviction. |
