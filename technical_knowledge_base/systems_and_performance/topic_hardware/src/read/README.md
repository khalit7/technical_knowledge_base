# Reading and Further reading (tabs `t-read`, `t-more`)

Owner files: `../parts/20_read.html` (opens the tab, CSS scoped under `#t-read`, nav, opener), `20_read_a.html` to `20_read_i.html` (sections 1 to 10), `22_js_rd_data.js` (generated), `23_js_rd_tile.js` (CPU core vs GPU SM tile), `24_js_rd_sm.js` (H100 zoom), `25_js_rd_decode.js` (decode token on each memory; reads per second), `26_js_rd_fmt.js` (peak by format), `27_js_rd_ring.js` (ring all-reduce), `28_js_rd_misc.js` (ridge and price bars, predict-then-reveal), `39_tab_more.html`. Element ids start with `rd-`. `21_js_rd_common.js` (shared animation controller) is the scaffold's.

Shape: the spine is "follow one training step down to the silicon" (Llama 3.1 8B, 64 sequences of 8,192 tokens, the same step the Performance calculator animates), in ten sections. It departs from the topic-root method's 15 to 20 minute target (about 35 minutes, tables and captions included) because Khalid asked to be taught from zero across ten required sections; depth is still pushed to the data tabs and to proposed child pages.

## Reproduce
- `python3 recompute.py` (stdlib only): every derived number, from `inputs/llama31_8b_config.json` (Hugging Face, unsloth mirror of the gated Meta repo), `../roof/out/data.json` (the Roofline lab's M1 Pro measurements) and vendor figures typed with their URLs (fetched 2026-10-05). Writes `out/expected.json` and `../parts/22_js_rd_data.js`.
- `sh ../build.sh`, then `python3 check/check_prose.py` (the page embeds exactly `out/expected.json`; 38 hand-written numbers match it) and, from the repo root, `node <this folder>/check/check_read.mjs [shots dir]` (every Reading control at 390 px dark and 920 px light: no errors, NaN, undefined or sideways scroll; screenshots per section).
- `old/`: the old root and its four children, verbatim from read-only Notion fetches. `coverage.md`: verdict on every old claim. `viz_ideas.md`: visuals built and rejected.
- `inputs/`: the config, a 15-line extract of the A100 whitepaper (tensor core FMA per clock) and of the OCP MX spec's Table 1.
