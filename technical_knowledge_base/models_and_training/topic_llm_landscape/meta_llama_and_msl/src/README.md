# Meta: Llama and Meta Superintelligence Labs, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `ml-tab`). Rebuilt by editing only: no new runs; every number keeps its source, and the few new ones are derived with their formula.

## Build and checks (current)
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
