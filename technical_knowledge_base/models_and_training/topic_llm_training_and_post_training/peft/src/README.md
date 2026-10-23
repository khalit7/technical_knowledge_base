Source of the interactive HTML on the Notion page "Parameter-Efficient Fine-Tuning (PEFT)" (deep-dive child of Topic: llm-training-and-post-training).

Build: `python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/recompute.json`), then `sh build.sh` (writes `../index.html`). The header's reading time is written by hand in `parts/10_header.html` from `node html_utils/audit_pages.mjs` (230 words a minute, closed details apart). Checks: `sh html_utils/checkpage.sh <page folder>` and, from the repo root, `node <page folder>/src/check_page.mjs` (every control in light 920 px and dark 390 px under reduced motion, a no-autoplay check on each animation, card screenshots in `.shots/`, preset and memory readouts). `python3 html_utils/ledger.py check <page folder>` checks the knowledge ledger `ledger.json`.

Data scripts (outputs committed in `inputs/`, big inputs never):
- `delta_probe.py`: needs the two SmolLM2-135M `model.safetensors` files (base and Instruct, 269 MB each) downloaded to a scratch folder; `uv run --no-project --with numpy python delta_probe.py <base> <instruct>` writes `inputs/delta_probe.json`.
- `peft_counts.py`: `uv run --no-project --with torch --with transformers --with peft --with accelerate python peft_counts.py` writes `inputs/peft_counts.json` (the PEFT library's own trainable counts, empty models from `inputs/configs.json`).
- `inputs/biderman2024_tables.txt`, `inputs/slora_tables.txt`: tables cut from the arXiv HTML pages; `inputs/abstracts.txt`: arXiv abstracts of the method papers; `inputs/research_notes.md`: the other verified quotes with URLs.
- `live.md` is the old Notion page (fetched 2026-10-03, last edited 2026-09-22); `coverage.json` maps every fact in it.

Parts: `01_head.html`, `02_css.html`, `10_header.html`, `20_read_a/b/c.html` (Reading), `30_tab_count.html` + `30_js_count.js`, `39_tab_more.html`; JS `20_js_data.js` (generated), `21_js_rd_common.js` (the skill template: never autoplays), `22_js_mx.js` (matrix animation; also defines the PF helpers), `23_js_hm.js` (heatmap), `24_js_bd.js` (Biderman chart), `25_js_dr.js` (DoRA), `26_js_sl.js` (S-LoRA), `27_js_hero.js` (hero), `28_js_mem.js` (memory calculator), `99_js_tabs.js` (template, storage key `peft-tab`).

## The 2026-10-23 rebuild to the teaching contract
- **Top**: the core idea in one sentence; a hero figure (one Llama 3 8B query matrix to scale, full fine-tuning against LoRA, with a rank control and counters); the three gains with their numbers (the old "Why PEFT" section, condensed); "You need"; new terms.
- **New visuals inline**: where each method attaches to a decoder block (static annotated HTML diagram, in "The methods"); the per-matrix share of an all-linear adapter on Llama 3 8B (static, to scale, in "Which matrices"); a **memory calculator** for full fine-tuning, LoRA and QLoRA from real configs (7 models including LLaMA 65B, rank as the variable, 24/48/80 GB lines) in a new "Memory and QLoRA" section that absorbs the QLoRA section. OWNERS.md gives this page the memory arithmetic, so the calculator now lives here; its formulas are in `recompute.py` `mem()`, with checks against Biderman Table S14, QLoRA's "more than 780 GB" (reproduces at 12 bytes per parameter) and QLoRA Figure 6's 37,074 MB model (does not reproduce: 34.46 GB from 4.127-bit arithmetic, shown on the page).
- **No autoplay**: the template controller; the mode toggles of the matrix, Biderman and DoRA animations no longer start playback. `check_page.mjs` asserts every animation is still on step 1 after scrolling past it.
- **Predict prompts** before the matrix animation, the Biderman chart and the memory calculator.
- **Moved to closed blocks**: the families one by one with their papers; loralib's initialisation and LoRA+; the Postgres worked instance and its correction; LoRA in products (Apple, Tinker).
- **Deleted as fat**: wind-ups, the pointer to the parent's calculator, and the Common mistakes list (each mistake restated its section; the two lines that added something, "a LoRA that doesn't learn is often under-stepped" and "evaluate the merged model", moved into their sections).
- **Linked instead of taught**: Punica's 12 times and 2 ms (owned by LLM serving in production, which carries them); NF4's construction (QLoRA paper page, Quantization and Precision).
- The Trainable parameters tab stays a tab: it is a tool used from five sections (methods, matrices, RL capacity, DoRA, Which matrices).

## Length judgement
| | Before | After |
|---|---|---|
| Reading core (audit_pages.mjs, 230 wpm) | 4,919 words, 21.4 min | 5,070 words, 22.0 min |
| Reading in closed details | 201 words, 0.9 min | 519 words, 2.3 min |
| Trainable parameters tab | 713 words, 3.1 min | 715 words, 3.1 min |
| Further reading | 528 words | 528 words |
| Visuals inline in Reading (audit count) | 9 | 10 (plus two static HTML diagrams) |

Why about 22 minutes is right: this is the owner of a central subject (LoRA's mechanism, rank and alpha, which matrices, memory, QLoRA, the evidence against full fine-tuning, DoRA, merging and multi-LoRA), and the ledger is almost all core (167 core against 23 depth). The core grew by half a minute although the hero, three new visuals and the memory section were added, because the "Why PEFT" prose, the mistakes list and the family chronicle were condensed or closed. Nothing important was cut: `ledger.py check` finds every non-fat unit.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
218 units: core 167, depth 23, fat 27, owned 1 (Punica, owned by `systems_and_performance/topic_inference_and_serving/llm_serving_in_production`). 213 drafted by `ledger.py init`, 5 added by hand for script-drawn visuals (hero, memory calculator) and their checks. Fat units carry a `note`.

Shape: built from the brief (no method file for deep-dive child pages), like the Alignment sibling. (Before 2026-10-23) Reading tab by question (why, the methods, LoRA on a real matrix, how low a real update is, which matrices, against full fine-tuning, QLoRA, DoRA, serving, choosing, mistakes), one tab (Trainable parameters), Further reading. Departures from the caller's candidate list: no DoRA magnitude/direction scatter on real data (the paper's measure needs training checkpoints; see `viz_ideas.md`); the DoRA animation is a labelled 2-D illustration.

