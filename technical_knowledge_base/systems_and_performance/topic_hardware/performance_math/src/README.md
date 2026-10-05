# src: Performance math

Build: `sh build.sh` writes `../index.html` from `parts/`. Everything (recompute, data, build, checks): `sh run_all.sh` (python3 and node with html_utils' node_modules); `TRACE=1` re-traces the meta-device steps, `M1=1` re-measures on the M1 Pro GPU (both need `uv`).

- `parts/`: 01_head (look copied from the sibling pages), 10_header (tabs), 20_read_a..g (Reading: a = styles and nav, b = in one screen and s1 FLOPs, c = s2 model state and s3 activations with the animation, d = s4 recompute and HFU and s5 MFU on real runs, e = s6 measuring MFU on the M1, f = s7 serving, s8 communication, s9 costing, g = s10 mistakes, drills, interview), 20_read_z closes it; 21_js_rd_common (step-animation controller, from the parent); 22_js_calcd and 23_js_calcx (the parent's Performance calculator data and model, copied unchanged); 24_js_pmd (generated data); 25_js_rd_mem (the ledger and activation formulas, window.PMA, and the memory animation); 26_js_rd_misc (Reading charts, tables, drills); 31 FLOP and memory ledger; 32 Run and serving planner; 39 Further reading; 99 tabs.
- `code/trace_llama.py`, `code/run_traces.sh`: one training step of Llama 3.1 8B (2K to 128K tokens, plain attention, FlashAttention, full recompute) and 70B on the meta device: FLOPs and bytes per operator, every saved tensor; writes `out/trace_*.json`.
- `code/m1_step.py`, `code/run_m1.sh`: two 8B-shaped layers timed on the M1 Pro GPU (MPS) and every operator recorded for the roofline prediction; writes `out/m1_run_*.json`.
- `recompute.py`: every derived number, importing the parent's `src/calc/model.py` so the two pages cannot disagree; writes `out/recompute.json`. `code/gen_data.py` writes `parts/24_js_pmd.js`.
- `check/check_embed.py` (prose numbers), `check/check_page.mjs` (JavaScript against Python, copied parent files unchanged), `check/check_ui.mjs` (every control at 390 px dark and 920 px light).
- `inputs/`: configs (from the parent), extracts of PaLM, Korthikanti et al., Llama 3 and DeepSeek-V3, and PyTorch's checkpoint docs, with URLs and dates.
- `live.md`: the old page (copy of the parent's `src/read/old/04_performance_math.md`); `coverage.json` maps its 32 claims.
- `viz_ideas.md`: visuals built and rejected, with scores.

Shape: Part B of `html_utils/methods/topic_pages.md` (child page). Departure: the parent already has the calculator this page's subject would naturally be, so the tabs extend it (a ledger of exact counts, a planner for deadlines and serving cost) and the Reading tab derives and checks rather than computes. No NVIDIA GPU: FLOPs and saved bytes are counted by PyTorch on the meta device (exact, no hardware), utilisation is measured on the M1 Pro GPU, and NVIDIA figures are vendor specs or papers.
