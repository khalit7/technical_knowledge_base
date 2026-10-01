# OpenAI: GPT family, interactive page (v3)

`visual.html` replaces all the text of the Notion page "OpenAI: GPT family" (https://app.notion.com/p/3c65c17b0d0d814abf90d5b9e567d72f, child of Topic: llms). It is meant to be the only source of information on the page. `coverage.json` shows where it carries each fact of the old text (or why a claim was corrected), and every specific figure links inline to its source. The page has no child pages, databases or videos; its only block besides text is the old embed, which this file replaces.

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
