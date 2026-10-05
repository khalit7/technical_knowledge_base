# src: TPUs and other accelerators

Build: `sh build.sh` writes `../index.html` from `parts/`. Everything (recompute, build, checks): `sh run_all.sh` (python3, node with html_utils' node_modules).

- `parts/`: 01_head (shared look copied from the root), 10_header (tabs), 20_read_a..h (Reading: a = styles and nav, b = in one screen, c = s1 systolic arrays, d = s2 inside a TPU and s3 generations, e = s4 pods, f = s5 AMD and s6 Trainium, g = s7 Groq and s8 Cerebras, h = s9 your code and s10 mistakes), 20_read_z closes it; 21_js_rd_common (RD helpers and the step-animation controller, from the root); 22_js_sys_core (the systolic simulator, port of `sim/systolic.py`); 23 to 26 Reading JS; 31 Systolic array lab; 32 Pod builder; 39 Further reading; 99 tabs.
- `sim/systolic.py`: cycle-level weight-stationary array and the tiled model; writes `out/systolic_ref.json`.
- `recompute.py`: every derived number on the page; writes `out/recompute.json`.
- `check_embed.py`: prose and table numbers equal `out/recompute.json`; the animation's matrices are reference case 0.
- `check_sim.mjs`: the page's JavaScript (simulator, tiled model, Reading animation, fit chart, pod all-reduce) against the Python (61 comparisons).
- `check_ui.mjs`: clicks every control at 390 px dark and 920 px light; fails on errors, NaN, undefined, sideways scroll.
- `inputs/`: extracts of the primary sources read (scaling book, TPU v4 paper, CACM 2020 Table 1), HF parameter counts, and the two research notes (AMD and Trainium; Groq, Cerebras and energy) with every quote and URL, all fetched 2026-10-05.
- `live.md`: the old Notion page "TPUs: systolic arrays and pod-scale machines" (copy of the root's `src/read/old/02_tpus.md`); `coverage.json` maps each of its 50 claims to where it is carried, corrected or why dropped.
- `viz_ideas.md`: visuals built and rejected, with scores.

Shape: Part B of `html_utils/methods/topic_pages.md` (child page). Departure: the old page covered TPUs only; Khalid's new title adds AMD, Trainium, Groq and Cerebras, so the Reading tab is organised as one mechanism (systolic arrays) then one section per machine, each ending with what it changes in training code, plus a cross-machine table (s9). No measurement on this laptop: nothing here has an M1 analogue; the simulator is validated against Python instead.
