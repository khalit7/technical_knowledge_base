# Visual ideas: Power, cooling, reliability and the data centre

What the text needs to be understood: the scale of watts from chip to site; why watts per chip rise while energy per FLOP falls; how many accelerators a site holds; why liquid; what a synchronous power swing looks like and what smoothing costs; where in the hardware failures come from; how the checkpoint interval trades pauses against lost work, and where the textbook formula fails.

## Built (score out of 10: teaching value, uses real data, not done elsewhere in the KB)

| Idea | Score | Placement | Data |
|---|---|---|---|
| One day of a job, same failures, two checkpoint intervals (before/after animation, counters, captions per failure) | 9 | Checkpoint simulator tab | Llama 3 rate (419 / 54 days / 2,048 servers); C, D, R illustrative inside Kokolis et al.'s assumptions; engine checked against `recompute.py` |
| Useful time against interval: exact formula, first-order formula, live Monte Carlo, Young and your markers | 9 | Checkpoint simulator tab | Aupy et al. 2013 eq. 12 and the exact Poisson expectation; Table 2 reproduced |
| Scale table: exact optimum against first-order prediction from 1,024 to 524,288 GPUs, 5 min vs 10 s pause | 8 | Reading s7 | derived |
| Power swing trace, no smoothing vs 90% floor and ramp limit (before/after animation on one input) | 8 | Reading s5 | 90% floor and 10.5% overhead from Choukse et al. 2025; trace illustrative |
| Air against water for the same rack heat, with presets from 10.2 kW to 1 MW | 7 | Reading s4 | Q = m cp dT; checked against DGX H100's 1,105 CFM at 10.2 kW (16.2 C rise) |
| Watts per chip vs pJ per BF16 FLOP toggle, 2017 to 2026 | 7 | Reading s2 | FACTS.md vendor figures |
| Table 5 coloured by hardware location | 7 | Reading s6 | Llama 3 Table 5 counts |
| Log-scale power ladder chip to gigawatt | 6 | Reading s1 | vendor figures |
| Gigawatt planner (site MW, PUE, average draw, price) | 7 | tab | DGX H100/B200/B300, GB200 NVL72, Ironwood pod; EIA price; rental prices from FACTS.md |
| Predict-then-reveal: B300 energy per FLOP; Young at 131,072 GPUs | 6 | Reading s2, s7 | derived |

## Rejected
- A 54-day replay of Table 5: already on the Llama 3 paper page ("Run the 16K-GPU job").
- Recovery designs on one day (sync, async, in-memory, replica groups) and a first-order goodput calculator: already on Training Infrastructure; linked.
- A data-centre electricity history chart (IEA): the root owns it; not a hardware mechanism.
- A Sankey of power from grid to chip with per-stage losses: per-stage efficiencies not found in a primary source for one real site.
- Immersion cooling: no primary measurement fetched; mentioned nowhere rather than unsourced.
- Weibull (non-exponential) failures in the simulator: Aupy et al. show first-order periods stay robust; adds controls without a published dataset to calibrate.

## What the methodology lacked
A rule for reconciling overlap with a sibling in another topic (Training Infrastructure covers the same Young/Daly rule). Resolved by owning the exact model and its validation here and linking there for recovery engineering.
