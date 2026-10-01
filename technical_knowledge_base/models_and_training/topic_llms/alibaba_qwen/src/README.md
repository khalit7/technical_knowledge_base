# Alibaba: Qwen, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Alibaba: Qwen" (child of Topic: llms, https://app.notion.com/p/3c65c17b0d0d81fd8c36ce06672bb235). It is the only source of information on the page, so it carries every fact of the old text (`coverage.json`), each specific figure linked inline to its source.

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
