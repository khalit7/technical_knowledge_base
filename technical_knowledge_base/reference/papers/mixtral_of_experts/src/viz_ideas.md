# Visualisation ideas: Mixtral of Experts

What the page needs understood: (1) why 8x7B is 47B total and 13B active; (2) what "the speed of a 13B model" means and when it is true; (3) how Mixtral compares with Llama 2 70B and GPT-3.5, and how fair each comparison is; (4) what the router learned (Section 5), and whether that holds up.

Already built elsewhere in the knowledge base, so linked, not rebuilt: Mixtral's block animated at scale against Mistral 7B and Small 4, and Table 5 charted (Mistral AI page); the generic MoE layer, routing, balancing, expert parallelism, decode arithmetic (Topic: llms, Deeper: inside an MoE); a Switch layer trained live (Switch Transformers page).

## Built (score out of 5 on teaches-more-than-text, sourced, specific to this paper)

| id | Idea | Score | Placement | Data and formulas |
|---|---|---|---|---|
| P-mixtral_of_experts.1 | **Decode-step before/after animation**: one MoE layer drawn to scale, a growing batch picks experts, counters for experts read, weight bytes, roofline time, tokens/s; modes Mixtral, Llama 2 70B, Llama 2 13B | 5 | Reading, cost section | Params from config.json files; E[experts read] = 8(1 − (6/8)^B); bytes 2 × (shared + experts read); time max(bytes/BW, 2·active·B/FLOPs) on 2 × H100 SXM (NVIDIA datasheet). Defaults reproduce the paper's 47B/13B independently and the post's "6x faster" as 5.4x at batch 1 |
| P-mixtral_of_experts.2 | **Throughput against batch** (log-log), three models, compute-bound crossover dots | 4 | Reading, under the animation | Same model; shows Mixtral = Llama 2 13B at batch 1, 3.6x slower from 8 to ~300, 5.4x faster than 70B again past ~1,071 |
| P-mixtral_of_experts.3 | **Predict: experts read at batch 8** (answer 7.2) | 4 | Reading | 8(1 − 0.75^8) |
| P-mixtral_of_experts.4 | **Toy Mixtral routing replay** (Figure 8 rebuilt): held-out text coloured by first or second expert per layer, tap a token for all layers' experts and gate weights | 5 | Toy tab | 4-layer, 8-expert top-2 SwiGLU model trained to the paper's recipe on four domains; `analyse.py` |
| P-mixtral_of_experts.5 | **Figure 7 rebuilt with a noise floor and pairwise distances** (total variation), toy and Mixtral side by side | 4 | Toy tab, tables tab | toy: held-out routing; Mixtral: decoded SVG |
| P-mixtral_of_experts.6 | **Table 5 rebuilt with controls**: shuffled-order and different-token baselines beside the uniform one | 5 | Toy tab | shuffled baseline keeps uneven expert use and removes position; for Mixtral the analogue is Σp² from decoded Figure 9 |
| P-mixtral_of_experts.7 | **Token against domain as predictors of the expert** (fit on half, score on half) | 4 | Toy tab | a direct test of "syntax, not topic" the paper does not run |
| P-mixtral_of_experts.8 | **Decoded vector figures** (7, 9, 10): exact values from SVG paths and glyph labels, validated against Table 5 (0.05 points) | 5 | Tables tab | `decode_figs.py` |
| P-mixtral_of_experts.9 | **Figure 10 against the toy at relative depth** | 3 | Tables tab | decoded lines, toy repeat rates |
| P-mixtral_of_experts.10 | **Provenance column for Table 3** (which GPT-3.5 numbers are copied from the GPT-4 report) and Llama 2 70B here against the Llama 2 paper | 4 | Tables tab | GPT-4 report Table 2; Llama 2 Tables 4, 20 to 22 |
| P-mixtral_of_experts.11 | Table 2 with a selectable reference row and deltas; Figure 3 rebuilt per benchmark from Table 2; Table 2 delta bars in Reading | 3 | Tables tab, Reading | Table 2 |
| P-mixtral_of_experts.12 | Figure 5 checked against its caption; Elo gaps as win probabilities | 3 | Tables tab | 1/(1 + 10^(−Δ/400)) |

## Rejected

- Re-animating the MoE layer or the parameter count at scale: done on the Mistral AI page.
- A live in-browser forward pass of the toy (type your own text): the trained model has 3.9M parameters, about 4 MB even at 6 bits per weight, far over the page budget; a model small enough to ship (about 100K parameters) was not tried. Shipping the measured routing of held-out text keeps the page at about 250 KB. Worth trying later with a much smaller toy.
- An expert-offloading cache simulator driven by Table 5: would need real routing traces; synthetic traces calibrated to two numbers would mostly show the calibration.
- A bias (BBQ/BOLD) chart: a six-row table with checks says it better.
- Passkey and perplexity curves (Figure 4): raster images without values; quoting the claim and RULER's later measurement is more informative.

## What the methodology lacked for this page

- A rule for papers whose mechanism is already visualised elsewhere in the KB: build what is specific to the paper (here its cost claims and its routing analysis) and link the rest.
- Checking whether "figures without values" are vector graphics before calling them unreadable (lesson already in papers.md from ReAct and InstructGPT; it applied here and changed two conclusions).
