# OpenAI: GPT family, interactive page (v4, rebuilt 2026-10-24 to the teaching contract; 2026-11-10 split layout and three 3D stages)

Child page of Topic: llm-landscape (storage key `og-tab`). Current structure: the 2026-11-10 section below, which supersedes the build notes under it where they differ. Rebuilt by editing: no new runs; new numbers are derived with their formula on the page ($0.75 = 50,000 × $10/1M + 5,000 × $50/1M; $3.22 at 272K).

## Build and checks (current)
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `01_css`, `02_header`, `03_read_a` (core idea, hero, you need, new terms, how the design got here with the timeline, its dated cards and the 2026 release notes closed), `04_read_b` (a request's bill: calculator and 272K step, formula, per token against per task with its closed tables, prompt caching, efforts; inside the network: recurrent depth, provenance, serving, harness animation, ARC chart), `05_read_c` (gpt-oss with the harmony figure and the MoE animation, training with the deliberative alignment figure, safety, lineup today and its closed blocks), `06_tabs` (gpt-oss on one GPU), `07_more`; then the error box and the scripts `10_js_common`, `21_js_rd_common` (skill template), `11` to `18`, `20_js_figs` (hero, deliberative alignment), `99_js_tabs` (skill template, key `og-tab`, plus `data-to` scrolling).
- The header reading time comes from `rt.json`: after editing text run `node html_utils/audit_pages.mjs <out.jsonl> <page>` and update it (230 words a minute, core and closed details apart).
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root) works every control in every tab at 390 px dark and 920 px light under reduced motion, then confirms without reduced motion that neither animation draws a frame before the reader presses play.
- `python3 recompute.py` (in `src/`): every reproduced default (prices, ratios, caching multiples, gpt-oss parameters and memory).
- `python3 html_utils/ledger.py check <page>`: the knowledge ledger.
- Images: `../img/` (two WebP figures from the gpt-oss model card, CC BY 4.0; `img/CREDITS.md`).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (a sequence of bets on where capability is bought, each moving cost from OpenAI's training budget to the caller's bill and hiding more of the machinery), a hero figure of the six bets (who pays, what was disclosed, gpt-oss as the one window), "You need" and new terms (replacing the bets grid and the terms grid).
- **Lineage**: the Lineage tab moved into Reading as "How the design got here", one numbered step per bet (the order explains the design). The GPT-5.6 and GPT-6 launch paragraphs are volatile and sit in a closed "Release notes, 2026" block; the Astra and GPT-6 Sol launch tables moved there from the timeline's cards so they are static text.
- **A request's bill**: concrete numbers first ($0.75, $0.15, $0.0075), then the calculator, then the formula, its symbol list reduced to one sentence. The Cost per task tab is gone: its scatter is the landscape root's (Capability vs price), and its ratio table and one-task breakdown sit in a closed block under "Price per token is not cost per task", with the two numbers that matter (22% and 2.1% per task) in the core.
- **Inside the network**: recurrent depth keeps OpenAI's provenance, the system card findings and the serving change; the mechanism links the landscape root's recurrent-depth section. The harness animation and the ARC chart stay inline; the predict prompts no longer give the answer away.
- **gpt-oss**: each choice names its owner (Quantization and Precision for MXFP4, Attention variants for windows, GQA and sinks, Positional Encodings for YaRN, Long context for cache sizing, Mixture of experts for routing). The sink slider was removed (Attention variants draws it). A real figure from the model card shows the harmony format with `reasoning: low` and the analysis channel.
- **Training**: a before/after figure for deliberative alignment. **Safety**: the three late-September findings are closed (volatile); the pattern sentence stays in the core.
- **Lineup today**: one compact dated table (volatile, read 1 October 2026). "Which one when", other models and products, the Artificial Analysis rulers, the cross-lab position and the common mistakes are closed blocks. The products section and "Where it stands" were folded into them.
- **Autoplay removed** from the page's own animation controller (`11_js_anim.js`): it starts on step 1 and waits for play or a step; a mode switch pauses. Tabs now use the skill templates (`21_js_rd_common.js`, `99_js_tabs.js`).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 30.6 min (7,031 words) | 22.0 min (5,068 words) |
| Reading, closed details | 1.0 min | 18.7 min (including the timeline's dated cards and the 2026 release notes) |
| Other tabs | Lineage 5.1, Cost per task 3.0, gpt-oss on one GPU 2.8, Further reading 3.5 (14.4 min) | gpt-oss on one GPU 3.0, Further reading 3.8 (6.8 min) |
| Visuals inline in Reading (audit count) | 4 | 7 by the audit's count (the two lazy-loaded harmony images are not counted) |

Why about 22 minutes is right: the page owns one provider whose design choices are mostly economic (where capability is paid for) and partly hidden, so the core has to carry the six-step lineage, the bill those steps produce, the one architecture OpenAI disclosed and the one it did not (recurrent depth), and how deployment follows from capability grades. Mechanisms owned elsewhere are a line and a link; launch numbers, prices, benchmarks, index versions and the cross-lab position are volatile and closed. Nothing labelled core could move without a reader looking it up.

## Knowledge ledger
313 units: core 189, depth 30, volatile 66, owned 5, fat 23 (`ledger.py check`: problems 0). 305 drafted by `ledger.py init` from the old page, 8 added by hand (launch-table facts moved out of the script-drawn timeline cards, the two new figures, the lineup table). Owned: the attention-sink widget's two units (Attention variants carries them in "Sinks and gates") and three units of the removed cross-lab scatter (the landscape root's Capability vs price). Fat: navigation and tab pointers, control labels, the removed chart's legend and settings, and restatements. Volatile units stay on this page in closed blocks. The timeline cards' other text (dates, sizes, one-line notes) is unchanged script data and is not in the ledger.

## 2026-11-10: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_css.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `og-tab`). `build.sh` keeps its explicit part lists (new: `02_split.html`, `25_js_s3.js`, `42a_js_oss_cfg.js`, `41_js_sc_rq.js`, `42_js_sc_oss.js`, `43_js_sc_fit.js`; removed: `14_js_oss_read.js`) and now fails loudly on an em-dash, written as bytes.
- **Data**: `mk_oss_cfg.py` writes `parts/42a_js_oss_cfg.js` (`window.OSSCFG`: layers, experts, KV heads, window, context and each layer's attention type, in order) from the two `config.json` files in `inputs/`. `18_js_oss.js` now exposes the tab's own `kvSeq` and `wBytes` on `OSS`, so Fig. 7 and the tab draw the same numbers. Fig. 3 reads `PR`/`reqCost` (`12_js_req.js`) and `AA` (`16a_aa.js`).
- **Fig. 3 `stg-rq`** (7 steps, `41_js_sc_rq.js`, `window.OGRQ`), what one request costs: one column per request stacked by what the bill charges (uncached input blue, cached input green, output purple, split on the index task into hidden reasoning and the visible answer), in tokens or dollars. Steps: 50,000 in and 5,000 out in tokens (flows through a glass plate for the model), $0.75 on Astra, the three tiers ($0.15, $0.0075), the 272K step ($6.75 against $3.50 at base rates, outlined, and $3.22 trimmed), an agent turn 75% cached ($0.90 against $2.25, the cache as a green plate), one Artificial Analysis index task in tokens, then in dollars ($3.26 split four ways; Sol 22% and Luna 2.1% of Astra per task). Its step list replaces the old opening paragraph's numbers and the per-task paragraph; the calculator stays beside the formula in its own split (a reader-driven tool), with the closed per-task block under the stage's text.
- **Fig. 4 `#hx`** (2D, 6 steps, the page's own `makeAnim` in `11_js_anim.js`, given the 2026-11-06 motion rules: plays once at least half in view, pauses off screen, stops for good on any control or at its last step, never under reduced motion, a harness switch replays; `data-playing` while it plays). The two per-mode caption carousels became one step list, `#sx-hx`, whose steps 4 to 6 say what each harness does; the caption box is gone.
- **Fig. 6 `stg-oss`** (7 steps, `42_js_sc_oss.js`, `window.OGOSS`), gpt-oss, the one open window: gpt-oss-120b's 36 layers as a stack (attention slab teal for banded, orange for full, in the config's order, over the MoE slab), one layer pulled out as its 128 experts with the router as a glass plate, the top 4 kept (router scores seeded and labelled illustrative, as the old 2D animation's were), the 52.9 MB read against a 6.37 GB dense BF16 layer drawn to scale, 4 lit experts per layer (5.13B of 116.83B), each layer's cache at 131,072 tokens (268 MB full, 262 KB banded; 4.84 GB), then gpt-oss-20b beside it. It replaces the 2D MoE animation `#moex` (and `14_js_oss_read.js`); its captions became the step list; the window mechanism links the LLM Architecture Gallery's sliding-windows section instead of redrawing it.
- **Fig. 7 `stg-fit`** (5 steps, `43_js_sc_fit.js`, `window.OGFIT`), gpt-oss on one card: the model as a tower of bytes (one slab per layer of expert weights, the rest in BF16 at the bottom, the cache gold on top) against the card's memory as a glass plane: BF16 233.7 GB (2.9 cards), MXFP4 65.2 GB, the full-context cache 4.84 GB (14.8 GB left, 3 sequences), the cache without the window or GQA (9.7, 38.7, 77.3 GB, the tab's illustrative alternatives), gpt-oss-20b on 16 GB (weights fit, the full cache does not; about 91,500 tokens do, activations not counted). New computed facts, each from the tab's own functions.
- **2D kept, each in a split** (text left, card right): hero (Fig. 1), lineage timeline (Fig. 2, now drawn at its column's width, 640 to 900 px), the bill calculator with the 272K chart, the caching break-even widget, the effort table, the ARC-AGI-3 chart (Fig. 5), the harmony figures (Fig. 8, real images), deliberative alignment before and after (Fig. 9). They are a timeline, bars, a scatter, a table and real images, which read best flat. Full width: "Inside the network" (the published facts about Astra are a list and a three-row table, not a structure: no stage drawn, nothing invented about closed internals), Safety, the dated lineup (volatile, unchanged), the gpt-oss on one GPU tab (a reader-driven calculator) and Further reading.
- **Checks**: `check_stages.mjs` (new; from the repo root with a shots dir outside the repo): the three stages and the harness animation play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; splits two columns at 1400 px and one below 1100; every number in the three step lists recomputed from `OGRQ`, `OGOSS`, `OGFIT`, `reqCost` and `OSS`. `check_controls.mjs`: also at 1400 px, its never-autoplay assertion inverted (the four animations must play in view). `recompute.py`: a section reproducing every number of Figs. 3, 6 and 7.
- Ledger: unit 156 re-keyed to Fig. 6's step list; five units added for the stages' new computed facts (problems 0).

### Length judgement (2026-11-10)
| | Before (audit 2026-11-10, before this pass) | After |
|---|---|---|
| Reading, core | 5,150 words, 22.4 min | 6,270 words, 27.3 min |
| Reading, closed details | 4,556 words, 19.8 min | unchanged |
| gpt-oss on one GPU / Further reading | 3.0 / 3.8 min | unchanged |
| Visuals inline in Reading (audit count) | 7 | 9 |

The added 1,120 words are almost all the four step lists (25 items). The old animations' captions were drawn by script, so the audit never counted them; their text is now in the lists, plus the explanation of the two new stages (what one card holds; one request and one task taken apart), whose numbers are new computed facts. Sentences the lists now carry were cut from the prose around them (the per-task paragraph, the calculator note's 272K sentence, the gpt-oss "about 120 times" paragraph, a repeated one-card sentence before Fig. 7). Nothing labelled core was cut.

### Knowledge ledger (2026-11-10; problems 0)
323 units: core 194, depth 31, volatile 70, owned 5, fat 23.

---

# Earlier notes (v3, kept for history)

# OpenAI: GPT family, interactive page (v3)

`visual.html` replaces all the text of the Notion page "OpenAI: GPT family" (https://app.notion.com/p/3c65c17b0d0d814abf90d5b9e567d72f, child of Topic: llm-landscape). It is meant to be the only source of information on the page. `coverage.json` shows where it carries each fact of the old text (or why a claim was corrected), and every specific figure links inline to its source. The page has no child pages, databases or videos; its only block besides text is the old embed, which this file replaces.

## Build

`./build.sh` concatenates `parts/` into `visual.html` (about 171 KB):

- **HTML parts:** `00_top`, `01_css`, `02_header`, `03_read_a`, `04_read_b`, `05_read_c`, `06_tabs`, `07_more`.
- **Scripts:** `10_js_common` (helpers), `11_js_anim` (step-by-step animation player), `12_js_req` (request cost, caching, effort table), `13_js_arc` (ARC-AGI-3 chart and harness animation), `14_js_oss_read` (attention sinks, MoE animation), `15_js_aa` (index rulers), `16_js_line` (Lineage), `16a_aa` (Artificial Analysis data), `17_js_cost` (Cost per task), `18_js_oss` (gpt-oss tab), `90_js_tabs` last.
- **Links:** `{{text|url}}`, where url is an alias (`@pricing`, `@arc`, ... listed in `build.sh`) or `n:<notion id>`; each expands to an anchor with `target="_blank" rel="noopener noreferrer"`.
- **Reading time:** from the Reading tab's text at 230 words a minute; the external resources total is computed and filled in.

## Check

    node tabshot.mjs <t-read|t-line|t-cost|t-oss|t-more> <light|dark> <920|390> <out.png>   # one tab
    node chunks.mjs <tab> <scheme> <width> <prefix> [chunk px]                        # whole tab in slices
    node shot.mjs <tab> <scheme> <width> <out.png> <selector> ['#hxFwd*4;...']        # one element after clicks
    node exercise.mjs                                                                 # every control, both widths
    node rm.mjs                                                                       # reduced motion and off-screen pausing
    python3 recompute.py                                                              # every reproduced default

## Tabs

- **Reading** (open by default), with inline: request cost calculator with the 272K cliff; prompt caching break-even; effort table; harness animation (standard harness against Provider Adapter); ARC-AGI-3 score against cost at six efforts; MoE animation (gpt-oss-120b against a dense block of the same size); attention-sink softmax; the index on four versions.
- **Lineage:** every release and event 2018 to 2026 by lane, with the bet each period made; zoom to June to October 2026.
- **Cost per task:** index against cost per task or price per token with the frontier; per-token against per-task ratios; one task taken apart (fitted, by construction).
- **gpt-oss on one GPU:** parameter table rebuilt from config.json (reproduces the card independently), memory against a budget, KV cache against context, one MXFP4 block.
- **Further reading.**

## Other files

- `viz_ideas.md`: candidates, scores, data and formulas with URLs, contradictions found, what the methodology lacked.
- `live.md`, `live_before_delete.md`: the page as fetched on 1 October 2026 (signed embed URL shortened).
- `src/`: fetched sources (docs markdown, ARC Prize, model card text, configs, press) used to check claims.
