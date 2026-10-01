# Google DeepMind: Gemini and Gemma, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Google DeepMind: Gemini and Gemma" (https://app.notion.com/p/3c65c17b0d0d8173a0aafcb27cf7a5f3, child of Topic: llms). It is meant to be the only source of information on the page. `coverage.json` shows where it carries each fact of the old text, and every specific figure links inline to its source.

## Build

`./build.sh` concatenates `parts/` into `visual.html`:

- **HTML parts:** `00_top`, `01_css`, `02_header`, `03_read_a`, `04_read_b`, `05_read_c`, `06_tabs`, `07_more`.
- **Scripts:** `10` to `19`, with `90_js_tabs.js` last. `18_js_roof.js` (batch roofline) and `19_js_spec.js` (speculative decoding) read the Gemma data that `17_js_gemma.js` exposes as `window.GEMMA`.
- **Links:** `{{text|url}}`, where the url can be an alias (`@pricing`, `@g4r`, and so on, listed in `build.sh`) or `n:<notion id>`. Each one expands to an anchor with `target="_blank" rel="noopener noreferrer"`.
- **Reading time:** worked out from the Reading tab's text at 230 words a minute. The total for the external resources is also computed and filled in.

## Check

Screenshots of a tab:

    node tabshot.mjs <t-read|t-line|t-cost|t-gemma|t-more> <light|dark> <920|390> <out.png> [click selector]

Set `SEL='#id'` to screenshot one element. The screenshots are in `shots/`.

## Tabs

- **Reading** (open by default). The Gemma 4 drafter bullet links to the speculative decoding view (`data-to` scrolls to a section inside the tab). It has these inline widgets:
  - thinking-level matrix
  - media-against-window calculator
  - 3.7 against 3.8 Flash token ratios
  - Gemma layer strip and KV cache
  - p-RoPE accounting
  - distillation storage
- **Lineage:** both families on one axis, plus a 2026 zoom.
- **Cost per task:**
  - list price by generation
  - AA index against cost per task
  - one task taken apart: fitted to AA's run totals, so it reproduces by construction
- **Gemma on one machine:**
  - weights and KV cache against a memory budget
  - compute and bytes read per token
  - KV cache against context
  - a table of reproduction checks
  - **batch roofline:** arithmetic intensity against batch size for 26B A4B and 31B, the chip's critical batch (TPU v5e, v6e, Ironwood), experts touched under uniform routing (illustrative), and one decode step's time split. Defaults reproduce the Scaling Book's B_crit = 240 on v5e independently; the MoE's shared and per-expert bytes are back-solved from the report's 52.0 / 7.6 GB, so P(1) and P(all) hold by construction.
  - **speculative decoding:** Leviathan et al.'s tokens per pass and speed-up against α, γ and c, a seeded strip of ten verification steps, and Table 4 recomputed (all 12 rows within 0.07 of the paper's expected column, independent). The Gemma 4 preset fits α ≈ 0.77 to the Hugging Face blog's "up to ~3x" at an assumed γ = 4 and c = 0.5/30.7 (fitted and illustrative, labelled).
- **Further reading**

## Notes

- Charts in hidden tabs draw when their tab opens (`onTab`).
- Maths is MathML.
- There is no network access, CDN or web fonts.
- Colours are CSS variables, with a dark scheme.
- Nothing is stored in the browser.
- AA data: `parts/16a_aa_data.js` (from `pages/topic-llms/aa_snapshot.json`, Intelligence Index v4.3.2, read 1 October 2026).

## Other files

- `viz_ideas_2.md`: round 2 candidates; ideas 6 and 7 are built (note: its "α about 0.79" for Gemma at γ = 4 recomputes to 0.774, which the page shows).
- `viz_ideas.md`: the candidates, how they scored, where each one went, and what was rejected.
- `live.md` and `live_before_delete.md`: the page text as fetched on 1 October 2026. The old embed's signed S3 query string has been shortened.
