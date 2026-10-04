# Source of the Agentic benchmarks page

Build: `uv run --with pyyaml python3 mk_data.py` (writes `parts/22_js_data.js` from `inputs/`), then `sh build.sh` (writes `../index.html`).
Checks: `node checks/check_page.mjs` (every control at 390 dark and 920 light, 612 actions; dumps the page's computations to `checks/js_out.json`), then `uv run --with scikit-learn --with numpy --with pyyaml python3 recompute.py` (ALL OK on 2026-10-04), `python3 mk_coverage.py` (writes `coverage.json`), and `sh ../../../../../html_utils/checkpage.sh ..`. `checks/shots.mjs` takes element screenshots.

Shape: Part B of `html_utils/methods/topic_pages.md` (child page). Reading is organised by the subject's logic: one screen, anatomy (with the before/after animation on a real Terminal-Bench task), pass^k (animation on real tau2 trials), the harness, then one section per family (terminal, computer use, web, assistants, customer service, tools and MCP, long tasks and work, the system as subject), integrity, leaderboards, mistakes, checklist. Reading is about 35 minutes, longer than most children, because the old page covered about 20 benchmarks and each now carries its corrections and dated readings.

Parts: `01_head`, `02_css` (shared look), `03_css_page`, `10_header`, `20_read_a` to `_d`, `30_tab_pk`, `31_tab_th`, `32_tab_task`, `39_tab_more`; JS `21_js_common` (animation controller), `22_js_data` (generated), `23_js_anat`, `24_js_pkread` (also window.PK), `25_js_tbline`, `26_js_tbboard`, `30_js_pk`, `31_js_th` (window.TH), `32_js_task` (window.TK), `99_js_tabs`.

Inputs (all read 2026-10-04): tau2-bench submissions and trajectory files (MIT; per-task trial vectors only), METR eval-analysis-public v1.1 runs aggregated per agent and task (no licence stated; counts only) and `benchmark_results_1_1.yaml`, Terminal-Bench 2.0 regex-log task files and the 3.0/4.0 task surveys (Apache 2.0), the tbench.ai 4.0 board JSON (copied from the root's `same/inputs`), text of the RDI post, the Arena HarnessTax post, the Real-SWE page and the TB 4.0 announcement, arXiv abstracts.

Root data reused: `../../src/data/atlas.json` (agentic rows, corrections, dated readings), root READMEs; paper pages StateM, HarnessDev, MOLE, Emergence World, SoL-Pi for corrected facts.
