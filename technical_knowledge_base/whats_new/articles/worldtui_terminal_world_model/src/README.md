# How this page is built (WorldTUI article)

The article method is `.claude/skills/explainer-page/page-kinds/article.md`; the shared pieces are copied from `whats_new/articles/cloudflare_kv_cache_exposure/src/` (the same `mk_article.py` and `build.sh` as `qorl_query_plans`) and `extract_article.py` from `transformers_from_memory`.

## Build and check (from the repo root)
```sh
python3 <page>/src/recompute.py                      # run from src/: writes inputs/recompute.json (the hero widget's scenarios and counts)
bash <page>/src/build.sh                             # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html     # every control, 390 dark, 920 and 1400 light; widget against recompute.json; prose numbers
python3 <page>/src/label_ledger.py                   # after `python3 html_utils/ledger.py init <page>`; then `ledger.py check <page>`
```
`inputs/article.txt` (the post's text) is gitignored; `fragments.json` keeps every link the page resolved, so the page rebuilds identically without it. Re-extract with `extract_article.py` (START `<div class="article-content">`, END `<aside class="author-card"`; footnote markers and back-links dropped so they cannot split a fragment).

## Files particular to this page
| File | What it is |
|---|---|
| `recompute.py` | The encoder (cheapest edit per changed row: write a span, or COPY a row of the previous screen and patch a span) on seven illustrative 32 x 96 screen changes; sequential and row-parallel step counts, with and without COPY; and the derived numbers the prose uses (358.3M, 7.7 times, 4 ms a token). Writes `inputs/recompute.json`. |
| `parts/22_js_wt_cost.js` | Fig. 1, the hero widget: a JS port of the same encoder (same tie-breaks), checked against `recompute.json` on every scenario by `check_page.mjs`. |
| `parts/23_js_wt_rep.js` | Fig. 2, the self-repair step animation (step list `sx-rep`). |
| `parts/24_js_wt_lay.js` | Fig. 3, memory readbacks for the distillation teacher and students. |
| `mk_article.py` | As the reference, plus one optional field: `code.label` (the card link said "logs and code"; here it is a demo). `DATA_EXTRA` ships `inputs/recompute.json`. |

## Departures from page-kinds/article.md
- **The live ingredient is the hero.** The post's engineering is a cost argument (a redraw is about 3,000 tokens; COPY makes a scroll 3 tokens a row; parallel rows make a frame as long as its longest row), and a widget that encodes real screen changes shows all three by moving one variable. Its defaults reproduce the post's figures independently: 3,020 sequential tokens and 100 parallel steps for a full screen of 96-column text, 3 tokens a row for a scroll. The screens are illustrative and the encoder is ours (the author's is unpublished), which the caption says.
- **The author's demo source was read as evidence** (never run, weights never downloaded): `codec.js` (the grammar), `session.js` (greedy decoding), `rowparallel.js` (the verifier, the time budget, a PresetBench comment on the unverified mode) and `manifest.json` (334-token vocabulary, 4-bit groups of 32, 208,351,744 bytes, 357,826,560 quantised parameters, checkpoint named for the third self-repair round). They confirm the post and add the two facts the trust section uses: verification is exact only without a time budget, and the unverified mode scored lower on an intermediate checkpoint.
- **No error-compounding toy.** The lead suggested one if the post's numbers allowed it; they do not (no accuracy by step or session length), so the page says the effect is unmeasured rather than drawing an invented curve.
- **Responses are Hacker News comments only**: no blog reply, replication or port exists (searched 27 November). Two user reports and a related evaluation use are merged into short entries.

## Length judgement
Reading 10 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`: 2,401 core words, 586 in details), against the post's 13 (2,991 words). The post is mostly engineering a reader can see in three figures; the page keeps its order, puts the protocol, the training recipe and the size arithmetic in a few sentences each, and spends its length on what the post does not give: what the tests can and cannot show, the demo source's evidence, and where the layer finding belongs. Related work and next steps, the demo's decoding settings and the provenance are closed. Ledger: 134 units, core 88, depth 41, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The post (live; three distinct Wayback copies, 22 October 02:21 and 09:44 UTC and 27 October 20:18, text identical apart from header and footer links); the demo page and `app.js`, `codec.js`, `session.js`, `rowparallel.js`, `manifest.json` (54 KB; the 208 MB of weights not fetched); Qwen2.5-Coder-0.5B `config.json` and model card; the Hacker News item 50190363 with all comments (firebase API); Leon Becker's vibeSH post (16 June 2026); Anthropic's "Training a Misaligned Reward Seeker" (August 2026, its simulated-evaluation paragraph); Hugging Face and GitHub searches for WorldTUI weights or code (none).
Not found: the definition of the table's 13 file readbacks; which decoding mode produced the 0.87 s; any test set, harness or training code.
