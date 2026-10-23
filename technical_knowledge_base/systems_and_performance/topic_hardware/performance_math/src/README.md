# src: Performance math

Build: `sh build.sh` writes `../index.html` from `parts/`. Everything (recompute, data, build, checks): `sh run_all.sh` (python3 and node with html_utils' node_modules); `TRACE=1` re-traces the meta-device steps, `M1=1` re-measures on the M1 Pro GPU (both need `uv`).

- `parts/`: 01_head (look copied from the sibling pages), 10_header (tabs), 20_read_a..g (Reading: a = styles, nav, core idea, hero, you need, new terms; b = s1 FLOPs; c = s2 roofline and s3 memory with the animation; d = s4 MFU, HFU and recompute, s5 measuring on the M1; e = s6 serving; f = s7 costing with the cost estimate, s8 communication; g = rehearsal, closed), 20_read_z closes it; 21_js_rd_common (the skill template: never autoplays); 22_js_calcd and 23_js_calcx (the parent's Performance calculator data and model, copied unchanged); 24_js_pmd (generated data); 25_js_rd_mem (the ledger and activation formulas, window.PMA, and the memory animation); 26_js_rd_misc (Reading charts, tables, drills); 27_js_rd_figs (hero, roofline slider, MFU bars, run-cost estimate; `window.PMF` for the checks); 31 FLOP and memory ledger; 32 Run and serving planner; 39 Further reading; 99 tabs.
- `code/trace_llama.py`, `code/run_traces.sh`: one training step of Llama 3.1 8B (2K to 128K tokens, plain attention, FlashAttention, full recompute) and 70B on the meta device: FLOPs and bytes per operator, every saved tensor; writes `out/trace_*.json`.
- `code/m1_step.py`, `code/run_m1.sh`: two 8B-shaped layers timed on the M1 Pro GPU (MPS) and every operator recorded for the roofline prediction; writes `out/m1_run_*.json`.
- `recompute.py`: every derived number, importing the parent's `src/calc/model.py` so the two pages cannot disagree; writes `out/recompute.json`. `code/gen_data.py` writes `parts/24_js_pmd.js`.
- `check/check_embed.py` (prose numbers), `check/check_page.mjs` (JavaScript against Python, copied parent files unchanged), `check/check_ui.mjs` (every control at 390 px dark and 920 px light, and that nothing moves before the reader acts).
- `inputs/`: configs (from the parent), extracts of PaLM, Korthikanti et al., Llama 3 and DeepSeek-V3, and PyTorch's checkpoint docs, with URLs and dates.
- `live.md`: the old page (copy of the parent's `src/read/old/04_performance_math.md`); `coverage.json` maps its 32 claims.
- `viz_ideas.md`: visuals built and rejected, with scores.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page). Departure: the parent already has the calculator this page's subject would naturally be, so the tabs extend it (a ledger of exact counts, a planner for deadlines and serving cost) and the Reading tab derives and checks rather than computes. No NVIDIA GPU: FLOPs and saved bytes are counted by PyTorch on the meta device (exact, no hardware), utilisation is measured on the M1 Pro GPU, and NVIDIA figures are vendor specs or papers.

## The 2026-10-23 rebuild to the teaching contract
Editing and new visuals only; no new runs. `.claude/skills/explainer-page/teaching/teaching-contract.md` governs; this page owns performance arithmetic (OWNERS.md): FLOPs, memory traffic, arithmetic intensity and the roofline, MFU and HFU, prefill and decode bounds, costing.
- **Top**: the core idea in one sentence (three counts over three chip numbers), a static hero drawing the running example as four divisions (training step, memory held, decoded token, whole run), "You need", new terms. The old "In one screen" table was fat (each row restated a section's headline number) and is gone.
- **New section 2, the roofline**, which the page owned but did not teach: one 4,096 x 4,096 BF16 matmul at 1 and 8,192 tokens per weight read (concrete), a log-log roofline with one movable point (tokens per weight read, the only control) and a prediction prompt, then the formula. The H100 ridge (295 FLOPs per byte) is reached at about 345 tokens; the M1 roof is the parent's Roofline lab's measured ceilings. Derived from vendor specs: there is no published figure for it to land on, and the caption says derived.
- **Sections merged**: model state and activations are one memory section around the animation; recompute and HFU sit inside the MFU section. The four run cards became an MFU bar chart (PaLM's HFU hatched, the best H100 GEMM dashed, the M1 measurement and the card-implied 13.9% beside the big runs); each bar's arithmetic is in a closed block.
- **New run-cost estimate** in section 7: presets Llama 3 405B (defaults reproduce the paper's 3.8e25 FLOPs independently; 26.4M GPU-hours against the card's 30.84M, residual 1.17 shown and explained), Llama 3.1 8B (40% MFU illustrative; card 2.9x), DeepSeek-V3 (by construction from 180K H800 hours per trillion tokens); one MFU slider.
- **Closed blocks** (depth): the convention box, bytes per parameter for every recipe, the GPT-3 34sbh table and the saved-tensor table with the three reasons for 49, PaLM's HFU rebuild, selective recompute's ratio, Llama 3's step time, the M1 run table, long prompts, the communication table, mistakes, drills (with the one interview question that adds a design angle).
- **Fat deleted**: wind-ups ("The problem."), the one-screen table, four interview answers and four mistakes that restated sections, the old subtitle and section nav.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `pm-tab`); the memory animation's mode switch no longer starts it. `check_ui.mjs` checks the step stays 0 for 3 s on screen and after a mode switch.
- **Owners**: checkpointing mechanics and per-split communication bytes are Distributed Training's (OWNERS.md), so section 8 keeps two sentences and closes the table; KV-cache sizing links Long context. Distributed Training does not yet carry this page's Llama 3.1 8B byte counts (28.1 GB, 42.2 GB, 0.47 GB per layer, 67 MB, 229 KB), so they stay here as depth.
- **Further reading**: the CUDA root's time corrected (44 to 25 min); section numbers updated.
- **Images**: none. This page is arithmetic, not a physical object; the sibling hardware pages carry the photos, and no openly licensed canonical roofline figure was needed when the page draws its own.

### Length judgement
| | Before | After |
|---|---|---|
| Reading, core (230 words a minute) | 27.7 min | 21.3 min |
| Reading, closed details | 1.8 min | 10.7 min |
| FLOP and memory ledger / Run and serving planner | 2.0 / 2.7 min | 2.0 / 2.7 min (unchanged tools used across the page) |
| Visuals drawn in Reading | 3 | 7 (hero, ledger chart, roofline, memory animation, MFU bars, M1 chart, cost estimate) |

Why 21 minutes is right: the core now carries eight mechanisms (FLOP counting and its four corrections, the roofline, the memory budget, utilisation with recompute, measurement and operator-level prediction, the two serving phases, costing, communication placement), each with its numbers and a picture, and it gained a section (the roofline) that the page owned without teaching. Everything that is provenance, per-recipe tables, rebuilds of published figures or rehearsal is closed and optional (10.7 min).

### Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
316 units: core 192, depth 87, fat 37. 299 were drafted by `ledger.py init`; 17 were added by hand for script-rendered tables and the new visuals. Fat units carry a `note` saying why.

## Topic close (2026-10-24)
The parent calculator now uses this page's activation count (49h per layer for the 8B plus FP32 logits) instead of 34sbh; `recompute.py` imports `act_bytes_gpt3` for the 34sbh comparison (36.5 GB), the copies `22_js_calcd.js` and `23_js_calcx.js` were recopied, and the two correction boxes say so. Further reading times set to each header.
