# Visualisation ideas: DSec (P-dsec rows)

Central question: what does a sandbox platform need to supply agentic RL at frontier scale, and how much of the paper's evidence can be checked?

Scores: computable from public data (0 to 2, doubled), reproduces a stated figure (0 to 2, doubled), shows what a sentence cannot (0 to 2), corrects a misconception (0 to 2), step animation against the method replaced (0 to 2), minus build cost (0 to 2).

| # | Idea | What it shows, what the reader does | Score | Data and sources | Placement | Status |
|---|---|---|---|---|---|---|
| P-dsec.1 | **Place a burst**: the paper's power-of-k placement with per-engine overlay and edge admission, against power of k without overlay, random and least-loaded, on one burst; animated node bars to scale against 3,200 capacity, counters, sliders for burst, rate, nodes, k, engines, refresh, starting load; all four policies in a table | Herding as a staleness effect; small k already robust; the overlay matters at large k and less with many engines; edge refusals as retries | 4+0+2+2+2-1 = 9 | §3.2, §7; Mitzenmacher, Richa and Sitaraman (2001); published scale §2.4, §4.3; k, engines, refresh, start load illustrative | Own tab (live ingredient) | built |
| P-dsec.2 | **Every figure decoded from the e-print's vector PDFs** (Figures 2, 3, 5, 6, 7, 8, 10, 11, 12, 13), axes calibrated on tick marks, with each text claim checked beside its figure | 18 claims reproduce, 3 partly; the CPU 26.5% to 41.4% refers to the second burst only; 1.71× is a rounded reading | 4+4+2+2+0-1 = 11 | `decode_figs.py`, `recompute.py` | Own tab | built |
| P-dsec.3 | **Rollout through a preemption, animated**: V4.1 (worker container + agent sandbox on DSec, pause and transparent resume) against the earlier loop in the GPU pod (loop lost, command-log replay) | The paper's most original part, which its evaluation excludes; labelled illustrative | 2+0+2+1+2-1 = 6 | §6.2, §6.3 | Reading, RL co-design | built |
| P-dsec.4 | **Composable layers against monolithic images, animated** to scale with Table 2's 102,171 workspaces, share-of-images slider | O(k·N) against O(k) made visible | 2+0+2+1+2-1 = 6 | §4.2, §5.1, Figure 4, Table 2 | Reading, Mechanisms | built |
| P-dsec.5 | **Request path, animated** (container or VM against FnCall) | Which component holds which state; FnCall's separate path | 2+0+1+0+2-1 = 4 | §3.1 to §3.3, Figure 1 | Reading, Architecture | built |
| P-dsec.6 | Predict: average creation rate (35 a second against 5,000 peak) with Little's law average concurrency from Figure 7's decoded mean lifetime | Bursts are 144× the daily mean; peak concurrency about 5× the derived average | 4+2+1+2+0 = 9 | §2.4, Figure 7 | Reading, Idea | built |
| P-dsec.7 | Predict: how much of a 12.1 GB Java image is read (9.2%), bars for Table 3 | Volume, not just timing, is what on-demand loading saves | 4+2+1+1+0 = 8 | Table 3 | Reading, Mechanisms | built |
| P-dsec.8 | Predict: what SCHED_IDLE alone removes (almost none), Figure 13 rebuilt with error bars | Priority cannot stop SMT sharing | 4+4+1+2+0-1 = 10 | Figure 13 decoded | Reading, Mechanisms | built |
| P-dsec.9 | Table 1 with a scenario picker | Which backend each workload class lands on | 2+0+1+0+0 = 3 | Table 1 | Reading, Idea | built |
| P-dsec.10 | Burst simulator for eager against on-demand image loading, fitted to Figure 10 | rejected: the paper gives no registry bandwidth, layer sizes per task or extraction rates, so every input would be fitted to the curve it should predict (by construction); the decoded Figure 10 shows the real curves instead | | | none | rejected |
| P-dsec.11 | Memory overcommit calculator (sandboxes per node against memory per sandbox with pmem and FPR savings) | rejected: savings are measured on one workload's aggregate host memory; turning them into per-sandbox factors would invent a model the paper does not state | | | none | rejected |
| P-dsec.12 | Misbehaviour catalogue as an attack tree | rejected: a table carries the eight incidents and mitigations verbatim; a tree would add structure the paper does not give | | | none | rejected |

What the methodology lacked here: a rule for papers whose most original contribution is explicitly unevaluated (the RL co-design). The page animates it as a labelled scenario and says in the verdict that it is described, not measured.
