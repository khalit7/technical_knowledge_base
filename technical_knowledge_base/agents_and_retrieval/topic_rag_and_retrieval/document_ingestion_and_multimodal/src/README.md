# src: Document ingestion and multimodal retrieval

Build: `sh build.sh` writes `../index.html` from `parts/` (after `python3 build_data.py` has regenerated `parts/22_ing_data.js` from `data/`).

Shape: a child page of Topic: rag-and-retrieval (method `.claude/skills/explainer-page/page-kinds/topic-child.md`, governed by `teaching/teaching-contract.md`). Reading tab (split layout since 2026-11-06, four 3D stages): core idea, hero stage, then twelve sections in the subject's order (PDF anatomy, rule-based extractors, layout parsers, measured survival, OCR, tables, figures and other formats, metadata, re-indexing, page images, measured page images, choosing); then Parser viewer (a tool used across sections 1 to 6) and Further reading. Storage key `ing-tab`.

## Folders
- `scripts/`: every experiment, runnable from a scratch folder `ING` outside the repository: `fetch_data.py` (QASPER arXiv PDFs, all versions; olmOCR-bench sample), `fetch_vidore.py`, `parse_light.py` (rule-based extractors), `parse_models.py` (Docling, Unstructured, Tesseract), `run_mineru.py` and `run_marker.py` (batch runs), `run_parsers.sh` (the model-based ones in order), `defects.py` (hyphen, ligature, glued-word counts), `build_view.py` (Parser viewer data), `score_qasper.py`, `score_olmocr.py` (benchmark's own `tests.py`), `table_score.py`, `change_detect.py`, `page_anatomy.py` + `anatomy_order.py`, `make_record.py`, `vidore_prep.py` (Tesseract OCR of page images), `vidore_text.py` (BM25 and bge-small on OCR), `vidore_colsmol.py` and `run_colsmol.sh` (colSmol-256M on MPS under the bench lock), `vidore_eval.py`, `collect.py` (results into `data/`), `qasper_stats.py`, `select_papers.py`.
- `data/`: the small result files the page embeds, and `img/` with small grey JPEG page images. `build_data.py` turns them into `parts/22_ing_data.js`.
- `inputs/`: selected paper ids, QASPER float counts, README extracts of olmOCR-bench (v0.4.27), Marker (v2.0.0) and MinerU (4.0.12) at pinned tags, the ColPali paper's tables, Table 1 of arXiv 1909.00175 from its LaTeX source.
- `check_page.mjs` (browser check of every control), `check_data.py` (page embeds exactly the data; prose numbers match).

## Environments (outside the repo)
`ING/venv` (pypdf 6.20.1, pdfminer.six 20260107, pdfplumber 0.11.10, PyMuPDF and pymupdf4llm 1.28.2, docling 2.138.0), `ING/unenv` (unstructured 0.27.25), `ING/mkenv` (marker-pdf 2.0.0), `ING/muenv` (mineru 4.0.12), `ING/cpenv` (colpali-engine 0.3.18); Tesseract 5.4.1 and poppler 26.02 from Homebrew. A shared scratch environment runs `vidore_text.py`.

## Edits to verbatim material
- Authors' e-mail addresses on page 1 of arXiv 1909.00175 are replaced by "[e-mail address]" in the animation data and blanked in its page image (white box over y 155 to 171 pt), so no address is reproduced.
- Em dashes inside parser outputs are shown as en dashes (`build_data.py`), the knowledge base's house rule; MinerU's inline base64 images are replaced by `<!-- image -->`.

## Size
The page is about 790 KB (after the 2026-10-24 rebuild; 706 KB before), over the 300 KB guide of the time (retired 2026-10-17; now about 1 MB for a child page): it embeds real parser outputs (13 tools on 7 pages, cut at 2,500 characters), nine small page images and the ViDoRe thumbnails. Cutting them would remove the evidence the labs show.

## Rebuild of 2026-10-24 (teaching contract)

What changed and why:
- **Top**: the core idea in one sentence and a hero figure (two routes from a file to an index, each stage annotated with its measured loss or cost, boxes linking to sections), a short "You need" and four new terms. The five-bets overview, the section-0 flow chips and the neighbours paragraph were condensed into these.
- **Labs folded into Reading** beside the claims they prove: the Table lab (section 6), the Re-indexing lab (section 9) and the Page-image retrieval chart and per-query browser (section 11). Their tabs are gone; the Parser viewer stays as a tab because sections 1 to 6 all use it.
- **New visuals**: rule-based thresholds (s2), OCR routing (s5), the chunk record beside page 3 with its bounding box drawn (s8; `data/img/rec_1909.00175_p3.jpg`, rendered with pdftoppm from arXiv 1909.00175 v1, whose SHA-256 prefix matches the record), ColPali's patch grid with storage and indexing time to scale (s10), and one real image, the Docling report's pipeline figure (s3, `img/docling_pipeline.webp`, CC BY 4.0, `img/CREDITS.md`).
- **New content** within this page's ownership: a compact "other formats" table (HTML, DOCX, PPTX, XLSX) and single-vector image embeddings for image corpora (s7), both without new numbers.
- **Never autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the anatomy and re-indexing animations start on their last step (the final picture) and move only when the reader steps or presses play; a mode switch shows that mode's final order. `check_page.mjs` now asserts no step controller moves for 1.5 s after load.
- **Depth into closed blocks**: pdfminer's parameters, the layout-parser table (volatile, dated 2026-10-13), measurement protocols, published olmOCR-bench scores, per-tool costs, per-paper re-indexing, the ViDoRe protocol, one interview design question. Methodology notes that the data files carried (`ev_note`, `olm_note`, `cost_note`, table and re-indexing notes, the ViDoRe note) are now static HTML in those blocks, so the ledger can see them; the data keys remain in `data/` unused.
- **Deleted as fat**: section headings and "The problem." lead-ins, the common-mistakes list and five interview answers (each restated a section; the two mistakes that taught something new, evaluating on pre-cleaned text and vendor tables, moved into section 4), lab intros that the inline figures replace, and verbatim parser strings that the table figure now shows.
- `check_data.py`: two prose claims re-anchored to the new wording (pdfplumber's 71 lost and 1 intact; "All 17."). `check_page.mjs`: tabs list updated.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading core | 7,520 words, 33 min | 6,024 words, 26 min |
| Reading in closed blocks | 658 words, 3 min | 1,780 words, 8 min |
| Other tabs (core) | Parser viewer 767, Table lab 831, Re-indexing lab 404, Page-image retrieval 383, Further reading 401: 12 min | Parser viewer 768 (3 min, a tool), Further reading 454 (2 min) |
| Visuals inline in Reading | 2 | 11 |

The whole core read fell from about 45 minutes (Reading plus the three labs it sent the reader to) to 26, while absorbing those labs. About 1,000 of the 6,024 core words are script-rendered data (the ground-truth table, a parser's raw output, the olmOCR heat table, stat tiles, select options), which the audit counts but a reader scans. The length is right because the ledger is almost all core (264 core against 26 depth): the subject has eleven distinct stages or choices, each with its own mechanism and a measured result on the running example.

## Ledger
`src/ledger.json`: 332 units (322 from the page as built on 2026-10-14, 10 added by hand for script-rendered tables and new content): core 264, depth 26, volatile 2, fat 40, problems 0 (`python3 html_utils/ledger.py check`).

## Topic close (2026-10-24)
Further reading: the root's Pipeline lab tab reference and quoted times updated. Header unchanged (26 + 8). Every quoted sibling time now matches its header (`html_utils/check_times.py`); the ledger keys that quoted old times or tab names were re-pointed to the current text (problems 0).

## The 2026-11-06 pass: split layout, 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (added to `build.sh` after `01_head.html`), `21_js_rd_common.js`, `99_js_tabs.js` (key `ing-tab`), `05z_errbox.js.html` and the renderer `25_js_s3.js`, all copied unchanged from the skill (it sorts after `25_ing_res.js` and before the scenes). `28_ing_s3x.js` adds two page helpers on top of the renderer without changing it: a real picture laid on a flat quad (drawn in affine tiles) and PDF boxes mapped onto a page plate.
- **Four 3D stages**, one scene each, driven by the page's data:
  - Fig. 1 (`28a_sc_hero.js`, 5 steps): two routes from a file to an index on the real page 1 of arXiv 1909.00175 (`ING.anat`: its 90 text lines). The step list carries the old hero SVG's numbers and links each step to its sections. Replaces the SVG hero.
  - Fig. 2 (`28b_sc_anat.js`, 4 steps): the same page, three reading orders (`ING.anat`: PyMuPDF lines in stream order, pdfplumber's 60 lines, Docling's order and dropped stamp). Replaces the 2D replay of 60 to 90 frames and its mode toggle; each reader is one explained step, the order path drawn as the step plays.
  - Fig. 6 (`28c_sc_cd.js`, 6 steps): one revision, four chunkers (`ING.cd`), then the ten-paper shares against the floor; the paper picker replays the stage and a live readout under the step list gives the picked paper's counts. Replaces the 2D chunk-by-chunk replay (17 to 130 frames per mode); its caption and the "All ten revised papers" paragraph became steps 1 and 6.
  - Fig. 7 (`28d_sc_cp.js`, 7 steps): a ViDoRe page image into patch vectors (`ING.mm.thumbs`, InfoVQA page 55; geometry and costs from the ColPali paper, quoted in the step list). Replaces the ColPali SVG; the token-pooling paragraph became step 6. The MaxSim step's best-patch positions are illustrative and the step says so (proposal in `viz_ideas.md` #26 for real ones).
- **Split layout** (Reading): top (Fig. 1 beside the core sentence and its five steps; You need, terms and Elsewhere full width), 1 (Fig. 2), 2 (rule thresholds), 3 (Docling's pipeline figure; the parser table full width under it), 4 (evidence bars beside the evidence measurement; the olmOCR table and its notes full width), 5 (OCR routing), 6 (the table lab beside its text), 8 (the record beside its page), 9 (Fig. 6), 10 (Fig. 7), 11 twice (nDCG chart; per-query browser beside cost and protocol). Full width: 7 (no visual) and 12 (a table). Parser viewer: notes left, controls, page image, output and checks right. Further reading unchanged.
- **Kept 2D, and why**: rule thresholds and OCR routing are flat flow diagrams; evidence and nDCG bars are numbers on an axis; the table lab and the per-query browser are tables and thumbnails; the record is code beside a real page; the Docling pipeline figure is a real image. No 2D animation remains.
- **Removed**: the hero and ColPali SVG code in `23_ing_figs.js`, `24_ing_anat.js` and `33_ing_cd.js` (their scenes replace them; the per-paper table moved into `28c_sc_cd.js`), the per-step captions those replays wrote.
- **Checks**: `check_stages.mjs` new (from Agentic retrieval: autoplay on view, last step, one list item per step, reduced motion, flows stop off screen, split columns at 1400 px; plus the paper picker changes the readout). `check_page.mjs`: the never-autoplay assertion is inverted (the hero stage must play once in view). `check_data.py`: a privacy scan of the page folder (home and scratch paths, tokens; the login name looked up at run time and matched case-sensitively).

## Length judgement, 2026-11-06
| | Before (2026-11-06 audit) | After |
|---|---|---|
| Reading core | 6,024 words, 26.2 min | 6,533 words, 28.4 min (header 28) |
| Reading in closed blocks | 1,780 words, 7.7 min | 1,780 words, 7.7 min |
| Other tabs (core) | Parser viewer 768, Further reading 453 | 766, 453 |
| Visuals inline in Reading (audit count) | 11 | 11 (four of them now 3D stages) |

The core grew by about two minutes, all of it step lists: Fig. 1's five steps carry the numbers the hero SVG drew (script text, invisible to the audit before), Fig. 2's four the reader notes the old replay wrote under it one mode at a time, Fig. 7's seven the old ColPali caption. Fig. 6's steps replaced its caption and the ten-paper paragraph, so section 9 hardly grew. Nothing was cut that the ledger needs; the length is right for the same reason as before (264 core units across eleven distinct stages).

## Ledger, 2026-11-06
332 units: core 264, depth 26, volatile 2, fat 40; `python3 html_utils/ledger.py check` problems 0. Four keys re-pointed to reworded text (278 Parser viewer lead, 291 to 293 the re-indexing labels and floor); no unit relabelled.
