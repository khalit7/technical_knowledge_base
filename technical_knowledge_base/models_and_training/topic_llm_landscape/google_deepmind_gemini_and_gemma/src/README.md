# Google DeepMind: Gemini and Gemma, interactive page (v4, rebuilt 2026-10-24 to the teaching contract; 2026-11-10 split layout and three 3D stages)

Child page of Topic: llm-landscape (storage key `gg-tab`). Rebuilt by editing only: no new runs, no new numbers except derived ones with their formula (192 racks = 12,288 / 64). Current structure: the 2026-11-10 section below, which supersedes the build notes under it where they differ.

## Build and checks (current)
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `01_css`, `02_header`, `03_read_a` (core idea, hero, you need, new terms, families table, how the design got here with the timeline and closed release notes), `04_read_b` (thinking, media, works harder with the one-task widget), `05_read_c` (Gemma, Gemma attention, edge models, sparse against dense, training, dated lineup, mistakes), `06_tabs` (Gemma on one machine), `07_more`; then the error box and the scripts `10_js_common`, `21_js_rd_common` (skill template), `11` to `19`, `20_js_figs` (hero, edge bars, sparse against dense), `99_js_tabs` (skill template, key `gg-tab`, plus `data-to` scrolling).
- The header reading time comes from `rt.json`: after editing text run `node html_utils/audit_pages.mjs <out.jsonl> <page>` and update it (230 words a minute, core and closed details apart).
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root) works every control in every tab at 390 px dark and 920 px light under reduced motion. Nothing on the page animates by itself.
- `python3 html_utils/ledger.py check <page>`: the knowledge ledger.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a hero figure (frontier model distilled into Flash and into Gemma; what the caller sets per request; what makes Gemma fit one machine; TPUs underneath), "You need", new terms, and the families in one table (replacing the families grid and the "why Google" bullets, which the hero now carries).
- **Lineage**: the Lineage tab moved into Reading as "How the design got here" (the order explains the design: sparsity, long context, thinking budgets then levels, width, per-request controls, the Flash cadence). The per-release benchmark paragraphs (3.8 Flash, Cyber, Live, Argon) are volatile and sit in a closed "Release notes" block; the dated cards sit in a closed block that a dot click opens.
- **Works harder**: the one-task cost breakdown moved here from the Cost per task tab; the fitting arithmetic is closed. The list-price chart was removed (price history, a rejected pattern; its prices are one sentence in the lineup) and the index-against-cost scatter was removed (cross-provider, owned by the landscape root's Capability vs price tab). The Cost per task tab is gone.
- **Gemma**: one section with the lineage in two paragraphs and the Gemma 4 table; attention keeps the layer strip and the 37.5% reconstruction, with the cache formula closed and sizing linked to Long context; a new edge-models section with a to-scale figure; sparse against dense gets a to-scale figure, the worked example condensed from five steps to three. EmbeddingGemma closed.
- **Training**: a real photo (TPU v4 racks, CC BY 4.0, `img/CREDITS.md`); JAX's definition shortened (the JAX topic owns it); distillation's definition replaced by a link (Distillation owns it), the storage widget kept (that page links here for it); usage numbers and the Siri deal closed as volatile.
- **Lineup today**: one dated volatile table; "Which model when", model codes and the mistakes are closed blocks.
- **Gemma on one machine** stays a tab (a calculator used across the Gemma sections); its symbol definitions and the full Leviathan Table 4 are closed, and the roofline and speculative decoding owners are linked.
- Reading formulas: symbol lists became one sentence each.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 31.7 min (7,291 words) | 27.2 min |
| Reading, closed details | 0.9 min | 11.7 min |
| Other tabs | 20.7 min (Lineage 3.4, Cost per task 2.8, Gemma on one machine 10.8, Further reading 3.5) | 15.1 min (Gemma on one machine 9.1 core plus 2.1 closed, Further reading 3.9) |
| Visuals inline in Reading (audit count) | 2 | 7 |

Why about 27 minutes is right: the page owns two families with different questions (what a Gemini request costs: thinking levels, media tokens, tokens per task; what fits on one machine: Gemma's attention layout, global-layer savings, edge tricks, sparse against dense), plus the lineage that explains them. What remains in core is Google-specific numbers and reasons; mechanisms other pages own are a line and a link, and benchmarks, release notes and per-item lists are closed.

## Knowledge ledger
359 units: core 253, depth 63, volatile 24, fat 19 (`ledger.py check`: problems 0). 356 drafted by `ledger.py init` from the old page, 3 added by hand for script-drawn figures. Fat: navigation lists, tab pointers, wind-ups and the KV-cache definition the reader already has. No unit is labelled owned: the owners (Speculative decoding for Table 4, the landscape root for the cost scatter) do not carry this page's keys, so the units stay here.

## 2026-11-10: split layout, three 3D stages, explained and autoplaying stages (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_css.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `gg-tab`). `build.sh` keeps its explicit part lists (new: `02_split.html`, `25_js_s3.js`, `41_js_sc_md.js`, `42_js_sc_pl.js`, `43_js_sc_sd.js`) and now fails loudly on an em-dash, written as bytes.
- **Data**: `12_js_media.js` now exposes the media rates as `window.GGMED` (Gemini 3's media-resolution table, the 2.5 report's rates, the window), read by both the calculator and Fig. 3; Fig. 5 reads `window.GEMMA` (the Gemma on one machine tab's memory table and configs, `17_js_gemma.js`); Fig. 4's six numbers sit in `window.GGPL` at the top of its scene (model card and Gemma 3n docs, as the page quotes them).
- **Fig. 3 `stg-md`** (6 steps, `41_js_sc_md.js`), media against the window: the 1,048,576-token window as a glass plate of 32 x 32 tiles of 1,024 tokens; step 1 is a close-up of one tile with one cube per token (70 for a frame, 25 for a second of sound), then one hour at default (342,000, 32.6%), at high (1,098,000, the 49,424 overflow tokens orange past the edge), the 630 images that fill the rest, Gemini 2.5's rates (1,044,000), and agentic loading (Google's ~108K against ~1.08M, the static count outlined). Flows from a source plate onto the row being filled. The old worked-example paragraph and the agentic callout became its step list; the calculator stays beside the formula in its own split.
- **Fig. 4 `stg-pl`** (5 steps, `42_js_sc_pl.js`), the edge models: two memory plates (accelerator, off the accelerator), E4B's 42 layer slabs (blue, 4.5B) and its embedding parameters (gold, 3.5B = 8 - 4.5) to scale; the embeddings move off, a token climbs the stack while each layer's row comes up from storage (flows), E2B (35 layers, 2.3B and 2.8B), then the three checkpoints side by side, outline the checkpoint and solid what must be resident. It replaces the 2D `pleSvg` bars; the PLE bullet became its step list; MatFormer and KV sharing stay as text, KV sharing linking the gallery's Fig. 14 (section 10) instead of drawing it.
- **Fig. 5 `stg-sd`** (5 steps, `43_js_sc_sd.js`), sparse against dense on one card: towers whose height is GB, the card as a glass plane (80 GB H100, 24 GB, 16 GB); the MoE tower is the back-solved shared part (4.64 GB) plus 128 expert columns of 0.37 GB, lit columns read per token (which 8 is seeded and illustrative, said in the step), the int8 32K caches gold, the 12B Unified on the 16 GB card, and a batch of 32 lighting 112 experts (uniform routing, illustrative; the formula is linked to Mixture of experts section 8). Flows carry what one decode step reads to the token. It replaces the 2D `mvdSvg` rows and the three-step worked list, which became its step list.
- **2D kept, each in a split** (text left, card right): hero (Fig. 1), lineage timeline (Fig. 2), thinking-level table, media calculator, "works harder" token bars, one-task widget, Gemma attention strip (the gallery's Fig. 8 now linked for the same windows in 3D), the 37.5% p-RoPE widget, the TPU v4 photo, the distillation storage widget. They are tables, bars, a timeline and slider widgets, which read best flat, and the attention strip is this page's Gemma-specific tool beside an architecture-page 3D owner. Full width: families table, Gemma lineage and Gemma 4 table, T5Gemma, native multimodality, distribution, the dated lineup (volatile, unchanged), common mistakes, the Gemma on one machine tab (a reader-driven calculator) and Further reading. No "works harder" stage: its message is ratios on one axis.
- Checks: `check_stages.mjs` (new; from the repo root with a shots dir outside the repo): the three stages play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; splits two columns at 1400 px and one below 1100; about 55 numbers in the three step lists recomputed from `GGMED`, `GGMD`, `GGPL`, `GEMMA` and `GGSD`. `check_controls.mjs`: adds a 1400 px light pass and clears the remembered tab (it had no never-autoplay assertion to invert).
- Ledger: units 91, 147, 153, 154, 189, 190, 192, 194 to 196, 198, 358 and 359 re-keyed to the step lists that now carry them; 323 to 355 (external reading times) re-keyed on the resource titles, never the minutes.
- No new real image: the TPU v4 racks photo stays; the subject's other objects (a phone, a GPU card) would only decorate.

### Length judgement (2026-11-10)
| | Before (audit 2026-11-10, before this pass) | After |
|---|---|---|
| Reading, core | 6,342 words, 27.6 min | 7,080 words, 30.8 min |
| Reading, closed details | 2,847 words, 12.4 min | unchanged |
| Gemma on one machine / Further reading | 8.8 + 2.1 closed / 3.9 min | unchanged |
| Visuals inline in Reading (audit count) | 7 | 8 |

The added 738 words are the three step lists (16 items): the two figures they replace were script-drawn bars the audit could not count, and their prose (the worked lists, the agentic callout, the PLE bullet) moved into the lists; the closing paragraph of sparse against dense was trimmed where steps 4 and 5 now carry it. Nothing was cut.

### Knowledge ledger (2026-11-10; problems 0)
363 units: core 254, depth 63, volatile 27, fat 19.

---

# Earlier notes (v3, kept for history)

# Google DeepMind: Gemini and Gemma, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Google DeepMind: Gemini and Gemma" (https://app.notion.com/p/3c65c17b0d0d8173a0aafcb27cf7a5f3, child of Topic: llm-landscape). It is meant to be the only source of information on the page. `coverage.json` shows where it carries each fact of the old text, and every specific figure links inline to its source.

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

Overlap fix (19 October 2026): the Gemma tab's batching section no longer derives the touched-experts formula E(B) = n[1 − (1 − k/n)^B]; it points to Mixture of experts section 8 (3fd5c17b0d0d81fda06bf955af7c2b58) and keeps Gemma's own numbers (the back-solved P_shared and P_expert, the chip peaks, the crossovers, the calculator).
