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

## Added 2026-10-23 (teaching-contract rebuild)
| Idea | Placement | Data |
|---|---|---|
| Hero: power in, heat out, multiplied by lockstep (static annotated diagram) | top of Reading | figures from sections 2 to 5; 167 MW and 833 MW derived at PUE 1.2 |
| Job MTBF against GPUs at three rates, with the C + D + R line | section 5 | MTBF = 1 / (servers x rate); Llama 3 and Kokolis rates |
| Memory fault escalation (ECC, uncorrectable, row remap, replace; SDC beside) | section 5 | NVIDIA memory error management docs |
| Energy per training token, widening the boundary (bars) | section 8 | derived, same numbers as before |
| Three photos (NVL72 rack, air hall, immersion) | sections 2 and 3 | Wikimedia Commons, see img/CREDITS.md |
Moved: the Checkpoint simulator and the Gigawatt planner from tabs into sections 6 and 2. Removed: the log-scale power ladder (its numbers are in the hero and sections) and the static per-gigawatt table (the planner shows the same rows at its defaults).

## Rejected
- A 54-day replay of Table 5: already on the Llama 3 paper page ("Run the 16K-GPU job").
- Recovery designs on one day (sync, async, in-memory, replica groups) and a first-order goodput calculator: already on Training Infrastructure; linked.
- A data-centre electricity history chart (IEA): the root owns it; not a hardware mechanism.
- A Sankey of power from grid to chip with per-stage losses: per-stage efficiencies not found in a primary source for one real site.
- Immersion cooling as a visual: no primary measurement beyond Microsoft's 5% to 15%; one sourced sentence and a photo instead (2026-10-23).
- Weibull (non-exponential) failures in the simulator: Aupy et al. show first-order periods stay robust; adds controls without a published dataset to calibrate.

## What the methodology lacked
A rule for reconciling overlap with a sibling in another topic (Training Infrastructure covers the same Young/Daly rule). Resolved by owning the exact model and its validation here and linking there for recovery engineering.

## Added 2026-11-12 (split layout and 3D stages v2)
| Idea | Placement | Data |
|---|---|---|
| Fig. 1, 3D: one gigawatt from grid, substation and UPS to a GB200 NVL72 rack, one pulled-out compute tray, heat out through cold plates, CDU and plant, then the hall of about 6,944 racks (replaces the 2D hero chain) | top of Reading, 6 steps | PW.systems (120 kW, 72 GPUs), PUE 1.2, 1,200 W; tray counts from the DGX GB200 user guide; derived 167 / 833 MW, 86.4 kW, 6,944 racks, 500,000 GPUs; stream area proportional to MW |
| Fig. 2, 3D: one second of coolant for a 120 kW rack, air (1.88 m cube) against water (14 cm cube), cold plates, CDU, tower | section 3, 4 steps | the cooling calculator's defaults and Q = m cp dT |
| Fig. 3, 3D: 2,048 servers as 256 tiles; checkpoint to storage, one failure stops all, swap and reload, the default day's 8 failures and the two lanes' saved hours | section 5, 5 steps | the page's engine (PWE) on the default day; tile positions illustrative |
| Power swing as 5 explained stretches with a step list per mode (was 13 one-phase steps with a caption carousel) | section 4 | unchanged trace |
Kept 2D: chip bars (a toggle between two scales), job MTBF (log axes), Table 5 (ranked bars), the escalation chain (a sequence of states, no space), the checkpoint day and useful-time curve (a time line and a curve; the day is a widget the reader drives), the scale table, energy-per-token bars. Rejected for 3D: per-stage conversion losses as separate steps (no primary per-stage efficiencies for one site, as before), immersion as a step (one sourced sentence and a photo carry it).
