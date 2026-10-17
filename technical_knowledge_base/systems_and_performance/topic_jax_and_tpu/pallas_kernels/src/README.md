# Pallas kernels: sources

Built 2026-10-15. Pinned: jax/jaxlib 0.11.2 (tag jax-v0.11.2, 32544801), tokamax 0.0.16 (PyPI sdist, sha256 a0114239bd6de90ad5b1a94bedd70b0d834c44cfa684630eff6b8b85f3c3c314), both unpacked in the shared setup folder (`$JX_SCRATCH/src/jax`, `$JX_SCRATCH/src/tokamax_016`). CPU only (Apple M1 Pro), shared venv; see the root's `src/data/README.md` for the running example.

## Run (in order; CPU, low priority)
```sh
export JX_SCRATCH=<shared setup folder>
R="JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"
cd src/runs
$R pk_run.py        # out/kernels.json: every kernel, production kernels, bugs, lowering (TPU and cuda), timings (about 45 s)
$R pk_grid.py       # out/grid.json: per-step block indices, copies, recorded interpreter orders (needs kernels.json)
$R pk_pipeline.py   # out/pipeline.json: Buffered(1|2|3), the serial vs double-buffered timelines (calculated, v5e figures)
$R pk_tiles.py      # out/tiles.json: the online softmax replayed on a trained head
$R pk_old.py        # out/old.json: checks of the old Notion page's Pallas claims; vmap; fully masked row
$JX_SCRATCH/venv/bin/python -I -B pk_source.py   # out/source.json: file:line located by regex; tuned table; guide outputs
python3 -I -B pk_data.py                          # ../parts/22_js_pk_data.js (window.PK)
cd .. && sh build.sh
python3 -I -B check_page.py                       # embedded data == recorded; 122 prose numbers == data; copy recount; privacy
NPM_CONFIG_USERCONFIG=<empty file> node check_ui.mjs ../index.html <shot folder>   # every control, 390 dark and 920 light
```
`runs/pk_kernels.py` holds the kernels; the page shows its `# ---- name` sections verbatim. The root lab's `src/tpu/tp_kernels.py` (matmul, flash forward) is imported, not copied. Timings change from run to run (shared machine, load 30 to 55); `check_page.py` fails if the prose numbers no longer match, so update the prose with the data.

## Shape
A child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading organised by the subject (why, model, kernels by kind, pipelining, scalar prefetch, semantics, testing, production, block sizes, comparison), then three labs. No departure from the method. The root's TPU and Pallas lab owns the five ideas, the matmul grid animation, the (8, 128) rule and HBM traffic tables: linked, not rebuilt.
