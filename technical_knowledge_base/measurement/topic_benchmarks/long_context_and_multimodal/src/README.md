Source of the interactive HTML on the Notion page "Long-context and multimodal benchmarks" (child of Topic: benchmarks, 3c65c17b0d0d811fb43fece56e40041a).

Build: `python3 mk_data.py && sh build.sh` writes `../index.html` (about 130 KB). Checks: `python3 recompute.py` (writes `recompute_out.json`), `node check_page.mjs` (every control at 390 dark and 920 light, JS against `recompute_out.json`, card screenshots into `../.shots/c-*.png`), `sh ../../../../../html_utils/checkpage.sh ..`, `python3 mk_coverage.py` (after build).

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page), with one departure: the page covers two families, so the Reading tab runs long context first, then multimodal, joined by the shortcut each generation of benchmark closed (literal match, blind answerability). About 23 minutes of reading because the page owns every benchmark of both families.

Files:
- `parts/20_read_a..d.html` Reading (in one screen, long context, NIAH, lost in the middle, RULER, NoLiMa, beyond retrieval, 2026 frontier, advertised vs effective, multimodal, MMMU and MMMU-Pro, charts and documents, video, audio, use now, mistakes). `22_js_read.js`: needle pair, lost-in-the-middle chart, NoLiMa animation (Direct / one-hop / two-hop, with or without answer options), MMMU animation (blind test / MMMU-Pro steps), half-widths.
- `30_tab_eff.html`, `31_js_eff.js`: Effective length tab (RULER Table 3, NoLiMa Tables 3 and 10).
- `34_tab_mrcr.html`, `35_js_mrcr.js`: a real OpenAI MRCR row and `difflib.SequenceMatcher` ported to JS (exact against Python on 64 random and mutated pairs and the six presets).
- `21_js_rd_common.js` (animation controller), `01_head.html`, `05z_errbox.js.html`, `99_js_tabs.js` copied from the Math sibling; `02_css.html` adds this page's styles.
- `data.py`: every published table used, transcribed from the extracts in `inputs/` (arXiv HTML text of NoLiMa v3, RULER v3, Lost in the Middle v3, MMMU v4, MMStar v2, MMMU-Pro v3, Video-MME-v2 v1, abstracts; the NoLiMa README; the MRCR dataset card). `mk_data.py` writes `parts/11_js_data.js` (ASCII only: the MRCR replies contain two em-dashes, kept as `—` escapes so the data stay exact and the source holds none).
- `mk_mrcr.py`: extracts row 170 of `openai/mrcr` `2needle/2needle_0.parquet` (MIT) into `inputs/mrcr_row.json`; the 190 MB parquet stays outside the repo.
- `coverage.json` (`mk_coverage.py`): the root atlas rows and root mentions this page owns, each found on the page. No old page existed (`src/live.md` not applicable).
- `viz_ideas.md`: ranked visual ideas, rejected ones.

Not redistributed: NoLiMa's needle set (Adobe Research licence, non-commercial, redistribution needs the licence attached); the page quotes the paper's own example.
