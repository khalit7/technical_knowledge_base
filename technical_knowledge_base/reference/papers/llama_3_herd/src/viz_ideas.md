# Visualisation ideas: The Llama 3 Herd of Models

Question the page keeps returning to: what can be checked in Meta's engineering record and forecast, and how far do the benchmark and human-evaluation claims go once noise and like-for-like are accounted for?

| id | Idea | Placement | Score (reproduces 2, computable 2, beyond a sentence, misconception, central, novel, animation) | Status |
|---|---|---|---|---|
| P-llama_3_herd.1 | **Refit the forecast from the vector PDFs**: Figures 2, 3 and 4 read from the arXiv source's PDF figures (calibrated on gridlines; budgets come back exact), IsoFLOPs parabolas refitted (minima within 0.25%), power law refitted with residuals and a constants toggle (text, legend, refit), and the two-stage ARC forecast with three sigmoid choices | Own tab (Refit the forecast) | 2+2+2+2+2+2+0 = 12 | built |
| P-llama_3_herd.2 | **Predict question on the printed constants**: 0.29 × (3.8e25)^0.53 gives 10.5T, not 16.55T; reveal shows the legend's 0.537/0.299 and that the refit reproduces "402B on 16.55T" exactly at 4.0e25 FLOPs | Reading, Scaling law | 12 | built |
| P-llama_3_herd.3 | **4D mesh rank mapper**: a rank's [TP, CP, PP, DP] coordinates and each group's members drawn across the whole job with pod boundaries, with server, rack and pod spans from §3.3.1's topology | Run tab | 9 | built |
| P-llama_3_herd.4 | **Pipeline schedule simulator** (list scheduler, Megatron interleaved ordering with N free): depth-first, Llama 3 N = 5, breadth-first as an animated Gantt; reproduces (PP − 1)/(V × M) exactly with no latency; latency slider shows why larger N hides point-to-point time at the cost of in-flight activations; sweep table | Run tab | 2+2+2+1+1+2+1 = 11 | built |
| P-llama_3_herd.5 | **Replay the 54 days**: seeded Poisson interruptions at 466/54 per day coloured by Table 5's causes, checkpoint interval, restart time and pause sliders, expected effective time 1 − λ(R + I/2) − s/I and the Young/Daly interval; automated against manual recovery | Run tab | 10 | built |
| P-llama_3_herd.6 | **Memory per GPU for the 405B** under TP, PP, DP with the paper's "no reshard after forward" and FP32 gradient accumulation (assumed layout, labelled) | Run tab | 7 | built |
| P-llama_3_herd.7 | **Post-training round animation**, Llama 3 (RS + SFT + DPO + averaging) against PPO-based RLHF, one prompt, counters for samples, generation in the loop and networks held | Reading, Post-training | 9 | built |
| P-llama_3_herd.8 | **DPO masking predict question** with a per-pair calculator (loss, per-token push, the end-of-turn token's opposite pushes, NLL term) | Reading, Post-training | 8 | built |
| P-llama_3_herd.9 | **Table 2 with 95% intervals**: printed where Tables 18, 21, 22 give them, else the paper's own formula with benchmark sizes (checked against Table 12's printed intervals); gaps inside the interval of the difference shaded | Reading (frontier columns) and Tables tab | 11 | built |
| P-llama_3_herd.10 | **Human evaluation rebuilt from vector PDFs** (Figure 17) with win/tie/loss by separated intervals: 0 wins, 1 tie, 6 losses against GPT-4o, against the text's "mixed results"; as a predict question | Reading, Results; Tables tab | 11 | built |
| P-llama_3_herd.11 | **Table checks**: Table 4 products and MFU recomputed (41% row is 40.4%; v1's DP = 4 error), Table 5 counts against percentages (148 is 35.3%, not 30.1%), Table 7 token shares (long context 0.11% of examples, 5% of tokens), Table 21 implied N (QuALITY about 21 questions) | Tables tab | 10 | built |
| P-llama_3_herd.12 | **The 405B run on one axis**: LR schedule and batch ramp against tokens (log), long-context band, derived step counts and model-card GPU hours | Reading, Recipe | 7 | built |
| P-llama_3_herd.13 | Toy model trained with the Llama 3 recipe (annealing, batch ramp) | | | rejected: architecture is Llama 2's; a toy would teach nothing the paper claims, and the claims are about scale |
| P-llama_3_herd.14 | Device-mesh grid of all three Table 4 configurations side by side | | | rejected: already on the Meta lab page; linked instead |
| P-llama_3_herd.15 | Contamination gain chart | | | rejected: the table is short and many rows are excluded; the rebuilt table with highlighted gains says it |
| P-llama_3_herd.16 | FP8 row-wise against tensor-wise quantisation demo | | | rejected for now: Figure 26's reward distributions are not in the source as data; would need an illustrative tensor |

Methodology gap noted: for long technical reports with many figures, the arXiv e-print often ships the figures as vector PDFs even when the HTML has no image; reading markers from the PDF drawing commands (pymupdf `get_drawings`, calibrated on gridlines) is as exact as the SVG method and should be tried first.
