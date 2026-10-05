# Reading tab and Further reading (CUDA root): sources, scripts, outputs

- `old/`: the old Notion root and its six children, verbatim (fetched read-only 2026-10-05, extracted by script from the fetch results).
- `coverage.md`: every claim of the old pages marked verified, corrected, unconfirmed or left to a child, with where the page carries it.
- `code/measure_m1.py`: three measurements on the Apple M1 Pro GPU through MLX 0.32.3 (launch-and-wait overhead, a 8192 x 8192 softmax, attention unfused vs `mx.fast.scaled_dot_product_attention`); run three times, outputs in `out/run_{1,2,3}.json` with the load average of each run. Needs an MLX environment (`uv venv` + `uv pip install mlx numpy`); not run inside the repo's project.
- `code/summarize.py` (run from `src/`): medians of the three runs, plus quoted values from the GPU simulator (`../sim/out/data.json`), the Kernel lab (`../lab/out/data.json`) and the Compiler explorer (`../compile/out/*.ptxas.txt`), every derived number, `out/summary.json`, `out/prose_values.json`, the page data `../parts/22_js_rd_data.js`, and it rewrites every `<span data-rdv>` number in the Reading parts.
- `check/check_embed.py` (from `src/`): the page embeds exactly `summary.json`, the tagged prose numbers equal the data, key derived figures recompute, no private paths.
- `check/check_read.mjs` (from the repo root): puppeteer, every control at 390 px dark and 920 px light; errors, NaN, undefined, sideways scroll; screenshots.
- `viz_ideas.md`: visuals built and rejected.

Reading parts: `../parts/20_read.html` (tab wrapper, CSS, section nav), `20_read_a.html` to `20_read_i.html`, `23_js_rd_journey.js`, `24_js_rd_grid.js`, `25_js_rd_mem.js`, `26_js_rd_ladder.js`, `27_js_rd_fuse.js`, `22_js_rd_data.js` (generated); Further reading `39_tab_more.html`.
