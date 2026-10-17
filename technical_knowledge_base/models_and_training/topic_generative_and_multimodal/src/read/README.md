# src/read: the Reading and Further reading tabs

Parts: `parts/20_read.html` (tab wrapper, CSS, section nav), `20_read_a.html` to `20_read_f.html` (sections 0 to 10, mistakes, interview questions, child pages), `20_read_z.html` (closes the tab), `22_js_rd_data.js` (generated), `23_js_rd_drills.js`, `24_js_rd_gen.js` (section 1 animation), `25_js_rd_cost.js` (section 10 calculator), `39_tab_more.html` (Further reading). `21_js_rd_common.js` is the shared helper (not edited here).

Files here:
- `make_read_data.py`: writes `read_data.json` (the embedded Fashion-MNIST image and the lab numbers) and regenerates `parts/22_js_rd_data.js`. `python3 make_read_data.py <fashion-mnist raw folder>` the first time; `python3 make_read_data.py --js` after editing `lab` in the JSON.
- `todo.md`: lab numbers still to fill, by key. `coverage.md`: the old Notion page check, pending (Notion disconnected).
- `fid_bias.py` and `fid_bias.out`: the FID small-sample demonstration shown under Common mistakes (run with the topic venv's Python, CPU).
- `check_read.mjs`: clicks every control at 390 px dark and 920 px light, checks errors, NaN, sideways scroll, measures reading time. `node check_read.mjs <shots dir>`.
- `check_data.py`: checks that the built page embeds exactly `read_data.json` and that every lab number in it matches `src/data/smoke/*.json`, and that the FID demo output is pasted verbatim.
- `facts.md`: facts verified for these tabs (also in the topic's shared facts file). `viz_ideas.md`: visuals built and rejected.

Shape: `.claude/skills/explainer-page/page-kinds/topic-root.md` (root: comparisons and definitions, one or two visuals per idea, depth on the children), organised by the topic's own order from zero (families, latents, diffusion and flow, the text-to-image system, vision encoders, VLMs, native multimodal, video and audio, evaluation, choosing) rather than by axes, because Khalid asked to be taught this topic from zero and the axes (passes per sample, training signal, likelihood) only make sense once the families are known; section 0's table gives the axes up front.
