# The Llama 3 Herd of Models: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81aca58ccb9d720b474e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the paper-page method (`html_utils/methods/papers.md`) and the reference folder `attention_is_all_you_need_transformer/src/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (generated), then Problem, The herd, Data, Scaling law (predict: the printed constants), 16K GPUs, Keeping it running (predict: how often; Table 5 bars), Recipe (run chart), Post-training (RS + SFT + DPO against PPO animation; predict: DPO masking with calculator), Capabilities (expandable), Results (Table 2 frontier with intervals; predict: human evaluation), Why it matters, Connections, How much of this to believe, What it takes to use this. |
| Refit the forecast | `t-fit` | Figures 2, 3, 4 rebuilt from the vector PDFs and refitted. |
| Run the 16K-GPU job | `t-run` | Mesh rank mapper, memory per GPU, pipeline schedule simulator (animated), 54-day interruption replay (animated). |
| The paper's tables, rebuilt | `t-tables` | Tables 2 (with intervals), Figure 17, 3 (recount), 4 (checked), 5 (checked), 6 and 7, 15, 21. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md, and why.** This is a 92-page report that is part systems, part empirical and part recipe, so it gets two live tabs instead of one: "Refit the forecast" (the empirical ingredient: the scaling law that sized the model and the benchmark forecast) and "Run the 16K-GPU job" (the systems ingredient: 4D layout, pipeline schedule, failures). No toy model: the architecture is Llama 2's and the claims are about scale. No "Then and now" tab: the lineage before and after Llama 3 is on the Meta lab page, which this page links where it overlaps; "Why it matters" carries the short version. Capabilities and some results paragraphs sit in expandable details to keep the Reading tab near 26 minutes (the reading-time line reports the details separately).

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or an unexpanded macro, and fills the reading times.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v3 to `inputs/paper_v3.txt` and `inputs/table_*.txt` (v1 was also extracted to diff; the only content change is Table 4's DP 4 to 8 in the 128K row).
- `extract_figs.py` (`uv run --with pymupdf python extract_figs.py [source dir]`): downloads the arXiv e-print (not kept) and reads Figures 2, 3, 4 and 17 from the vector PDFs in `assets/`, calibrated on gridlines or axis ticks, into `inputs/figs.json`.
- `mk_tables.py`: tables from the HTML extracts into `tables.json`, strings as printed.
- `recompute.py`: parameter recount, FLOPs, the power-law refit and the budget that reproduces 16.55T, IsoFLOPs parabola refits, the two-stage ARC refits (sigmoid by Nelder-Mead), Table 4 and 5 checks, run schedule, model-card throughput, CI sizes, Table 7 token shares, Figure 17 separation. Writes `inputs/recompute.json`.
- `mk_paper.py`: card (with the verdict line and the Notion Takeaway verbatim), Further reading, `window.PAPER` (tables, recompute results, figure points).
- `check_page.mjs` (from the repo root: `node technical_knowledge_base/reference/papers/llama_3_herd/src/check_page.mjs`): every control in light 920 and dark 390, the three animations stepped, text at least 11 px, no NaN, no sideways scroll; mid-animation shots to `../.shots/x-*.png`.
- `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the page carries it, verified against the built HTML.
- `inputs/`: paper text and table extracts, `figs.json`, `recompute.json`, the Llama 3.1 model card and the 8B and 70B config.json files.
- `viz_ideas.md`: ideas built and rejected (rows `P-llama_3_herd.*` for the log).

## Parts

HTML: `00_top`, `01_css` (reference copy), `01b_css` (stacked bars, Table 2 shading), `02_header`, `03_paper`, `04_fit`, `05_run`, `06_tables`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference copies), `12_js_data` (table helpers, interval lookup), `13_js_read`, `14_js_post` (post-training animation), `20_js_fit`, `21_js_run` (mesh, memory, pipeline simulator, replay), `22_js_tables`, `90_js_tabs`.

## What reproduces and what does not

- Reproduces independently: parameters 8.03B, 70.55B, 405.85B; 6ND = 3.80e25; IsoFLOPs minima within 0.25%; the power law (α 0.5368, A 0.2995 against the legend's 0.537, 0.299) and "402B on 16.55T" at 4.0e25 FLOPs; the drawn ARC sigmoid (floor 0.25 and ceiling 1 fixed, slope and midpoint refitted); the paper's printed CIs from its formula; Table 4 products; the pipeline bubble formula (simulation).
- Does not reproduce: the text's (0.53, 0.29) give 10.5T; at the stated 3.8e25 the refit gives 16.1T and 393B; Table 5's faulty-GPU 30.1% (148/419 is 35.3%) and hence "58.7% GPU"; Table 4's 41% MFU (40.4%); the API-Bank gap "0.6%" (Table 22 shows 0.3); Table 7's 846.1 average (847.1 from rows).

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 384 actions, 0 problems. `mk_coverage.py`: 112 of 112 verified.
