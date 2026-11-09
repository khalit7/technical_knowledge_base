Source of the interactive HTML for "Long-context and multimodal benchmarks" (child of Topic: benchmarks, 3c65c17b0d0d811fb43fece56e40041a). Page prefix none (ids by section), storage key `bench-lcmm-tab`.

## Build and checks
`python3 mk_data.py && sh build.sh` writes `../index.html` (about 140 KB). Checks, from the repository root unless said:
- `sh html_utils/checkpage.sh <page>`: must end `fail=0, emdash 0, errbox 1, clipped 0`.
- `python3 recompute.py` (in `src/`, writes `recompute_out.json`), then `node <page>/src/check_page.mjs`: every 2D control at 390 dark and 920 light, JS against `recompute_out.json`, card screenshots into `../.shots/c-*.png`. `node <page>/src/check_stages.mjs [shots dir]`: the three 3D stages (autoplay in view, last step in every mode, one list item per step, no redraws off screen, still under reduced motion, splits two columns at 1400 px only) and every number in their step lists against `window.LCS`.
- `python3 check_seqmatch.py` (the JS SequenceMatcher port against difflib, 64 pairs), `python3 mk_coverage.py` (after build: root atlas rows this page owns).
- `python3 html_utils/ledger.py check <page>`: problems 0.
The reading time in `parts/10_header.html` is set by hand from `html_utils/audit_pages.mjs`.

## Files
- `parts/20_read_a..e.html`: the Reading tab. a: core idea, hero (the shortcut ladder, static HTML), You need, new terms, one-screen table, find / connect / aggregate. b: needles (Kamradt pair and the real Claude 2.1 heatmap), lost in the middle, RULER and the effective-length chart (moved in from its own tab), NoLiMa stepper. c: beyond retrieval (BABILong, Michelangelo, HELMET, LOFT, LongBench v2), MRCR with the real row and grader (moved in from its own tab), real documents. d: multimodal, MMMU and the blind/MMMU-Pro stepper, POPE and CircularEval card, charts/documents/OCR with the ANLS worked table, video and audio. e: how to read a score, the dated readings table (closed), what to use now.
- `22_js_read.js` (needle pair, `window.LC_overlap`), `31_js_eff.js` (effective-length chart), `35_js_mrcr.js` (MRCR map and grader), `41_js_sc_mid.js`, `42_js_sc_nl.js`, `43_js_sc_mm.js` (the 3D stages, Figs. 1 to 3); `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` are the explainer-page templates, unchanged except the storage key.
- `data.py` and `inputs/`: every published table used, transcribed from the extracts (NoLiMa v3, RULER v3, Lost in the Middle v3, MMMU v4, MMStar v2, MMMU-Pro v3, Video-MME-v2, abstracts, NoLiMa README, MRCR dataset card, `loft_ocrbench_extract.md` new on 2026-10-24). `mk_data.py` writes `parts/11_js_data.js` (ASCII only). `inputs/mrcr_row.json` is stored with `\u` escapes so the source holds no em-dash (two MRCR replies contain one).
- `mk_mrcr.py`: extracts row 170 of `openai/mrcr` (MIT); the 190 MB parquet stays outside the repo.
- `recompute.py`: every derived number (effective lengths, overlaps, MMMU-Pro deltas, MRCR grades, half-widths, and since 2026-10-24 the ANLS examples, POPE always-yes F1 66.67 and CircularEval always-A).
- `img/niah_claude21_heatmap.webp` (Greg Kamradt, MIT; `../img/CREDITS.md`).
- `ledger.json`, `coverage.json`, `viz_ideas.md`.

## What changed on 2026-10-24, and why (teaching contract rebuild)
- **Top**: the core idea in one sentence (a score measures use of the input only if the benchmark removes the shortcut) and a hero figure: two lanes of benchmarks, each step naming the shortcut it closed and the score before and after (GPT-4o 99.3% to 69.7%; GPT-4V 45.1% blind of 53.6%; OpenFlamingo 36.7% to 2.6%). You need and six new terms.
- **Tabs folded into Reading.** Effective length and Grade a real MRCR item each explained one mechanism, so both now sit beside the claim they prove (RULER's definition; MRCR's grader). Tabs: Reading and Further reading.
- **Absorbed** (this page now owns them): from Agentic retrieval, the RULER claimed/effective examples and the Qwen3 board contradiction (82.1 and 77.8 at 64K marked effective); from Evaluating generative models, POPE (yes-rate 95.4 to 99.1%, always-yes F1 66.67), MMBench CircularEval (OpenFlamingo 36.7% to 2.6%), MMStar's 1,500 samples and OCRBench's five parts. New: LOFT (Table 2 at 128K) and OCRBench v2, with a POPE/CircularEval card and an ANLS worked table, both derived in `recompute.py`.
- **Volatile scores** gathered into one dated table (closed) with each benchmark's 95% half-width; prose keeps only the comparisons that teach (vendor against independent MRCR, two GDP.pdf harnesses).
- **Real image**: Kamradt's own Claude 2.1 heatmap beside the needle test.
- **Never autoplay**: template `21_js_rd_common.js`; mode buttons still play after the reader clicks.
- **Fat removed**: the common-mistakes list (each mistake restated a section; the two unique facts, the MMMU test top of 65.9% and "a vendor's best bin is not a model's 1M score", moved into their sections), the separate "advertised against effective" section (its examples sit in the effective-length section), tab pointers and wind-ups. RULER's task list, NoLiMa construction, MMMU splits and MMMU-Pro filter details moved to closed blocks. The MRCR viewer now opens on the short request rather than a 350-word reply.
- Further reading: Long context, Vision-language models, Evaluating generative models, Agentic retrieval, LOFT, POPE, MMBench, OCRBench added; the Continued Pretraining link now names its current page (Data mixing, same id).

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading core | 4,568 words, 20 min | 5,734 words, 25 min |
| Reading in closed details | 0 | 878 words, 4 min |
| Other tabs (core) | Effective length 330, MRCR 835, Further reading 600: 8 min | Further reading 706: 3 min |
| Visuals inline (audit: svg, img) | 3 | 6 (plus 4 HTML figures: hero, MRCR map and grader, bias card, ANLS table) |

The whole subject's core went from 25 minutes (Reading plus the two lab tabs it kept sending the reader to) to 25 in one flow, while absorbing LOFT, POPE, MMBench, OCRBench, ANLS and the Qwen3 correction. The length is right because the page owns about 25 benchmarks across two families and the ledger is mostly core (216 core against 23 depth); each benchmark is now its construction, its scoring and the number that shows what it catches. What could still go: the one-screen table (kept as the map) and the beyond-retrieval table's construction column.

## Ledger
`ledger.json`: 291 units (273 from the page as built on 2026-10-04, 18 added: absorbed, new or script-rendered): core 216, depth 23, volatile 19, fat 33; problems 0.

Not redistributed: NoLiMa's needle set (Adobe Research licence, non-commercial); the page quotes the paper's example.

## 2026-11-09: split layout, three 3D stages, explained and autoplaying step lists (the 2026-11-06 rollout)
- **Templates** `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `bench-lcmm-tab`) copied unchanged; `build.sh` cats `02_split.html` after `02_css.html` (which closes `<head>`). The page's `.an-ctl` grid rules no longer reach the stage bars (`:not(.stg-bar)`). New page CSS: `.s3side.lc-ns` (a right column that scrolls with the text instead of sticking, for the effective-length card and the MRCR grader, both taller than a window) and the hero's two lanes standing side by side, arrows down, in the right column.
- **Three stages**, each with an `ol.sx` step list on the left and no per-step caption; scenes publish what they draw in `window.LCS`, which `check_stages.mjs` checks against the lists:
  - Fig. 1 `stg-mid` (5 steps, `41_js_sc_mid.js`) replaces the 2D lost-in-the-middle chart and its model select: the prompt as 20 passage tiles, the answer passage (blue) sliding from position 1 to 20 with flows to the model, GPT-3.5-Turbo's column at each measured position (75.8, 57.2, 53.8, 55.4, 63.2), the closed-book (56.1) and oracle (88.3) as glass planes with positions 10 and 15 turning orange, then all six models of Table 6 as rows with their spreads. Data `LD.litm`.
  - Fig. 2 `stg-nl` (6 steps, `42_js_sc_nl.js`) replaces the 2D NoLiMa stepper, its three mode buttons and the options checkbox: one haystack (a block per 1K tokens, growing 8K to 32K) with the needle at mid depth, the question card, flows straight to the needle for a literal match and through glass "fact" plates for one and two hops (fewer dots where accuracy is lower), and a bar field of the five question kinds by 8K, 16K, 32K (Table 6 via `LD.nolima.t6`). The five modes became one explained sequence.
  - Fig. 3 `stg-mm` (2 modes, 4 and 5 steps, `43_js_sc_mm.js`) replaces the 2D MMMU stepper and its model select: a question card whose image plate is lifted away (blind test, GPT-4V in front and Gemini Pro Vision behind, MMStar Table 3) or, for MMMU-Pro, a question stack that halves at the filter, options growing from 4 to 10 and the text moving onto the image (vision-only), then all eleven models of Table 1 as rows from MMMU validation to the MMMU-Pro score. Chips `#mm-mode` swap the two lists.
- **Splits**: the idea (text beside the 2D hero ladder); needles (text beside the needle pair and Kamradt's heatmap); lost in the middle (Fig. 1); RULER (text and the predict prompt beside the effective-length card); NoLiMa (Fig. 2); MRCR (text, formula, predict and version trap beside the row viewer and grader); MMMU (Fig. 3); POPE and MMBench (beside the bias card); DocVQA (beside the ANLS table). Full width: the one-screen table, Beyond retrieval (a table), Real documents, Multimodal, the five chart/OCR cards, Video and audio, How to read a score and Further reading.
- **Kept 2D**: the hero (a ladder of text and pairs of numbers), the effective-length dumbbells and curves (a log length axis, a threshold slider), the MRCR map and grader (a reader tool on real text), the POPE confusion grid and CircularEval rotation, the ANLS table and every score table. No 3D needle surface by depth and length: the page holds no depth-by-length data beyond Kamradt's image, and reading values off it by eye is not allowed; Kamradt's own heatmap stays as the real image.
- **Correction**: the MMMU-Pro paragraph said every model "lost 13 to 27 points overall"; the paper (`inputs/mmmu_pro_v3_extract.txt`) and Table 1 give 16.8 to 26.9 (MMMU validation minus the MMMU-Pro score), now the text and ledger key.
- **Checks**: `check_stages.mjs` (new, adapted from Coding benchmarks); `check_page.mjs` lost its NoLiMa, MMMU and lost-in-the-middle loops (now stages) and its never-autoplay block (inverted in `check_stages.mjs`).
- **Ledger**: 291 units (core 216, depth 23, volatile 19, fat 33), problems 0; keys re-set for units 46, 69 and 160.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 5,734 to 6,411 words (24.9 to 27.9 min), closed 878 unchanged (3.8), Further reading 708 unchanged; visuals counted 6 to 6 (three SVG animations became three canvases). The growth is the step lists, which carry what the script captions said (text the audit did not count) plus the explanation of each stage; about 0.7 min of it is the MMMU-Pro list, hidden until its chip is chosen.
