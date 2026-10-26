# Alibaba: Qwen, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (prefix `qw`, storage key `qw-tab`). Rebuilt by editing only: no new runs, no new numbers except derived ones with their formula.

## Build and checks (current)
- `sh build.sh` writes `../index.html`: HTML parts `01_head`, `02_read_a` (core idea, hero, you need, new terms, one-screen table, strategy and licences, how the design got here), `02b_read_line` (lineage release notes, closed), `03_read_b` (MoE, hybrid attention, QSA and Flash-Next), `04_read_c` (post-training, dated lineup), `04d_read_deep` (closed depth blocks), `05_tabs` (Configs, Licence checker), `07_more`; then the error box and one script per JS part: `10_js_common`, `21_js_rd_common` (skill template, never autoplays), `11_js_moe`, `12_js_hx`, `13_js_small`, `14_js_cfg`, `15_js_line` (lineage chart, now in Reading), `16_js_lic`, `17_js_figs` (hero, Flash-Next parameters to scale, Qwen3 post-training recipe), `99_js_tabs` (skill template).
- The header reading time comes from `rt.json`: after editing text run `node html_utils/audit_pages.mjs <out.jsonl> <page>` and update it (230 words a minute, core and closed details apart).
- `check_controls.mjs` (from the repo root: `node <page>/src/check_controls.mjs <page>/index.html`) moves every slider, select, radio and toggle, steps the hybrid animation through all three modes, clicks every lineage dot, in 390 px dark and 920 px light, and fails if the animation moves before a click (also under reduced motion).
- `recompute.py` recomputes every reproduced default; `python3 html_utils/ledger.py check <page>` checks the knowledge ledger.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (coverage, paid for by the test, adopt, inherit, distil loop), a static hero (one Qwen3.8 block, annotated, with the loop from Qwen3-Next to Flash-Next under it), "You need", new terms condensed, and the one-screen table.
- **Licences**: the bullet list became a table of the clause that bites per checkpoint; the checker tab stays (a tool across about thirty checkpoints) and is renamed Licence checker.
- **Lineage**: moved from its tab into Reading ("How the design got here"), because the order is the loop; the per-release cards are a closed "Release notes" block that a dot click opens.
- **MoE**: global-batch toy kept inline (Qwen's own design; the formula moved to a closed block); expert grid kept; worked parameter examples closed, the 2.4T reproduction kept in core; the high-sparsity costs condensed to one sentence (Mixture of experts owns them).
- **Attention**: the delta-rule formula and the delta against plain linear attention widget were removed: Beyond attention owns the mechanism and its demo (one-line formula and link kept). Gated attention sink numbers named with a link to Attention variants; study details closed. Cache sizing is one paragraph of Qwen numbers plus the calculator link; the arithmetic is closed. The hybrid animation (never autoplays) stays inline with its counting notes closed.
- **QSA and Flash-Next**: the two passes, results, worked 1M example and "the cache does not shrink" stay core; indexer internals, training steps, kernel conditions, IndexShare and the unconfirmed gather claim are closed. New to-scale figure of where Flash-Next's parameters live (the 51.2B n-gram table outside the 125B headline). The hard-selection cost from the old trade-offs section was added to the cache box.
- **Post-training**: a new static recipe figure (four stages for the large models, two distillation phases for the small ones). The Table 21 bars and the KL formula were removed (Distillation and small language models owns on-policy distillation and carries the numbers); the numbers stay in one sentence.
- **Models today**: one dated volatile table with the AA v4.3 index and cost per task as columns (the AA bars were removed).
- **Trade-offs and common mistakes**: the trade-offs section restated the core; its new points were moved into the sections (balanced over the corpus but not per sequence, hard selection, the distillation ceiling) and the rest is fat. Mistakes are a closed block.
- No real image: the subject has no physical object, and Qwen's own architecture figures (blog, arXiv) carry no reuse licence, so none was embedded.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 32.1 min (7,378 words) | 23.4 min (5,378 words) |
| Reading, closed details | 1.1 min | 10.7 min |
| Other tabs | 11.4 min (Configs 1.5, Lineage 4.9, Licences 2.5, Further reading 2.4) | 7.0 min (Configs 1.5, Licence checker 2.5, Further reading 2.9) |
| Visuals inline in Reading (audit count) | 3 | 7 (hero, lineage, global-batch toy, expert grid, hybrid animation, Flash-Next parameters, recipe) plus the Table 1, Table 11 and thinking-budget bar charts |

Why about 23 minutes is right: the page owns three architectural departures (512-expert MoE with global-batch balance, the 3:1 Gated DeltaNet hybrid, QSA plus capacity off the accelerator) and a post-training recipe, each with Qwen's published evidence; the ledger shows the remaining core is Qwen-specific numbers and reasons, not restatement. Mechanisms other pages own are now one line and a link; detail and chronicle are closed.

## Knowledge ledger
471 units: core 286, depth 73, volatile 65, owned 13, fat 34 (`ledger.py check`: problems 0). 455 drafted by `ledger.py init` from the old page, 10 carried from the 2026-10-23 pilot ledger (KV-cache units owned by Long context), 6 added by hand for script-drawn visuals. Owned: delta-rule demo by Beyond attention; Table 21 bars by Distillation and small language models; MoE definition by Mixture of experts; cache sizing by Long context.

---

# Earlier notes (v3, kept for history)

# Alibaba: Qwen, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Alibaba: Qwen" (child of Topic: llm-landscape, https://app.notion.com/p/3c65c17b0d0d81fd8c36ce06672bb235). It is the only source of information on the page, so it carries every fact of the old text (`coverage.json`), each specific figure linked inline to its source.

## Build and check

- **Build**: `./build.sh` concatenates `parts/`: HTML parts 01 to 07, then the error box, then one `<script>` per JS part (10 to 16, tabs 90 last). It also expands `{{text|url}}` links (aliases `@name` are defined in build.sh, and `n:<id>` becomes a Notion link), fails loudly on em-dashes, and fills in the reading time and resources total.
- **Check**:
  - `node tabshot.mjs <t-read|t-cfg|t-line|t-lic|t-more> <light|dark> <920|390> <out.png>` takes a whole-tab screenshot.
  - `node shotel.mjs '<selector>' <scheme> <width> <out.png> [js]` screenshots one element, with reduced motion.
  - `node check.mjs` exercises every control on every tab and every animation mode and context, and checks that the error box stays hidden.
  - Screenshots are in `shots/`.

## Tabs

In order: Reading (default), Configs and cache, Lineage, Licences, Further reading.

## Reading-tab visuals

| Element | Script | What it is |
|---|---|---|
| `#lb` | 11 | Micro-batch against global-batch load-balancing loss (illustrative toy; the paper's formula) |
| `#eg` | 11 | Expert grids, Qwen3-235B against 2.4T, to scale |
| `#dr` | 13 | Delta rule against plain linear attention |
| `#abl` | 13 | Flash-Next paper Table 1 |
| `#hx` | 12 | **Hybrid attention animation** |
| `#t11` | 13 | Flash-Next against Qwen3.7-Plus, Table 11 |
| `#tb` | 13 | Thinking budget strip |
| `#ds` | 13 | Distillation against RL, Table 21 |
| `#aa` | 13 | AA Intelligence Index v4.3, read 2026-10-01 |

## Hybrid attention animation (`12_js_hx.js`)

- One decoded token through one block of four layers, on Qwen3.8-Flash-Next's config dimensions.
- Three modes: all full attention (a counterfactual), the 3:1 hybrid (as pretrained), and hybrid plus QSA (as shipped). They have 4, 6 and 7 steps.
- A context selector offers 4K, 32K, 262K and 1M tokens.
- The grids are drawn to scale: one square = T/512 tokens of one layer's cache, and a DeltaNet state is 768 tokens' worth.
- Controls: play, pause, step, scrub and speed.
- Running counters show numbers read and storage.
- The animation runs only while on screen and in the visible tab, and starts paused under prefers-reduced-motion. `#hx[data-frames]` counts frames, for tests.

## Other tabs

- **Configs and cache** (`14_js_cfg.js`): eight config.json files, with memory against context, expert parameters, and a 16/32-bit state toggle.
- **Lineage** (`15_js_line.js`): a dot timeline, coloured by licence, with clickable cards.
- **Licences** (`16_js_lic.js`): 25 checkpoints against 8 use cases.

## Sources and supporting files

- `src/`:
  - the config.json, LICENSE and README files fetched from Hugging Face;
  - arXiv HTML and text for the Flash-Next paper, the Qwen3 report, Gated Attention, Global-batch and Gated DeltaNet;
  - `agent_news/`, the news pages and licence files fetched for verification.
- `recompute.py` recomputes every reproduced default.
- `viz_ideas.md` holds the scored candidates, the reproduced figures and the rejected ideas.
- `mk_coverage.py` writes `coverage.json` and checks that each carried fact's text is present.
- `live.md` and `live_before_delete.md` hold the page text as fetched on 1 October 2026. The old embed's signed URL is shortened there; it expires anyway.

## Technical notes

- Maths is MathML.
- There is no network access, CDN or web font.
- Colours are CSS variables with a dark scheme.
- The tab choice is kept in localStorage under `qw-tab`, wrapped in try/catch.

## 2026-10-23 pilot: KV-cache sizing has one owner
Whole-model KV-cache sizing now lives only on [Long context](n:3fd5c17b0d0d81059ee1ce20c0326dc5) (KV-cache calculator, tab t-kv, 45 presets); this page keeps a one-line conclusion and a link. The "Configs and cache" tab became "Configs": the memory-against-context plot, the cache table, the context slider, the 32-bit state toggle and the pinned comparison moved to the calculator (all eight checkpoints are presets there). Kept: the parameter table (with a layers full / linear column added so the Reading tab's layout link still lands on something), the expert formula and checks, and the Reading tab's own cache worked example (Qwen-specific); one summary sentence (hybrids under 25 GiB at 262,144 tokens, 2.4T at 23.3 GiB, half of Qwen3-235B's 47 GiB) replaces the rest. Core reading 32 min, unchanged. Removed units and where the owner carries them: `src/ledger.json` (`python3 html_utils/ledger.py check`). Also: animations no longer autoplay (they wait on step 0), a tab named in the URL hash opens, and the header reading time uses the "Reading: N min, plus M in closed details." format.

## 2026-10-26 trim
The one-screen table overlapped the hero: the open table now keeps the four differences the figure cannot show (global-batch balancing, extra capacity, reasoning modes, distillation); the full eight-row table moved unchanged into a closed block below it (ledger 53 depth). Core still 23 min.
