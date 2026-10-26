# How this page was built

A topic child, split on 2026-10-26 from Part 3 ("Reading llama.cpp") of the C++ page (now "C++: the essentials"), following the language split plan (section 2, child 4).

## Source
- `build.sh`, `parts/01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (storage key `rlc-tab`) from the explainer-page templates.
- `cl/`: the measurement folder, copied with `cp -R` from the C++ page's `src/cl/` (scripts, recorded outputs, `gen_data.py`, checks). `cl/gen_data.py` writes `parts/50_js_cl_0data.js`, byte-identical to the C++ page's copy (checked). The check scripts now find the repository with `git rev-parse --show-toplevel` and open this page's two tabs. See `cl/README.md`.
- `parts/50_js_cl_1core.js`, `51_js_cl_read.js`, `52_js_cl_tour.js`, `53_js_cl_quant.js`, `54_js_cl_run.js` copied from the C++ page and retargeted from the four Part 3 tabs to the Reading tab (links to Part 1 and Part 2 sections now go to the sibling pages; a link into a closed block opens it; charts redraw when their block opens). `55_js_rlc_hero.js` is new. The prose parts `20_read_*.html` were rewritten from `50_tab_cl_read_*.html` and the three lab tabs.

## Shape and departures
- Core idea, hero (one token down the layers, with what was counted at each), "You need" (the essentials page and the three C++ siblings; the inference, local-inference and quantisation pages for what the code computes), new terms, then thirteen sections in the order a token travels, each keeping one key excerpt in the core and the rest of the source, logs and raw outputs in closed blocks.
- Lab tabs moved inline: the Code tour is section 13's stepper, Quant blocks a closed block in section 10, Run it the closed block "How this was run". None is a multi-control tool used across the page, so none stays a tab.
- The "In one screen" table moved into a closed block: the hero carries the path, and the table is a per-section index of files and features.
- The old "Mistakes" section became one closed list of habits, each pointing at the section that shows it; restating entries were dropped as fat.
- Owners linked rather than re-taught: Local and on-device inference (what GGUF holds, mapping against reading measured, the GGUF quantisation types and the k-quant block, llama-server's options and slots), Quantization and precision (why quantise, accuracy), Virtual memory (mmap), Batching, KV cache and scheduling (the KV cache, continuous batching), Long context (cache growth), Sampling and decoding (sampler rules), Performance math (the decode bound and the roofline), the CUDA topic (ggml-cuda), C++: the machine underneath (cache lines, SIMD, memory order, the ABI, the mmap measurement).

## Length judgement
Before (Part 3 of the C++ page, audit 2026-10-26): Reading 60.9 min core plus 1.1 closed, plus 8.5 min across three lab tabs (Code tour 1.0, Quant blocks 2.8, Run it 4.7); 4 visuals inline in the Reading. After: Reading 32.6 min core plus 35.6 closed, Further reading 1.2; 7 visuals inline (hero, repository map, stride views, graph of one token, chunk animation, threads chart, code tour), 55 controls. The core counts about 1,040 words of code listings (the subject of a code-reading page, scanned rather than read), about 780 words of tables (the default graph view of layer 0 is 31 rows), and about 480 words of hidden predict-then-reveal answers; the prose alone is about 23 minutes. The plan estimated 20 minutes; the difference is the code and tables, which cannot leave the core of a page whose subject is reading code without losing the point. Every source excerpt beyond one per section, every raw log, the GGUF reader, the quantiser stepper and every benchmark sample sit in closed blocks.

## Ledgers
- `ledger.json`: this page, 252 units (192 core, 60 depth), `python3 html_utils/ledger.py check` problems 0.
- `from_master.json`: the 275 units of the C++ page's master ledger in the old Part 3 tabs (`t-cl-*`): 256 owned here, 5 Local and on-device inference (the Q4_K block, k-quants and importance matrices), 1 C++: the machine underneath (`llama_mmap`'s call), 13 fat (Part 1/Part 2 navigation, tab descriptions, "Two lessons" style wind-ups, the section 13 list now carried by the code tour).

## Checks
`sh html_utils/checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `cl/check/check_embed.py` OK (the pinned clone was not present in this session, so excerpts were checked against `cl/out/excerpts.json`); `cl/check/check_ui.mjs` problems 0.
