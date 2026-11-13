# src: End-to-End Context Compression at Scale (Latent Context Language Models, arXiv 2606.09659)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py` and `mk_paper.py` first). Then:
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page.
- `node src/check_page.mjs [shots dir]` from the repo root: every control and the animation in both themes and widths (puppeteer with `headless: 'shell'`), the animation playing once in view, nothing moving under reduced motion.
- `node src/check_stages.mjs [shots dir]` from the repo root: the 3D stage and the Simulate animation at 1400 light, 920 light and 390 dark (autoplay, one list item per step, flows stopping off screen, a control stopping play, splits two columns at 1400), reduced motion, and every number in the stage's step list against the page's data (2026-11-13).
- `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/papers/latent_context_language_models` from the repo root.

Rebuilding the inputs (none of this is needed to build the page):
- `python3 extract_paper.py <arXiv HTML>`: `inputs/paper_v1.txt` and `inputs/tables_v1.txt` (v1 is the only version).
- `uv run --with pymupdf python decode_figs.py <e-print>/figs`: `inputs/figs.json`, the markers of Figures 1, 4 and 5 read from the vector PDFs and the printed loss call-outs of Figures 8 to 11 (commands in the docstring).
- `inputs/configs.json`: the released 16x checkpoint's decoder, encoder and adapter shapes (Hugging Face, fetched 2026-10-03).
- `train.py`: the abandoned toy LCLM (see below), kept so the pilots can be rerun; the page does not use it.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched (saved by `save_live.py` from the session transcript); its Takeaway softened on 2026-10-25 (below) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 1 to 4, 6, 7, 12, 16, 20, 26, 30 to 33 at printed precision (`mk_tables.py`) |
| `recompute.py` | every derived number and 46 checks against printed values (speed-ups, token sums, Table 4's weighted LongBench, score granularity, loss call-outs); writes `inputs/recompute.json` |
| `train.py` | the toy LCLM in its last pilot form (decoder pre-training plus the four stages of §4.2) |
| `model/pilot/` | the logs of the eight toy designs; the first line of each log is its configuration |

## Shape, and departures from .claude/skills/explainer-page/page-kinds/paper.md

- **The live ingredient is a simulation, not a toy model.** The paper is part systems (the claim is time and memory) and part architecture (the search). The "Simulate a long prompt" tab animates one prompt through an LCLM, through KV compression and through the uncompressed decoder, driven by the released configuration (KV bytes) and the paper's own measurements decoded from Figure 4 (time, memory); it carries the page's main correction (KV methods are slower than not compressing, so the 8.8x headline has a slow yardstick). A trained toy LCLM for the architecture claims was attempted in eight designs (from scratch as in §5, dense multi-question supervision, a smaller task, a wider model, a pre-trained toy decoder as in §4.2) and none learned key-value retrieval within the CPU budget, not even the decoder alone on raw context; shipping a model at chance would teach nothing, so the architecture claims are tested against the paper's own tables and loss call-outs instead (the claim table in Reading, the Tables tab). The logs are in `model/pilot/`; the page says so in a box on the simulation tab.
- **The figures are decoded, not transcribed.** Figures 1, 4 and 5 hold the only time and memory numbers; the e-print's vector PDFs give them exactly, and the check against Table 6 exposed that the 16x LCLM points of Figures 1 and 5 are not Table 6's model.
- **No "Then and now"**: a June 2026 result with no later lineage yet.
- **The Reading tab is long** (about 21 minutes, not counting details blocks and predict reveals; the old page was 9), because the evidence section has ten specific findings the old summary did not have, and the architecture claims needed a claim-by-claim table to show which survive at scale. The C.4 data-format rules sit in a details block; the predict widgets' details sit inside their reveals.
- KV cache sizes in the animation are computed for bf16 from the config; the "scores" and "eviction" rows of the KV pipeline are drawn generically (labelled illustrative), with FastKVzip's measured time.
- `build.sh` counts the reading time without details blocks and predict reveals (optional content); the Further reading total is summed from the resources.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence; a static hero figure (`parts/14_js_hero.js`): one 64K prompt at 4x through no compression, FastKVzip and the LCLM, decoder prefill work to scale, with Figure 4's measured times and memory (4.47 s and 35.4 GB, 5.19 s and 36.1 GB, 1.00 s and 17.4 GB); You need (Long context, Batching, KV cache and scheduling); New terms. The "One long prompt, two pipelines" section, a pointer to the simulation tab, folded into the hero caption.
- **Visuals moved inline**: the Figure 4 rebuild (time and memory against length) moved from the simulation tab into Results, beside the memory claim. The paper's own Figure 6 (CC BY 4.0, `img/fig6_agent.webp`, credited in `img/CREDITS.md`) sits beside the EXPAND agent, with a note that its accuracy axis starts at 60.
- **Owned elsewhere, now linked** (what this paper did kept here): KV cache sizing and eviction policies (Long context), what a paged engine can reclaim (Batching, KV cache and scheduling), RULER as a benchmark (Long-context and multimodal benchmarks), standard errors (Evaluation statistics).
- **Moved into closed blocks**: the adapter's equation and parameter count; the per-stage token accounting behind "350B tokens"; the authors' reading of why the bigger encoder and decoder did not pay off downstream; four narrower weaknesses (decoder-scaling loss not like for like, recipe claims without numbers, the GSM8K setup, the agent as a first attempt); Table 4's weighted LongBench column.
- **Never autoplays** (superseded on 2026-11-13, below): `makeAnim` waited on step 1 until the reader presses play or steps (also after a mode switch). `check_page.mjs` scrolls the animation into view and fails on any frame drawn before a click, clicks tabs through the DOM, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `lclm-tab`; `90_js_tabs.js` removed).
- **Takeaway softened** (`paper.json`, so the card, and `live.md`): "settles the design", "beats KV cache compression on the accuracy-versus-TTFT frontier by 5-9x", "works in vLLM and SGLang", "skims a compressed codebase" and "scaling the decoder helps loss more than scaling the encoder" overclaimed. The new line gives the search as single runs with loss gaps of 0.002 to 0.022, the speed-up as 4.7 to 8.8x against FastKVzip (itself slower than not compressing; 1.45x at 4K and 4.5x at 64K against no compression), the accuracy cost (about 2.6 RULER points at 4x; slower KV methods still more accurate on RULER at 4x and 8x), the vLLM path as two processes, and the agent as RULER needle tasks only (+17 to +20 points). The Notion property itself is Khalid's to change.
- **Length judgement**: Reading core 24 min before (5,506 words) and 24 after (5,628), plus 1 then 3 in closed details (`audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top (core sentence, hero, terms) and the inline Figure 4 added about 2 minutes; the moves into closed blocks took out about as much. The rest is core: the page's value is the evidence audit (slow yardstick, figure against appendix, claims that do not survive at scale) beside the method, which no other page carries. Other tabs: Simulate 2 min before, 1.5 after (Figure 4 moved out); Tables 6 and Further reading 2.4, unchanged.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 281 units; core 257, depth 19, owned 4, fat 1 (the old header line); `ledger.py check` problems 0.
- Source extracts: five author emails in `inputs/paper_v1.txt` replaced with "[email removed]" (no em-dashes were present); `extract_paper.py` now redacts emails and replaces em-dashes on extraction.

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, explained motion)

What changed and why:
- **Hero as a 3D stage** (`parts/31_js_sc_hero.js`, template `25_js_s3.js` unchanged; it replaces the static `14_js_hero.js`, removed). The same comparison as the old hero, one 64K prompt at 4x through no compression, FastKVzip and the LCLM, now as three rows in depth, every row to scale in positions: 16 white blocks of 4,096 tokens; glass plates for the 0.6B encoder, the adapter and the 4B decoder; green latent blocks a quarter of a token block long; the KV cache as a tower of slabs of 4,096 positions (16 slabs, 9.66 GB, against the LCLM's 4, 2.42 GB), so the memory saved is a height to scale; dots flow wherever tokens, latents or keys and values move. The KV row's eviction keeps one segment in four of each slab, a different one slab to slab (labelled illustrative), so no slab can be freed: masked, still allocated. The last step puts Figure 4's measured time and peak memory on plinths. Six steps, each explained in `ol#sx-hero` beside it; the camera moves in close on each row and on the results. Data: `rc.fig4` at 64K (decoded from the vector paths), `rc.models.kv_bytes_per_token`, Table 6 for the RULER cost. `check_stages.mjs` recomputes all 24 numbers the step list states.
- **Split layout** (template `02_split.html` unchanged): The paper tab: the core sentence and the stage's steps beside the stage (stage first in the DOM), Architecture beside the N/W/mask/pooling explorer, Results' memory paragraphs beside the Figure 4 rebuild (`s-res-mem`), the quality paragraph beside the Table 6 card (`s-res-q`), the agent section beside the paper's Figure 6. Problem, Training, the architecture search (the claim table), the frontier table, Scaling (`s-res-scale`), Why it matters, Connections, How much to believe and Using it have no visual of their own (predict widgets and tables) and stay full width. Simulate a long prompt: the intro and the step lists beside the animation card. Tables: Figures 1 and 5 beside their Try note and the Does not reproduce box; the other tables full width.
- **The Simulate animation explained and autoplaying**: its per-step captions moved from `13_js_read.js` into three step lists (`sx-capL`, `sx-capK`, `sx-capF`, one visible per mode), and the caption box under the figure became a one-line "Step k of n" status. `makeAnim` (`11_js_ui.js`) gained the motion rules of `RD.anim`: plays once at least half in view, pauses off screen, stops for good on any control or at its last step, never under reduced motion; a mode switch shows that mode's list and replays; `data-playing` on the card. Six, five and four steps: no long-replay rule applies. Step time 3.6 s (was 2.6) so a list item can be read.
- **Templates**: `99_js_tabs.js` (key `lclm-tab`; the old version's "open the next details block" for `data-to` was dropped, since no target is followed by one) and `05z_errbox.js.html` recopied; `21_js_rd_common.js` not used.
- **Results text**: the paragraph that introduced the Figure 4 chart repeated the memory paragraph; it is now a short pointer to what to look for in the chart beside it.
- `check_page.mjs`: the never-autoplay assertion inverted (the animation must play once in view) and a reduced-motion pass added. `label_ledger.py`: added units now take their label and key from its list on every run.

Kept 2D, and why: the Figure 4 rebuild and Figures 1 and 5 (curves and a scatter on log axes), the N/W explorer (which tokens a latent can see is a flat strip), the Simulate animation (a widget over every length and ratio with counters; the 3D hero covers one setting), the predict reveals' bars, every table, and the paper's Figure 6 (an image).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 24.5 min (5,628 words) | 25.6 min (5,894) |
| The paper, closed | 3.2 min (726) | 3.2 min (726) |
| Simulate a long prompt | 1.5 min (334) | 3.1 min (704) |
| Tables; Further reading | 6.1; 2.4 | unchanged |

The paper tab grew by the hero's six-step list (about 330 words) less the old hero caption and the repeated Figure 4 paragraph; the list carries what the static hero only showed, step by step, with its numbers. The Simulate tab's growth is the step captions moving from the script (which the audit cannot see) into the lists: what a reader reads there is the same. Nothing was cut. Header: "Reading: 26 min, plus 3 in closed details." Four pages quote this page's old "24 min" (`check_times.py`): `models_and_training/topic_llm_landscape`, `.../topic_llm_landscape/deepseek`, `systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling`, `agents_and_retrieval/topic_agentic_harnesses/context_engineering`.

Ledger: 283 units (core 259, depth 19, owned 4, fat 1); 2 added (the hero stage, the Simulate step lists); unit 275 (the hero's measured numbers) re-pointed to "4.47 s and 35.4 GB, 5.19 s and 36.1 GB, 1.00 s and 17.4 GB" in step 6. `ledger.py check`: problems 0.

## Checks (13 November 2026)
`checkpage.sh`: tabs 4, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems. `check_stages.mjs`: 0 problems (24 step-list numbers). `verify_layout.mjs`: problems 0. `mk_coverage.py`: 65 of 65. `ledger.py check`: problems 0.
