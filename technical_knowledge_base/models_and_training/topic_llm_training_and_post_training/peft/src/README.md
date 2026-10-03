Source of the interactive HTML on the Notion page "Parameter-Efficient Fine-Tuning (PEFT)" (deep-dive child of Topic: llm-training-and-post-training).

Build: `python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/recompute.json`), then `sh build.sh` (writes `../index.html`; `rtime.py` fills the reading time). Checks: `sh html_utils/checkpage.sh <page folder>` and, from the repo root, `node <page folder>/src/check_page.mjs` (every control in light 920 px and dark 390 px, card screenshots in `.shots/`, preset readouts).

Data scripts (outputs committed in `inputs/`, big inputs never):
- `delta_probe.py`: needs the two SmolLM2-135M `model.safetensors` files (base and Instruct, 269 MB each) downloaded to a scratch folder; `uv run --no-project --with numpy python delta_probe.py <base> <instruct>` writes `inputs/delta_probe.json`.
- `peft_counts.py`: `uv run --no-project --with torch --with transformers --with peft --with accelerate python peft_counts.py` writes `inputs/peft_counts.json` (the PEFT library's own trainable counts, empty models from `inputs/configs.json`).
- `inputs/biderman2024_tables.txt`, `inputs/slora_tables.txt`: tables cut from the arXiv HTML pages; `inputs/abstracts.txt`: arXiv abstracts of the method papers; `inputs/research_notes.md`: the other verified quotes with URLs.
- `live.md` is the old Notion page (fetched 2026-10-03, last edited 2026-09-22); `coverage.json` maps every fact in it.

Shape: built from the brief (no method file for deep-dive child pages), like the Alignment sibling. Reading tab by question (why, the methods, LoRA on a real matrix, how low a real update is, which matrices, against full fine-tuning, QLoRA, DoRA, serving, choosing, mistakes), one tab (Trainable parameters), Further reading. Departures from the caller's candidate list: no DoRA magnitude/direction scatter on real data (the paper's measure needs training checkpoints; see `viz_ideas.md`); the DoRA animation is a labelled 2-D illustration.

Parts: `01_head.html`, `02_css.html`, `10_header.html`, `20_read_a/b/c.html` (Reading), `30_tab_count.html` + `30_js_count.js`, `39_tab_more.html`; JS `20_js_data.js` (generated), `21_js_common.js` (the parent's RD.anim controller, copied), `22_js_mx.js` (matrix animation; also defines the PF helpers), `23_js_hm.js` (heatmap), `24_js_bd.js` (Biderman chart), `25_js_dr.js` (DoRA), `26_js_sl.js` (S-LoRA), `99_js_tabs.js`.
