# src: Matrix calculus and backprop

Build: `sh src/build.sh` (concatenates `parts/`, converts LaTeX to MathML with `html_utils/tex2mathml.mjs`, writes `../index.html`).

Numbers, in order:
1. `uv run --no-project --with numpy --with torch python src/recompute.py` (run from the scratchpad or with `--no-project`): recomputes every number on the page in numpy, checks each hand-derived gradient against PyTorch autograd (and JAX outputs in `inputs/measure/jax.json`), summarises the measurements, writes `expected.json`. Must print `checks failed: none`.
2. `python3 src/make_data.py`: writes `parts/22_js_data.js` (window.MCD) from `expected.json` and `inputs/measure/`.
3. `node src/check_js.mjs`: runs `parts/22b_js_core.js` (the page's maths) against `expected.json` (72 checks).
4. `src/test_page.mjs`: puppeteer, clicks every control at 390 dark and 920 light (run from `html_utils/`, see the file header); screenshots in `../.shots/`.

Measurements (`inputs/measure/`, scripts beside their JSON outputs; PyTorch 2.14.1, JAX 0.11.2, NumPy 2.5.3, Apple silicon, 2 CPU threads): `graph.py` (the real grad_fn graph), `cost.py` (FlopCounterMode; first timing run), `timing2.py` (interleaved timing, final run in `timing2.json`, earlier in `timing2_run1.json` and `cost_time_*.json`), `prof.py` (per-op profiler), `memtl.py` (MPS allocator timeline per op), `savedops.py` (saved bytes by op), `hvp.py`, `jaxdemo.py`, `tiny_autograd.py`, `custom_fn.py`. Source quotes with locations: `inputs/sources_quotes.md`. Pinned PyTorch source lines are linked at tag v2.14.1.

Old material: `live.md` holds the inherited sections of the old Linear algebra and Calculus and optimisation pages verbatim; `coverage.json` maps each fact; `handoff_*.md` record what goes to siblings.

Shape: topic_pages.md Part B (child). Departure: sections 10 to 13 are labelled depth beyond the main line, because the page covers both the maths (sections 1 to 6) and the systems side (7 to 13) and is about 45 minutes in all.
