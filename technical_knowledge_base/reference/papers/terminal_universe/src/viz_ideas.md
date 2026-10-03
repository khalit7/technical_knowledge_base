# Visualisation ideas: Terminal-Universe

The question the paper keeps returning to: **how much of a usable training environment can be recovered from a recorded agent run, and is it the environment or the teacher that makes the gain?** Visuals are scored 0 to 2 on: parameter the reader controls, reproduces a stated figure, computable from public data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; reproduction and computability count double; build cost subtracted; +1 for a step animation against the method it replaced.

## Built (ids for the ideas log)

| # | Idea | What it shows, and what the reader does | Data and sources | Placement | Score |
|---|---|---|---|---|---|
| P-terminal_universe.1 | **Replay a real trajectory** (live ingredient) | Stage 1 deterministic replay run in the browser on five real LFM2-Terminal rows; one cell per command coloured by its role, the terminal output, the recovered workspace Ê0 with held-back agent files; toggle "earliest version" (the paper's rule) against "last version" (the solved workspace leaks in); recovered file viewer; statistics over 640 sampled rows against Table 13 | `fetch_sample.py`, `replay.py`, JS port checked on 640 traces (0 mismatches); Table 13, Table 12 | Own tab | 2+2·1+2·2+2+2+2+2−1+1 = 16 |
| P-terminal_universe.2 | **Imitate against rebuild and re-solve**, animated | The same real trace used two ways, file squares to scale (replay from the trace, completion at the paper's medians, labelled), the four re-query kinds, teacher re-solve, and the Table 4 bars (36.7 imitation, below the 47.0 base; 52.1 re-solved) | Table 4, Table 13, Table 2 | Reading, Idea | 13 |
| P-terminal_universe.3 | **Funnel to scale** | 359,593 trajectories to 68,263 to 40,194 to 37,273 to 31,977 records, every step summed | pipeline figure labels, Tables 2, 12, 14, 19 | Reading, Step 1 | 11 |
| P-terminal_universe.4 | **Completion bars** with files, text lines, code lines toggle | How little replay recovers and how much the completion agent writes (87% of files, 98% of lines on average) | Table 13; Figure 4 multipliers reproduced | Reading, Step 1 | 11 |
| P-terminal_universe.5 | **Multi-round session stepper** | The seven requests of the sensor-ingestion session coloured by style (extension, revision, conflict) with the private verdict behind each | Table 18, Appendix E.3 | Reading, Step 2 | 8 |
| P-terminal_universe.6 | **Figure 3 against the text** | Session shapes from the figure's labels; the kept share implies about 3,486 sessions against 3,079 reported | Figure 3 decoded by colour | Reading, Step 2 | 10 |
| P-terminal_universe.7 | **Table 3 dot chart** with measured/copied and same-base encoding, four metrics | What is like for like in the comparison table (three rows share the base model) | Table 3, Table 20 | Reading, Results; Tables tab with filters and Δ | 10 |
| P-terminal_universe.8 | **Three predict-then-reveal questions**: imitation SFT against the base; where Single-WS alone takes MT@4; which doubling of the budget helps | Belief elicitation where intuition fails, each revealed with error bars | Tables 4, 9, 10 | Reading, Ablations | 11 |
| P-terminal_universe.9 | **Ablation noise chart** | Every ablation difference in standard errors from the printed run spreads; most component claims sit under 2 | Tables 4 to 11 | Tables tab, linked from How much to believe | 12 |
| P-terminal_universe.10 | **Score granularity check** | TB scores and Figure 6 per-category changes that are not whole trials out of 89 tasks × 6 runs | Tables 4 to 11, Figure 6 | Tables tab (checks, Figure 6 marker) | 8 |

## Rejected

| Idea | Why |
|---|---|
| A toy "environment reconstruction" model | Nothing to train; replay is deterministic and the paper's other stages are LLM agents. |
| Running the completion agent or the judge in the page | Needs a strong LLM and a container; impossible in a sandboxed page and would invent outputs. |
| Redrawing Figure 4 or 5 as images | Their printed labels are used directly (Table 13 and the decoded labels); nothing is read off bars. |
| Then and now | A September 2026 paper; "What it takes to use this" covers adoption. |
| Training-cost tab | The paper gives no compute or cost figures, and it is a pattern Khalid removed. |
| Replaying SWE sources (SWE-smith, SWE-rebench) as well | Different trace formats (tool calls with patches); one source, the one behind 96% of the terminal environments, teaches the mechanism; would double the parser and the page size. |

## What the methodology lacked for this page

A rule for **re-implementing an unreleased pipeline stage on the paper's own public inputs**: when the paper's data source is public but its code is not, rebuild the cheapest deterministic stage, run it on a seeded sample of the real source, and compare its statistics with the paper's table (here the median replayed file count reproduced; line counts did not). It also surfaced a source-audit step worth making routine for data papers: sample the source corpus and report who produced it (here one model and one harness on generated tasks), since "public trajectories" can mean something much narrower than it sounds.
