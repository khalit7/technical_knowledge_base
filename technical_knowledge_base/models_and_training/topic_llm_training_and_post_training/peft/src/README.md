Source of the interactive HTML on the Notion page "Parameter-Efficient Fine-Tuning (PEFT)" (deep-dive child of Topic: llm-training-and-post-training).

Build: `python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/recompute.json`), then `sh build.sh` (writes `../index.html`). The header's reading time is written by hand in `parts/10_header.html` from `node html_utils/audit_pages.mjs` (230 words a minute, closed details apart). Checks: `sh html_utils/checkpage.sh <page folder>` and, from the repo root, `node <page folder>/src/check_page.mjs` (every control in light 920 px and dark 390 px under reduced motion, a nothing-moves check under reduced motion, card screenshots in `.shots/`, preset and memory readouts). `python3 html_utils/ledger.py check <page folder>` checks the knowledge ledger `ledger.json`.

Data scripts (outputs committed in `inputs/`, big inputs never):
- `delta_probe.py`: needs the two SmolLM2-135M `model.safetensors` files (base and Instruct, 269 MB each) downloaded to a scratch folder; `uv run --no-project --with numpy python delta_probe.py <base> <instruct>` writes `inputs/delta_probe.json`.
- `peft_counts.py`: `uv run --no-project --with torch --with transformers --with peft --with accelerate python peft_counts.py` writes `inputs/peft_counts.json` (the PEFT library's own trainable counts, empty models from `inputs/configs.json`).
- `inputs/biderman2024_tables.txt`, `inputs/slora_tables.txt`: tables cut from the arXiv HTML pages; `inputs/abstracts.txt`: arXiv abstracts of the method papers; `inputs/research_notes.md`: the other verified quotes with URLs.
- `live.md` is the old Notion page (fetched 2026-10-03, last edited 2026-09-22); `coverage.json` maps every fact in it.

Parts (2026-11-10): `01_head.html`, `02_css.html`, `02_split.html` (template), `10_header.html`, `20_read_a/b/c.html` (Reading), `30_tab_count.html` + `30_js_count.js`, `39_tab_more.html`; JS `20_js_data.js` (generated), `21_js_rd_common.js` (template: plays once in view), `22_js_pf.js` (the PF helpers), `23_js_hm.js` (heatmap), `24_js_bd.js` (Biderman chart, static), `25_js_s3.js` (renderer v2, template), `26_js_dr.js` (DoRA, RD.anim with a step list), `26_js_sl.js` (S-LoRA bars), `27_js_hero.js` (hero), scenes `28_js_sc_lora.js`, `28_js_sc_sv.js`, `28_js_sc_where.js`, `28_js_sc_mem.js`, `28_js_sc_serve.js`, `99_js_tabs.js` (template, storage key `peft-tab`). Checks also: `node <page folder>/src/check_stages.mjs [shots dir]` (the stages and the DoRA figure: autoplay, step lists, last steps, off-screen and reduced-motion stillness, splits, the step lists' static numbers against the data, independent recomputes).

## The 2026-10-23 rebuild to the teaching contract
- **Top**: the core idea in one sentence; a hero figure (one Llama 3 8B query matrix to scale, full fine-tuning against LoRA, with a rank control and counters); the three gains with their numbers (the old "Why PEFT" section, condensed); "You need"; new terms.
- **New visuals inline**: where each method attaches to a decoder block (static annotated HTML diagram, in "The methods"); the per-matrix share of an all-linear adapter on Llama 3 8B (static, to scale, in "Which matrices"); a **memory calculator** for full fine-tuning, LoRA and QLoRA from real configs (7 models including LLaMA 65B, rank as the variable, 24/48/80 GB lines) in a new "Memory and QLoRA" section that absorbs the QLoRA section. OWNERS.md gives this page the memory arithmetic, so the calculator now lives here; its formulas are in `recompute.py` `mem()`, with checks against Biderman Table S14, QLoRA's "more than 780 GB" (reproduces at 12 bytes per parameter) and QLoRA Figure 6's 37,074 MB model (does not reproduce: 34.46 GB from 4.127-bit arithmetic, shown on the page).
- **No autoplay** (superseded 2026-11-10: animations now play once in view): the template controller; the mode toggles of the matrix, Biderman and DoRA animations no longer start playback. `check_page.mjs` asserts every animation is still on step 1 after scrolling past it.
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


## 2026-11-10: the split layout and five 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (in `build.sh` after `02_css.html`), `25_js_s3.js`, `21_js_rd_common.js` (it already carries the page's old extras: `onResize`, `svg`, `t`, `seg`, the nav highlight), `99_js_tabs.js` (key `peft-tab`). `build.sh` now writes the em-dash test as `ED=$(printf ...)` and expands `{{text|#s-...}}` as in-page links (before, `#s-mem` and the like opened as external links).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero, 2D drawn to scale with a rank control (Fig. 1) | no |
| Reading | The methods | split, then the table full width | where each method attaches, static HTML diagram | no |
| Reading | LoRA on one real matrix | split | **3D** `stg-lora` (Fig. 2), rank chips | yes, 5 |
| Reading | How low is a real update | split | **3D** `stg-sv` (Fig. 3) | yes, 5 |
| Reading | (all 210 matrices) | split | heatmap and table, 2D | no |
| Reading | Which matrices | split | **3D** `stg-where` (Fig. 4) | yes, 5 |
| Reading | Memory | split | **3D** `stg-mem` (Fig. 5), model and rank selects | yes, 5 |
| Reading | QLoRA's pieces, merging | full width | none | no |
| Reading | Against full fine-tuning (Biderman) | split | learn-forget paths, 2D static with a toggle (Fig. 6) | no |
| Reading | LoRA without regret | full width | none | no |
| Reading | DoRA | split | 2D `RD.anim` (Fig. 7), both paths on one plot | yes, 4 |
| Reading | Serving many adapters | split | **3D** `stg-serve` (Fig. 8) | yes, 5 |
| Reading | (S-LoRA numbers) | split | S-LoRA Table 3 bars, 2D | no |
| Reading | Choosing | full width | table | no |
| Trainable parameters | all | full width | reader-driven calculator | no |

**Stages and their data.** `stg-lora`: `PF_DATA.show` from `delta_probe.py` (the top-left 16 x 16 of W0, of the real update and of its best rank-1/4/16/64 approximations, as signed bars on glass plates; A and B to scale; x streaming through both paths, gradients streaming back into A and B only; the real update behind the rank-r copy; the merge). `stg-sv`: the 576 singular values of that update (`show.sv`), heights sigma squared, lit to rank 1, 16, 64 and the 90% rank (198). `stg-where`: Llama 3 8B's seven matrices to scale from its config, the adapter column r(d_in + d_out) in front of each, lit per target set (q and v 16%, attention 32.5%, all 41.9M with the MLP 67.5%, attention at 2.08 times the rank matching MLP-only). `stg-mem`: the formulas of the old calculator (`recompute.py` `mem()`) as stacked slabs (Adam at the bottom, trained weights and gradients, then the frozen base, so a top face shows the base), 24/48/80 GB cards as planes; step 4 stretches the heights (said on the card) so the adapter is visible; the selects keep all seven models and five ranks. `stg-serve`: five illustrative requests and adapters, five merged copies against one shared base plus a small product each, the adapter pool and KV pages; throughputs from S-LoRA Table 3 (`PF_DATA.slora`). The scenes write their numbers into the step lists from the data; the static HTML carries the defaults (rank 16, Llama 3 8B) and `check_stages.mjs` fails if the two differ.

**Removed**: `22_js_mx.js` (the 2D heatmap animation with its LoRA / full toggle and six counters: the stage's step 4 is the before/after, and its counters became one sentence and the step text; the PF helpers moved to `22_js_pf.js`), `28_js_mem.js` (2D bars, now the stage), the share-per-matrix strip `#wm` (now the stage, its caption kept), the S-LoRA 2D diagram (now the stage), the Biderman stepper (now a static chart: the whole path of each run is the point, and eight checkpoints per mode would have needed four step lists), the DoRA LoRA / DoRA toggle (both paths on one plot, four steps).

**Kept 2D**: the hero (a drawn-to-scale comparison with a rank control; to scale, A and B are under 1% of the square, which a perspective view would lose), the methods diagram (structure, flat), the heatmap and table (a heatmap), the Biderman paths (a scatter), DoRA (an angle and a length in one plane), the S-LoRA bars and the tables.

**Length**: Reading core 5,110 words (22.2 min) before, 5,992 (26.1 min) after; closed 519 (2.3 min) unchanged; Trainable parameters 715 (3.1 min) and Further reading 569 unchanged. The growth is the step lists (about 900 words): the old animations wrote their step captions by script, invisible to the audit; they are now static text on the left, and no per-step caption repeats them. Two paragraphs that the steps now carry were cut (the serving intro and the memory intro shortened, the rank-16 counters sentence reduced). Why about 26 minutes is right: as before, the ledger is almost all core (171 core against 23 depth), the page owns LoRA's mechanism, rank, which matrices, the memory arithmetic, QLoRA, the evidence against full fine-tuning, DoRA and multi-LoRA, and each now has its picture with its steps spelled out.

**Ledger**: 223 units, core 171, depth 23, fat 27, owned 2, problems 0 (5 units added by hand for the stages' step lists; keys 44, 48 and 51 re-keyed for the new captions; no key contained a reading time).
