Source of the interactive HTML for "Long-context and multimodal benchmarks" (child of Topic: benchmarks, 3c65c17b0d0d811fb43fece56e40041a). Page prefix none (ids by section), storage key `bench-lcmm-tab`.

## Build and checks
`python3 mk_data.py && sh build.sh` writes `../index.html` (about 140 KB). Checks, from the repository root unless said:
- `sh html_utils/checkpage.sh <page>`: must end `fail=0, emdash 0, errbox 1, clipped 0`.
- `python3 recompute.py` (in `src/`, writes `recompute_out.json`), then `node <page>/src/check_page.mjs`: every control at 390 dark and 920 light, JS against `recompute_out.json`, card screenshots into `../.shots/c-*.png`, and a no-autoplay check (both steppers still on step 0 after scrolling into view under normal motion).
- `python3 check_seqmatch.py` (the JS SequenceMatcher port against difflib, 64 pairs), `python3 mk_coverage.py` (after build: root atlas rows this page owns).
- `python3 html_utils/ledger.py check <page>`: problems 0.
The reading time in `parts/10_header.html` is set by hand from `html_utils/audit_pages.mjs`.

## Files
- `parts/20_read_a..e.html`: the Reading tab. a: core idea, hero (the shortcut ladder, static HTML), You need, new terms, one-screen table, find / connect / aggregate. b: needles (Kamradt pair and the real Claude 2.1 heatmap), lost in the middle, RULER and the effective-length chart (moved in from its own tab), NoLiMa stepper. c: beyond retrieval (BABILong, Michelangelo, HELMET, LOFT, LongBench v2), MRCR with the real row and grader (moved in from its own tab), real documents. d: multimodal, MMMU and the blind/MMMU-Pro stepper, POPE and CircularEval card, charts/documents/OCR with the ANLS worked table, video and audio. e: how to read a score, the dated readings table (closed), what to use now.
- `22_js_read.js` (needle pair, lost-in-the-middle chart, NoLiMa and MMMU steppers), `31_js_eff.js` (effective-length chart), `35_js_mrcr.js` (MRCR map and grader); `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page templates (never autoplay).
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
