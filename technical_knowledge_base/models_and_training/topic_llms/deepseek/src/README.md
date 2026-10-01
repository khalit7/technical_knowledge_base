# DeepSeek: interactive page (v3)

`visual.html` replaces all the text of the Notion page "DeepSeek" (child of Topic: llms). It is the only source of information on the page, so it carries every fact of the old text (see `coverage.json`), each specific figure linked inline to its source.

- Build: `./build.sh` concatenates `parts/` into `visual.html` (HTML parts 01 to 05 and 07, then scripts 10 to 24, tabs script 90 last).
- Check: `node tabshot.mjs <t-read|t-cache|t-line|t-more> <light|dark> <920|390> <out.png> [click selector]`; screenshots are in `shots/`.
- Tabs, in order: Reading (default), Cache across generations, Lineage (with the config diff panel), Further reading. 07_more.html is Further reading; scripts 18 to 24 are the MLA animation, pipeline simulator, R1 flow, EPLB port, V4.1-Flash strip and config diff. Charts in hidden tabs draw on first open (`onTab` in `10_js_common.js`).
- MLA animation (`18_js_mlx.js`, card `#mlx` in the Reading tab's MLA section, under the prefill/decode switch): one token through one layer at V3's dimensions, 7 MLA steps (arrive, compress with W^DKV, decoupled RoPE key, write 576, prefill rebuild, decode absorbed, compare) and 6 standard-MHA steps; play/pause, step back/forward, scrubber, speed, MLA/MHA toggle, per-step caption, running count of numbers cached. requestAnimationFrame only while on screen (IntersectionObserver) and the page is visible; starts paused in step mode under prefers-reduced-motion. `#mlx[data-frames]` counts animated frames, for tests.
- 1 October 2026: the Compute across generations, One day of inference, Price history and Training bill tabs were removed (parts 06, 16, 17); the facts the Reading text needs from them ($5.576M and its hour breakdown, R1's $294K, SemiAnalysis's capex estimate, the $87,072 cost against $562,027 theoretical revenue behind the 545%, the 3.8x token-price against 2.5x per-task gap) now sit in the Reading text, and the config diff note carries the FLOPs formulas.
- Maths is MathML; no network, CDN or web fonts; colours are CSS variables with a dark scheme; tab choice is stored in localStorage under `ds-tab`, wrapped in try/catch.
- `coverage.json`: every fact, number, mechanism step, caveat and link in `live.md` with where the HTML carries it, plus the one correction and the additions.
- `live.md` / `live_before_delete.md`: the page text as fetched on 1 October 2026.
