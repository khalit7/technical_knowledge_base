# Reading and Further reading tabs (`t-read`, `t-more`): sources and how to rebuild

Owns `../parts/20_read.html` (styles, nav), `20_read_a.html` to `20_read_k.html` (sections 0 to 10, mistakes, interview questions), `22_js_rd_data.js` (generated), `23_js_rd_s01.js`, `24_js_rd_s23.js`, `25_js_rd_s568.js`, `26_js_rd_s7.js`, and `39_tab_more.html`. `21_js_rd_common.js` (RD.anim) is the scaffold's.

| File | What it is |
|---|---|
| `old/` | The old root and its four children, fetched from Notion (read only) on 2026-10-12, verbatim |
| `coverage.md` | Every claim of the old pages: verified, corrected, unconfirmed or moved, and where it is now |
| `measure.py` | Deterministic measurements for this tab (torch 2.14.1, CPU, no timing): views and strides of a 3 x 4 tensor; the dispatch walk of `torch.mm` in five situations (key sets, calls reaching the backend, grad_fn, dtype); a two-layer autograd graph with saved tensors, plain and checkpointed; a graph break against the same code as a `torch.library.custom_op` |
| `inputs/measure.json` | Its output |
| `build_data.py` | Writes `../parts/22_js_rd_data.js` from `inputs/measure.json` and the other tabs' recorded inputs (`../step/inputs`, `../comp/inputs`, `../dist/inputs` via `dist_extract.py`) |
| `check_data.py` | After the build: the page embeds the current data; every number quoted in prose equals the recorded value; no private paths or em dashes |
| `check_page.mjs` | Browser check at 390 dark and 920 light: every mode of every animation stepped to the end, every predict button, no errors, NaN, undefined or sideways scroll; counts Further reading links |
| `viz_ideas.md` | Visuals built and rejected |

Rebuild (shared venv python as `PY`): `PY -I measure.py > inputs/measure.json; python3 build_data.py; sh ../build.sh; python3 check_data.py; node check_page.mjs ../../index.html <shots dir>`.

Timings are not measured here: every timed number comes from the Inside one step, Compile lab and Distributed lab records (run under the bench lock by those tabs), with their load averages.

Departure from the topic method: Part A's root is a comparison; this root is a teaching spine (one training step down the stack, made fast, then spread out) because Khalid asked to learn PyTorch from zero. The comparisons the method asks for live in the Ecosystem map tab and in each section's "what carries over to NVIDIA GPUs" and before/after visuals.
