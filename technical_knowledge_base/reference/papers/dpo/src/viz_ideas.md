# Visualisation ideas: DPO

Question the page keeps returning to: does one classification loss really optimise the RLHF objective, and how far does the evidence that it beats PPO go?

| id | Idea | Placement | Score (reproduces 2, computable 2, beyond a sentence, misconception, central, novel, animation) | Status |
|---|---|---|---|---|
| P-dpo.1 | **Train DPO and RLHF in the browser on a toy with an exact optimum**: 4-word language, 20,736 sequences enumerated, so E[r*], KL and the Eq. 4 frontier are exact; DPO, IPO, cDPO, Unlikelihood, Preferred-FT, PPO (learned reward), PPO-GT; counters for samples, models, shortfall from the frontier; JS checked against PyTorch | Own tab | 2+2+2+2+2+2+1 = 13 | built |
| P-dpo.2 | **Figure 2 at toy scale**, the paper's sweep shape (19 runs), rerunnable, beside the paper's own frontier; it does not reproduce DPO's dominance (PPO-GT on the frontier; DPO at β ≤ 0.1 well below), shown, not tuned away | Train tab; Reading predict | 12 | built |
| P-dpo.3 | **RLHF against DPO pipeline animation** on the toy's own counts (models in memory, answers sampled, networks trained) | Reading, Idea | 10 | built |
| P-dpo.4 | **Four real pairs through DPO and through Unlikelihood**, step by step from live runs, log-ratio bars to scale, the weight σ(·) as a gauge, β selector | Reading, The loss | 11 | built |
| P-dpo.5 | **Likelihood displacement predict question**: chosen answers' probability after DPO (β = 0.1: down about 13 times) | Reading | 10 | built |
| P-dpo.6 | **Theorem 1 measured**: DPO loss over policies and reward-model loss over rewards reach the same minimum (0.26203 against 0.26200), but the converged policy puts >99.99% of its mass on never-compared sequences | Reading, Theory; Train tab | 11 | built |
| P-dpo.7 | **Implicit reward against true reward** scatter (DPO's β log π/π_ref against RLHF's r_φ), pair accuracy and weighted correlation | Reading, Theory | 8 | built |
| P-dpo.8 | **Figures decoded from SVG vector paths**: Figure 2 left (177 points, envelopes, dominance counts), Figure 2 right (counts of 256, ±1 SE bars identified), Figure 3, Figure 4 | Figures tab | 11 | built |
| P-dpo.9 | **Standard-error predict question** (158 against 146 of 256: z ≈ 1.1) and z for every headline comparison, Table 1 under assumed n, Table 2 SEs | Reading; Figures tab | 10 | built |
| P-dpo.10 | **Train past the sweep**: 4,000-step runs of eight losses, grammatical mass over time, top reviews (DPO and Unlikelihood degenerate; IPO nearly levels off) | Train tab | 9 | built |
| P-dpo.11 | **Then and now: the push on a pair against its margin**, morphing Unlikelihood, DPO, SLiC hinge, IPO, cDPO, SimPO, each with its toy result | Then and now | 10 | built |
| P-dpo.12 | Checks on the paper's text (A.4 sign slips, §5.2 equation reference, Table 3 as evidence, versions) | Figures tab | 7 | built |
| P-dpo.13 | A small GPT-style toy trained offline on real IMDb text | | | rejected: no exact optimum, weights to ship, and the frontier would still be estimated; the enumerable toy tests the claim directly |
| P-dpo.14 | KTO and ORPO on the toy | | | rejected: KTO needs unpaired labels and ORPO an odds parameterisation; both described with sources instead |
| P-dpo.15 | Per-run curves of Figure 2 left | | | rejected: runs share one colour in the SVG and cannot be separated |
| P-dpo.16 | Length-bias demo (DPO's long answers, SimPO's fix) | | | rejected: all toy answers have 4 words; would need a different toy |

Methodology gap noted: for a training-objective paper the most useful "known answer" was an exactly enumerable output space, which lets every curve be compared with the true optimum; worth adding to papers.md's training-recipe row.
