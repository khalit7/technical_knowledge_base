# Visualisation ideas

The visuals built for Part 3 of the C++ page are listed, scored and with the rejected ones, in `cl/viz_ideas.md`. What changed when this became a child page (2026-10-26):

- **Hero added** (`parts/55_js_rlc_hero.js`): a static diagram of one decoded token going down six boxes (program, libllama, ggml, thread pool, matrix products, the kernel) and back up to the sampler, each with its file and the number counted there, all read from `window.CL`. Static because it is a structure the page then opens box by box; the process itself is the code tour.
- **Code tour** (was its own tab) moved inline into section 13 as the end-to-end stepper, prompt against next token (the before/after); the code excerpt of the current stop sits in a closed block under it. Its chips that pointed at Part 1 and Part 2 sections now link to the sibling pages.
- **Quant blocks** (was its own tab) moved into a closed block in section 10: the 34 real bytes and the Q8_0 and Q4_0 stepper. Closed because the quantisation concept and the best before/after block visual belong to Local and on-device inference (section 4, five types on one real block); this page keeps it as the check that the Python reproduces ggml's quantiser byte for byte. The Q4_K drawing to scale was dropped for that page's.
- **Run it** (was its own tab) moved into the closed block "How this was run": reproduce commands, one prompt three ways, the raw counters, every benchmark sample, versions.
- Inline as before: repository map (1), GGUF file to scale (4, now closed), stride views (6), graph of one token (7), chunk scheduler animation (9), threads chart (9), kernel call counts (10).

## 2026-11-07 (rollout)
- Built in 3D: the hero (layers as glass plates, token flowing), layer 0's graph (built then run), one Q8_0 block to the repack and the SDOT kernel, the KV cache stacks. All driven by `window.CL`.
- Kept 2D: repository map, stride grid, threads chart, GGUF file map, chunk scheduler (a timeline), code tour (a file map), tables.
- Rejected: a 3D GGUF file (a 1D layout gains nothing from depth); a 3D thread timeline (time reads best on a flat axis); a real image (the page is about code; no physical object to show).
