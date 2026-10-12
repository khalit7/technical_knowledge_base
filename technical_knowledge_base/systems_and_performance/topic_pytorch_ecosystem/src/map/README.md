# Ecosystem map tab (t-map): sources and how to rebuild

Data as of 2026-10-12. Parts: `../parts/34_tab_map_a..d.html`, `../parts/34_js_map_0data.js` (generated), `34_js_map_1core.js` to `34_js_map_6choose.js`.

| File | What it is |
|---|---|
| `atlas_a.py`, `atlas_b.py` | The 42 curated atlas entries: one line, owner, licence, status with its primary source (read 2026-10-12), what it calls in core, when to choose and avoid |
| `atlas_c.py` | PyTorch 2.0 to 2.14 highlights and deprecations (from the GitHub release notes), ecosystem events, the "what replaced what" table |
| `gen_data.py` | Merges the above with `inputs/` into `../parts/34_js_map_0data.js` (plain Python 3) |
| `validate.py` | After `build.sh`: the page embeds exactly the generated data; every count quoted in prose equals the recorded data; no private paths, em dashes or NaN |
| `scan_source.py`, `scan_deps.py` | Count files in each released package that use a core API, or import another library (tests, examples, benchmarks, docs folders skipped). Run on a folder of unpacked wheels: `python3 -I scan_source.py <dir>` |
| `checks/` | The small real runs (CPU, Apple M1 Pro, torch 2.14.1, no timing); outputs in `inputs/checks/` |
| `inputs/pypi.json` | PyPI metadata and release history per package (fetched 2026-10-12) |
| `inputs/github_repos.json` | GitHub repository metadata (archived flag, licence id, last push) |
| `inputs/source_scan.json`, `inputs/source_deps.json` | The scan results, with one example line per API |
| `inputs/pytorch_release_notes_extract.json` | Highlights and Deprecations sections of every 2.x.0 release note |

Rebuild: `python3 src/map/gen_data.py && sh src/build.sh && python3 src/map/validate.py`.

Checks were run with the shared venv's Python (torch 2.14.1 plus torchao 0.18.0, transformers 5.19.0, accelerate 1.15.0, peft 0.21.2, trl 1.15.0, lightning 2.6.6, torchvision 0.29.1, executorch 1.5.1 with `--no-deps`), from inside `checks/`, with `MAP_SCRATCH` pointing outside the repo for Trainer and Lightning output folders. Two-process checks: `torchrun --nproc_per_node 2 c_dist.py` and `torchrun --nproc_per_node 2 c_stacks.py ddp`.

Departure from the topic method: this is a data tab of the root, so it follows Part A's "data tabs that compare everything", with a measured before/after animation (the same step through five entry points) because the page's spine is one training step.
