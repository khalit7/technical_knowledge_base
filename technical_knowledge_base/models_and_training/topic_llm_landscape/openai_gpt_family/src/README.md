# OpenAI: GPT family, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `og-tab`). Rebuilt by editing: no new runs; new numbers are derived with their formula on the page ($0.75 = 50,000 × $10/1M + 5,000 × $50/1M; $3.22 at 272K).

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
