# Meta: Llama and Meta Superintelligence Labs, interactive page (v5, 2026-11-10: split layout and three 3D stages; rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `ml-tab`). Rebuilt by editing only: no new runs; every number keeps its source, and the few new ones are derived with their formula.

## Build and checks (as of 2026-10-24; the 2026-11-10 section at the end supersedes it where they differ)
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `01_css`, `01b_css` (page additions, including the 2026-10-24 classes `.core`, `.terms`, `.hero`, `details.dp`, `figure.im`), `02_header`, `03_read_a` (core idea, hero, you need, terms, the trades table, the Llama era), `04_read_b` (overtraining with the LLaMA figure, the animation and the explorer; the Llama 3 report table; Inside Llama 4), `05_read_c` (Muse era with the layer-pattern figure, agent security, the dated lineup, which model, mistakes), `06_tabs` (Parameters and fit), `07_more`; then the error box and one script per JS part: `10_js_common`, `11a_data` (model configs, `params()`, lineage events), `11_js_read` (Llama 4 layer strip), `12_js_ot`, `13_js_agent`, `14_js_line` (hero), `15_js_fit`, `16_js_explore`, `17_js_figs` (layer pattern), `99_js_tabs` (skill template).
- The header reading time comes from `rt.json`: after editing text run `node html_utils/audit_pages.mjs <out.jsonl> <page>` and update it (230 words a minute, core and closed details apart).
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root): every button, select, slider, details and lineage dot in 390 px dark and 920 px light, both animations stepped in both modes, and a check that neither animation moves before a click (also under reduced motion).
- `python3 recompute.py` recomputes every reproduced default; `python3 html_utils/ledger.py check <page>` checks the knowledge ledger.
- Images: `../img/` (WebP), credited in `../img/CREDITS.md`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (each line is a trade of where a cost or a risk sits), the hero (the release timeline, moved from its own Lineage tab into Reading because the order of eras is the story; era bands added; the per-event cards are a closed "Release notes" block that a dot click opens), "You need", condensed terms, and a four-row table of the trades with links to their sections.
- **Llama era**: one paragraph per generation; benchmark detail, the LMArena episode, the Scale AI deal and the departures moved to closed blocks.
- **Overtraining**: concrete numbers first, then a real image (LLaMA Figure 1, CC BY 4.0: every loss curve still falling where training stopped), then the formulas in one block, then the animation (no longer autoplays; waits on step one with a prediction prompt). The five-step worked example became one paragraph. The 402B non-reproduction is a closed block linking the paper page's refit. The Overtraining explorer moved from its tab into the section it proves; the loss law and fits are a closed block.
- **Training reports**: the six-card grid became a table of Meta's choice and its number, each row linking the owner of the mechanism. The 405B mesh widget and the interruption bars were removed: the Llama 3 Herd paper page owns them (its "Run the 16K-GPU job" and "The paper's tables, rebuilt" tabs). The two derived Table 5 checks (76.6% and 85.0% groupings, the 35.3% misprint) are kept in a closed block.
- **Correction**: "early fusion" was described as the alternative to a vision encoder; Llama 4 does use a separately trained MetaCLIP-based encoder whose tokens enter the backbone from the first layer. Fixed, with a link to Native multimodal models, which sorts out the term.
- **Inside Llama 4**: kept (layer strip and config rebuild); prose condensed; RoPE and NoPE linked to Positional Encodings; cache sizing linked to the Long context calculator.
- **Muse era** (new section from the old lineage cards): the design choice of each model (Spark's rebuilt stack, Glimmer's distillation and 3:1 layer rhythm, Wonder's API/agent split, Spark Open's architecture and licence). New static figure: one repeating unit of four layers in Llama 3, Llama 4 and Glimmer (from the configs). Deployment numbers, Meta's benchmark tables and Real-SWE are closed blocks.
- **Agent security**: the animation moved above the parts list and no longer autoplays; the list is one line per part, with Meta's verbatim quotes, kernel mechanisms and grant types in a closed block.
- **Scores and lineup**: the 44-run Artificial Analysis scatter (all labs) was removed: cross-provider comparison belongs to the landscape root, which carries the v4.3 picture. One dated volatile table now holds Meta's models with weights, licence, price, index score and cost per task; release-time numbers, index versions and other labs' scores are a closed block.
- **Mistakes**: one closed block.
- **Tabs**: Reading, Parameters and fit (renamed from Run it yourself; a tool across all seven open Meta models), Further reading. Lineage and Overtraining explorer tabs are gone (moved inline).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 33.4 min (7,674 words) | 25.5 min (5,876 words) |
| Reading, closed details | 1.5 min | 13.2 min |
| Other tabs | 10.4 min (Lineage 3.6, Run it yourself 2.3, Overtraining explorer 2.3, Further reading 2.2) | 4.9 min (Parameters and fit 2.3, Further reading 2.6) |
| Visuals inline in Reading (audit count) | 3 | 7 (hero timeline, LLaMA loss figure, overtraining animation, two explorer charts, layer pattern, agent animation) plus the Llama 4 layer strip |

Why about 25 minutes is right: the page carries two eras with different reasons to matter (the overtraining bet with Meta's own numbers, the Llama 3 report, Llama 4's architecture; then four Muse models and the agent's security design, which no other page teaches). What is left in the core is Meta-specific choices and the evidence for them; mechanisms owned elsewhere are a sentence and a link, and volatile numbers sit in one dated table or closed blocks.

## Knowledge ledger
273 units: core 177, depth 40, volatile 22, owned 3, fat 31 (`ledger.py check`: problems 0). 262 drafted by `ledger.py init` from the old page, 11 added by hand for script-drawn content (removed mesh and interruption widgets, the removed index scatter, the new image and figure, the explorer and layer-strip reproductions). Owned: the Table 4 meshes and MFU recomputation by the Llama 3 Herd paper page; the cross-provider index scatter by the landscape root.

## Sources and supporting files
- `inputs/`: saved sources (Llama 1/2/3 papers, Sardana, configs, the Glimmer card, `modeling_llama4.py`).
- `viz_ideas.md`: scored candidates and rejections.

2026-10-26 (final follow-up sweep): the closed Two checks on Table 5 block moved to the Llama 3 paper page (Keeping it running); one sentence and a link remain; ledger units 267 and 268 owned:whats_new/papers/llama_3_herd.

## 2026-11-10: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01b_css.html` in `build.sh`), `25_js_s3.js` (renderer v2), `99_js_tabs.js` (key `ml-tab`). The page has no `21_js_rd_common.js`: its one 2D animation keeps its own controller (`12_js_ot.js`), given the motion rules. `build.sh` keeps its explicit part lists (new: `25_js_s3.js`, `41_js_sc_ot.js`, `42_js_sc_l4.js`, `43_js_sc_ag.js`; removed: `13_js_agent.js`, deleted) and writes its em-dash test as bytes.
- **Data**: `11a_data.js` gains `OT` (training tokens and parameters per Llama model, each from the paper or card the page already cites) and `CHIN` (20). The Llama 4 stage reads `MODELS`, `params()` and `kvBytes()` there, the same functions as the Parameters and fit tab. `check_stages.mjs` recomputes every number in the step lists from them.
- **Fig. 2 `stg-ot`** (6 steps): the overtraining bet as columns of tokens per parameter on a log height (one storey per factor of ten) against a teal glass plane at the compute-optimal 20; generations left to right, models in depth; tokens flow into each column while its step is about it; Llama 4 per active parameter with per stored parameter as glass beside it (derived); Meta's own 402B forecast marked on the 405B; a ruler glides with the camera at the right edge of each view.
- **Fig. 3 `stg-l4`** (5 steps): Maverick's tower from config.json, each layer an attention slab under an FFN slab; one MoE layer exploded (128 experts on a glass plate, the shared expert, one routed expert lit, a token's flows) beside one dense block of two experts' width; Scout beside it; iRoPE's 12 global layers; then, from the side, the keys each layer keeps for a token at position 65,536 (an illustrative position) as rods behind it, global eight chunks long, chunked one. It replaces the 2D layer strip; the position slider, stats and parameter table stay as a 2D widget in their own split.
- **Fig. 4 `stg-ag`** (7 steps, two designs): the per-user VM as a glass case, the runtime cell (tinted) inside it with the agent and browser, the four services outside the cell, Sentinel at the VM's edge, the app and the two sites outside; flows along each request; the Muse/naive toggle swaps the step list and replays (`S3.stage(...).list`). It replaces the 2D animation (`13_js_agent.js`); its 14 captions became the step lists `sx-ag-muse` and `sx-ag-naive`. The task, page, attacker and token strings remain illustrative, as before.
- **2D animation `#ot`** (one budget, two shapes): the caption box is gone; its text is two `ol.sx` lists (`sx-ot-meta`, `sx-ot-chin`, one shown per mode) with the numbers written out. Motion rules: plays once half in view, pauses off screen, stops for good on any reader control or at the last step, a mode toggle restarts and replays, never moves under reduced motion; `data-playing` while it plays.
- **Splits** (text left, visual right): top (core idea, You need, terms beside the hero timeline; the trades table and release notes full width below), overtraining (Fig. 2), why keep going (the LLaMA figure), one budget (the 2D animation), the explorer, Inside Llama 4 (Fig. 3), the position widget, Muse Glimmer (the layer-pattern figure), agent security (Fig. 4). Full width: the Llama era, training reports, Llama 4's training choices, the other Muse models, lineup (volatile, unchanged), which model when, the Parameters and fit tab (a tool) and Further reading.
- Text changes: the six-part list of the agent's design became one sentence beside Fig. 4 (the step lists and the closed "Each part in Meta's words" block carry the detail); the Llama 4 config paragraph shortened where Fig. 3's steps now say it; the hero is drawn at the measured column width.
- Checks: `check_stages.mjs` (new; from the repo root with a shots dir outside the repo): three stages and `#ot` play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; the agent toggle and `#ot` modes replay; splits two columns at 1400 px and one below 1100; about 40 numbers in the step lists against the data. `check_controls.mjs`: its never-autoplay assertion inverted (now: each plays in view, none moves under reduced motion), 1400 px added, step-list items clicked, the remembered tab cleared between passes.
- Real images: unchanged (LLaMA Figure 1). Nothing new was found that shows something the page does not (Meta's architecture figures carry no reuse licence).

### Length judgement (2026-11-10)
| | Before (audit 2026-11-10, before this pass) | After |
|---|---|---|
| Reading, core | 5,947 words, 25.9 min | 7,260 words, 31.6 min |
| Reading, closed details | 2,958 words, 12.9 min | unchanged |
| Parameters and fit / Further reading | 2.3 / 2.8 min | unchanged |
| Visuals inline in Reading (audit count) | 7 | 9 |

The added words are step lists (35 items). The agent's 14 and the area animation's 10 step texts were script-drawn captions the audit could not count; now they are static, and half of each pair is hidden until the reader switches mode (about 530 words, 2.3 min), so a first read is about 29 minutes. Fig. 2's list adds the per-model ratios that were only partly in prose; Fig. 3's adds the MoE and dense block sizes and the cache at one position. Where a list now carries a paragraph (the six parts, the config paragraph) the paragraph shrank. Nothing was cut.

### Knowledge ledger (2026-11-10; problems 0)
283 units: core 186, depth 38, volatile 23, owned 5, fat 31. Eight core units added for the new step lists (keys "143, 77, 42 and 21.5", "they are 367 and 55", "largest dense model stayed near it", "two experts' worth per layer", "17.2B for both", "4.1 GiB against 12.0 GiB", "a surrogate minted by authd", "Text in the context window has manufactured consent"). No key contains a reading time.
