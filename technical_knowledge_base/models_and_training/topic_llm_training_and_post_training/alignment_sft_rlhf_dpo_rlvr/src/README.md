Source of the interactive HTML on the Notion page "Alignment: SFT, RLHF, DPO Family, RLVR" (deep-dive child of Topic: llm-training-and-post-training).

Build: `python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/derived.json`), then `sh build.sh` (writes `../index.html`; `rtime.py` fills the reading time). Checks: `sh html_utils/checkpage.sh <page folder>` and `node src/check_pair.mjs` (every control, JS toy against Python).

Data: `mk_lengths.py` (network; `uv run --no-project --with tokenizers python mk_lengths.py`) samples the Tulu 3 SFT mixture and tokenizes the example conversation; outputs in `inputs/`. `inputs/research_*.md` are the verified source notes (quotes and URLs) the prose was written from. `live.md` is the old Notion page; `coverage.json` maps every fact in it.

Shape: built from the brief, no method file for deep-dive child pages. Reading tab by stage (pipeline, SFT, packing, reward models, RL in brief, the DPO family, online or offline, RLVR, mistakes), one tab (Method family tree), Further reading. Departure from the candidate list: no RLVR/GRPO-variant animation, because RL for LLMs owns those algorithms and the DeepSeekMath page already animates and trains them (see `viz_ideas.md`).

Parts: `20_read_a/b/c.html` Reading; `30_tab_tree.html` + `30_js_tree.js`; `39_tab_more.html`; JS `21_js_common.js` (the parent's RD.anim controller, copied), `22_js_fill.js`, `23_js_mask.js`, `24_js_pack.js`, `25_js_pair.js`, `99_js_tabs.js`.
