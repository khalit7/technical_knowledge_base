# Bitune: visualisation ideas

What the text needs to be understood: (1) what the causal mask hides in a prompt, and what it does not hide (the answer sees everything; the prompt's features do not); (2) the two passes, the mix, the unchanged generation; (3) what the mixing coefficient does (Eq. 8 starts at 0.5, θ_init sets the speed); (4) how big and how noisy the gains are; (5) whether every component matters; (6) when the extra prefill cost matters.

Scores: teaching value (T), faithfulness to sources (F), interactivity worth (I), each 1 to 5.

## Built

| id | Idea | Where | T | F | I | Data and formula |
|---|---|---|---|---|---|---|
| P-bitune.1 | **Prefill before/after animation on a real toy model**: the same prompt through one causal pass (LoRA) and through Bitune's two passes; real block-1 attention grids from the toy, the cache strip, the learned α per block, the answer distribution; counters for passes, block evaluations, cache size, probability on the right answer | Reading, Idea | 5 | 5 | 4 | `parts/26_js_pf.js` runs `BT.run` live; nothing precomputed |
| P-bitune.2 | **Mask explorer** on the paper's own template (A.10 ARC template with the A.9 example): click a token to see what it can attend to under causal, bidirectional and anti-causal masks, with the full mask matrix | Reading, Problem | 4 | 5 | 4 | Eqs. 4, 5; one word per token, labelled |
| P-bitune.3 | **α(θ) explorer**: Eq. 8 curves for the three θ_init values, the start point at 0.5, the slope 1/(4θ_init) at the start, tied to the decoded Figure 2 | Reading, Method | 4 | 5 | 3 | α = \|θ\|/(θ_init + \|θ\|) |
| P-bitune.4 | **Cost calculator**: prompt and answer length sliders, extra time from Table 4's per-token rates, presets for the v1 measurements and a long-document case | Reading, Cost (with a predict question) | 5 | 4 | 5 | Table 4: 0.015 and 0.14 ms per prompt token, 31.1 ms per generated token; linear extension labelled illustrative |
| P-bitune.5 | **Gains with noise**: Table 1 per task and average as Bitune minus a chosen baseline (LoRA, LoRA16, pretrained) with ±1 SE from Table 21's seed SDs | Tables tab; compact version in Reading Results | 4 | 5 | 3 | SE = √(s₁²/3 + s₀²/3); average's SD assumes independent tasks (labelled) |
| P-bitune.6 | **Ablations beside the toy's**: Table 5 with Table 23 spreads for both models, and the toy's same variants | Reading, Ablations | 4 | 5 | 2 | Table 23 means and SDs; toy `results.json` |
| P-bitune.7 | **Figures 2 and 3 decoded from vector SVG**: α during training for 3 θ_init, α per layer for K and V; exposed that the axis says % but plots fractions and that the default run ends at α ≈ 0.32 | Tables tab; numbers in Reading | 4 | 5 | 2 | `decode_figs.py`, gridline/tick calibration |
| P-bitune.8 | **Toy: ask the models**: random club and list, all shipped finetuning methods' answer distributions side by side, "move the member" button | Run tab | 5 | 5 | 5 | live forward pass |
| P-bitune.9 | **Toy: look inside**: attention grids of every pass and of the answer token per block and head, and the share of attention person tokens put on the club token to their right; learned α per block against the paper's mean | Run tab | 4 | 5 | 4 | live |
| P-bitune.10 | **Toy results with seeds and logged curves**, plus an in-browser test that reruns the shipped model on fresh prompts | Run tab | 4 | 5 | 3 | `results.json`, `finetune.log` |
| P-bitune.11 | **Checks on the text** table (claims against recomputed values) and the **graded GSM8K samples** of A.13 | Tables tab | 4 | 5 | 1 | `recompute.py`, `inputs/gsm8k_samples.json` |

## Rejected

- **Then and now tab**: Bitune is a 2024 method that has not become a standard; there is no lineage of changes to morph through. The prefix-LM history and the encoder-repurposing line fit in a paragraph of "Why it matters".
- **Parameter-count calculator for each model's two adapters**: would need gated Hugging Face configs (Gemma) and adds little beyond "twice LoRA's parameters, the same as LoRA16", which the paper states.
- **Training a toy in the browser** (as Switch Transformers did): two passes and back-propagation through attention and a mixed cache is too much code for the gain; offline training with a checked JS forward pass shows the same.
- **Attention matrices of Appendix A.12**: they are raster images in the HTML; reading them by eye would break the honesty rules. The toy's own matrices show the same contrast live.

## Inspiration

- Distill, "Communicating with Interactive Articles": predict-then-reveal at the misconception (the answer token does see the whole prompt).
- The DeepSeek MLA explainer (this KB): one input, two methods, the same scale, counters.
- InstructGPT and DPO pages (this KB): decode vector figures rather than read them.

## What the methodology lacked for this page

A rule for **designing a toy so the mechanism has something to bite on**: here a first design failed for an unrelated reason (the pretrained model could not copy names, so no method learned anything), and the working design deliberately teaches the skill question-first in pretraining. The page says plainly that the toy was built so the mechanism should matter, so its gap shows the mechanism, not the size of the real-world benefit.
