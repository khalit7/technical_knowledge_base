# RoFormer (RoPE): visualisation ideas

The question the paper keeps returning to: **does making attention depend only on the offset buy anything measurable, and does the evidence show it?** Visuals are scored 0 to 2 on the Methodology's questions (parameter to move, reproduces a published figure ×2, computable ×2, shows what a sentence cannot, corrects a misconception, measures the central question, absent from existing explainers and from the KB, animation), minus build cost. The LLM Architecture Gallery page already has the one-pair dial and the YaRN bands, so neither is rebuilt.

## Built (rows for the ideas log, ids P-roformer.k)

| # | Idea | What it shows, what the reader does | Score | Placement | Data and sources |
|---|---|---|---|---|---|
| P-roformer.1 | **Train short, test long: six trained toy models** | One-layer causal Transformers identical except for position (RoPE, sinusoidal, learned, none, linear + RoPE, linear none), trained at length 32 on (x[t−1] + x[t−4]) mod 10, run in the browser up to 128 with a sliding window and Position Interpolation toggles; attention by offset for one query; accuracy by position (PyTorch and in-browser); training curves | 2+0+2×2+2+2+2+2+1−1 = 14 | Own tab | train.py, check_forward.py (identical predictions on 1,160 sequences); ALiBi Figure 1 and PI's abstract as the published counterparts |
| P-roformer.2 | **Shift test on trained weights** (before/after animation) | The same 12 digits slid through positions 0 to 31; one head's attention weights redrawn per step, RoPE against sinusoidal; counter of the largest change | 1+0+2×2+2+2+2+2+2−1 = 14 | Reading, The shift test | the toy models; Eq. 16 |
| P-roformer.3 | **Figure 2 rebuilt, with the actual scores** | Eq. 37's bound against distance for head dimension and base; optional overlay of the real score for all-ones q = k and the mean for Gaussian q, k (normalised to distance 0) | 2+2×2+2×2+2+2+1+2+0−0 = 17 | Reading, Long-term decay, with a predict question | recompute.py: d = 128 reproduces the plot (by matching); Barbero et al. 2024, Proposition 3.2 |
| P-roformer.4 | **Eight-pair dials** | A 16-dimensional query and key as 8 rotating pairs, each pair's share of q·k as a bar; shift both positions, every bar stays | 2+0+2×2+2+1+1+1+1−0 = 12 | Reading, Rotation | Eq. 15, illustrative vectors |
| P-roformer.5 | **GLUE split toggle** | Table 2 as printed (BERT test server against RoFormer validation) and against a validation-set BERT-base reference; deltas recomputed | 1+2×2+2×2+1+2+2+2+0−0 = 16 | Tables tab; predict question in Reading | BERT Table 1; Hugging Face run_glue README |
| P-roformer.6 | **Table 5 with the noise** | Accuracies with 95% intervals, test-set size toggle (v1's 1,536 or v5's 6:2:2), the gap in standard errors | 1+2×1+2×2+1+2+2+2+0−0 = 14 | Tables tab | recompute.py; v1's Table 3 |
| P-roformer.7 | **Then and now spectrum morph** | 11 steps from the 2017 sinusoid to Llama 4's iRoPE: turns per pair inside the context, kept, interpolated, ramped or not rotated | 1+1×2+2×2+2+1+1+1+2−1 = 13 | Own tab | each step's paper and config.json (GPT-J, DeepSeek-V3, Qwen2-VL), YaRN Eqs. 13 to 20 |
| P-roformer.8 | Table 4 against length | Six stages' accuracy against their maximum length (log), with CAIL's 1,024 marked | 0+0+2×2+1+1+1+1+0−0 = 8 | Tables tab | Table 4; correlation in recompute.py |

## Rejected

- **Rebuilding the one-pair 2D dial or the YaRN band chart**: already on the LLM Architecture Gallery page; linked instead.
- **Redrawing Figure 3's loss curves**: the data exist only as images; the page describes them and uses only printed axis ticks.
- **A RoPE base sweep on the toy** (train at base 10,000 and 500,000): at head dimension 8 and length 32 every slow pair is far below one turn either way, so it would not show what base scaling does at scale; the Then and now chart shows it from configs instead.
- **Fine-tuned Position Interpolation on the toy**: would make PI work by construction; the page shows PI without fine-tuning and says what the method requires.

## What the methodology lacked here

- A rule for **papers whose evidence was added in a later version** (v1 had only the Chinese experiments; v2 added the English ones months after an independent replication): check every arXiv version's experiment section, not just the latest.
- A rule for **comparison rows copied from another paper**: check which split they come from (here BERT's test-server table) before comparing.
