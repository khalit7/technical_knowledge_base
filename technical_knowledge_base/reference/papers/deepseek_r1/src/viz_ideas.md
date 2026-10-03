# Visualisation ideas: DeepSeek-R1 (P-deepseek_r1)

Question the page keeps returning to: what did outcome-only RL actually produce, and how much of each later stage's effect is real?

| # | Idea | What it shows | Placement | Score | Status |
|---|---|---|---|---|---|
| P-deepseek_r1.1 | **Train a tiny R1-Zero in the browser**: 1,514-parameter policy, GRPO with R1-Zero's structure (16 answers, 16 minibatches per rollout, ε, KL to a refreshed reference, length cap raised at 79% of the run); presets for long cap, language reward, cold start; ε, Dr. GRPO, G, seed; exact accuracy, length, language, clip share, accuracy by length heatmap, sampled traces | Length emerging from an outcome reward, the cap's effect (the 8.2k jump), the clip ratio claim, cold start as a head start; what does not reproduce (language mixing, the language reward's cost) said | Own tab | 13 | built |
| P-deepseek_r1.2 | **One GRPO step on sixteen real toy answers, R1-Zero's reward against R1's** (tokens, checks, rewards, advantages, Δ log-prob, probability-weighted length before/after) | Why length grows without a length reward; lucky guesses also rewarded; what the language reward reorders | Reading, What emerged | 11 | built |
| P-deepseek_r1.3 | **Stage-by-stage animation of Table 3** (R1-Zero, Dev1 to Dev3, R1), reasoning or general benchmarks, V3 ticks | The cold-start drop and recovery; stage 4 moves preference benchmarks, not reasoning | Reading, four stages | 11 | built |
| P-deepseek_r1.4 | **Figures decoded from the PDF's vector paths** (PyMuPDF, axes fitted to tick labels): Figure 1 (with v1's 71.0% toggle), 6, 7, 8, 9, 18 with its band | Exact values (pass@1 on a 1/480 grid); peak 77.7% vs 77.9%; v1 = step 8,400; Figure 18's text numbers are the band | Reading; Tables tab calibration table | 12 | built |
| P-deepseek_r1.5 | Predict-then-reveal: length growth (toy reveal), cold-start AIME (Table 3 + toy), distil vs RL at 32B (Table 16) | Belief elicitation where intuition fails | Reading | 10 | built |
| P-deepseek_r1.6 | **Checks list with verdicts** (46), incl. epochs arithmetic, bold-as-significance, swapped jailbreak rates, "25%" as points | Drives How much to believe | Tables tab | 9 | built |
| P-deepseek_r1.7 | v1 against v2 table (and Tables 2 of v1 vs 3/12 of v2) | What the peer review changed | Reading; Tables tab | 8 | built |
| P-deepseek_r1.8 | Recipe flow diagram | Already on the DeepSeek lab page (D7) | none | | rejected |
| P-deepseek_r1.9 | Training-bill tab | A pattern Khalid removed; cost is a paragraph with Table 7 | none | | rejected |
| P-deepseek_r1.10 | Toy distillation (small student, SFT on teacher vs RL) | Toy task too easy for capacity to matter; would be designed to succeed | none | | rejected |
| P-deepseek_r1.11 | PPO vs GRPO curve (Figure 4) | Raster image only; PPO vs GRPO is trained live on the DeepSeekMath page | none | | rejected |

Methodology gap found: arXiv HTML can omit figures entirely while the PDF holds them as vectors; decode from the PDF with PyMuPDF (`decode_figs.py`). Full-page puppeteer screenshots repeat after about 16,000 px; review long tabs per section (`shoot.mjs`).
