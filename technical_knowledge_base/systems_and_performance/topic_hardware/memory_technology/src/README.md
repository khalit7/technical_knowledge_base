# Memory technology: sources, scripts, outputs

Page parts in `parts/` (assembled by `build.sh` into `../index.html`): `20_read*.html` (Reading, nine sections), `31_tab_lab.html` (Memory lab), `32_tab_kv.html` (KV cache across models), `39_tab_more.html` (Further reading); JS: `21_js_rd_common.js` (animation controller, copied from the parent root), `22_js_data.js` (generated, `window.MEMD`), `23_js_rd_charts.js` (chart helpers `MC` and the Reading charts), `24_js_rd_bank.js` (DRAM bank animation, `BANKSIM`), `31_js_lab.js`, `32_js_kv.js` (`KVM.kvSeq`, `KVM.plan`, the growing-conversation animation, chart, planner), `99_js_tabs.js`.

## Reproduce
`MLXPY=<python with mlx> SCRATCH=<dir outside the repo> sh run_all.sh` runs everything below in order.
- `code/mem_gpu.py`: the M1 Pro GPU measurements through MLX custom Metal kernels (working-set read bandwidth, pointer-chase latency, random-block reads, decode attention against MHA/GQA/MQA caches). Every kernel is checked against NumPy first. `out/run_{1,2,3}.json|log`: three runs, 7 trials each, with load averages.
- `code/ssd_read.py`: the internal SSD with the page cache bypassed (`F_NOCACHE` on write and read). `out/ssd.json|log`. `out/ssd_cached_attempt.txt` records the first, cache-served attempt.
- `code/build_data.py` (stdlib only): aggregates the runs (median of run medians, spread across runs), computes the KV cache of 13 models from `inputs/configs/*.json`, the derived numbers, the DRAM bank reference; writes `out/data.json` (embedded verbatim), `out/expected.json` (test vectors) and `parts/22_js_data.js`.
- `check/check_embed.py`: the page embeds exactly `out/data.json`; 39 hand-written numbers in the prose match it.
- `check/check_ui.mjs` (from the repo root, puppeteer `headless: 'shell'`): the page's JS against `out/expected.json` (9,522 values) and every control at 390 px dark and 920 px light (no errors, NaN, undefined, sideways scroll), with screenshots.

## Inputs
- `inputs/configs/`: Hugging Face `config.json` of the 13 models (gated repos via open mirrors: unsloth for Llama 3.1 and Gemma 3, NousResearch for Llama 2), fetched 2026-10-05. The Llama 3.1 405B config is the unsloth bnb-4bit mirror (architecture fields identical; an AWQ mirror with 16 KV heads was rejected).
- `inputs/safetensors_total_size.json`: `metadata.total_size` from each repo's `model.safetensors.index.json`. DeepSeek-V3's lists 1.369e12, twice its FP8 parameter count; the page uses the parent calculator's parameter count (671.0 GB at 1 byte) for it and for the 405B (811.7 GB at 2 bytes).
- Text extracts kept as evidence: `han2015_energy_extract.txt` (Horowitz table), `oconnor2017_fgdram_extract.txt` (HBM2 3.92 pJ/bit split, GDDR5 14 pJ/bit, 1 KB rows), `gholami2024_memory_wall_extract.txt` (3.0x / 1.6x / 1.4x per two years), `kwon2023_pagedattention_extract.txt` (20.4 to 38.2%, block size 16, 2 to 4x), `vllm_cache_config_extract.txt` (`gpu_memory_utilization` default 0.92 at commit 74c5cbcd).
- Vendor figures are typed in `code/build_data.py` with URLs; they are the values of the shared facts file used by the parent's Chip atlas (all fetched 2026-10-05).

## Choices and departures
- Child-page method (Part B of `html_utils/methods/topic_pages.md`): Reading organised by the subject's own logic (cell, array, packaging, tiers, contents, offload, supply), then two tabs. Teaches from zero, as the 2026-10-04 lesson asks; the reading is about 30 minutes.
- No NVIDIA GPU: all measurements are on the M1 Pro and say so; the Memory lab says what transfers to NVIDIA and what does not. Independent NVIDIA measurements (Luo et al.) are kept apart from vendor specs.
- The DRAM bank animation uses illustrative timings (labelled); its order of results does not depend on them.
- Qwen3-Next's linear-attention state is counted at 2 bytes per value (an assumption, labelled).
- Not covered: CXL memory expansion (no primary source fetched in this build).
