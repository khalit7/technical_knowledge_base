# src: Document ingestion and multimodal retrieval

Build: `sh build.sh` writes `../index.html` from `parts/` (after `python3 build_data.py` has regenerated `parts/22_ing_data.js` from `data/`).

Shape: a child page of Topic: rag-and-retrieval (method `.claude/skills/explainer-page/page-kinds/topic-child.md`, governed by `teaching/teaching-contract.md`). Reading tab: core idea, hero figure, then twelve sections in the subject's order (PDF anatomy, rule-based extractors, layout parsers, measured survival, OCR, tables, figures and other formats, metadata, re-indexing, page images, measured page images, choosing); then Parser viewer (a tool used across sections 1 to 6) and Further reading. Storage key `ing-tab`.

## Folders
- `scripts/`: every experiment, runnable from a scratch folder `ING` (the page agent used `scratchpad/rag/ing`): `fetch_data.py` (QASPER arXiv PDFs, all versions; olmOCR-bench sample), `fetch_vidore.py`, `parse_light.py` (rule-based extractors), `parse_models.py` (Docling, Unstructured, Tesseract), `run_mineru.py` and `run_marker.py` (batch runs), `run_parsers.sh` (the model-based ones in order), `defects.py` (hyphen, ligature, glued-word counts), `build_view.py` (Parser viewer data), `score_qasper.py`, `score_olmocr.py` (benchmark's own `tests.py`), `table_score.py`, `change_detect.py`, `page_anatomy.py` + `anatomy_order.py`, `make_record.py`, `vidore_prep.py` (Tesseract OCR of page images), `vidore_text.py` (BM25 and bge-small on OCR), `vidore_colsmol.py` and `run_colsmol.sh` (colSmol-256M on MPS under the bench lock), `vidore_eval.py`, `collect.py` (results into `data/`), `qasper_stats.py`, `select_papers.py`.
- `data/`: the small result files the page embeds, and `img/` with small grey JPEG page images. `build_data.py` turns them into `parts/22_ing_data.js`.
- `inputs/`: selected paper ids, QASPER float counts, README extracts of olmOCR-bench (v0.4.27), Marker (v2.0.0) and MinerU (4.0.12) at pinned tags, the ColPali paper's tables, Table 1 of arXiv 1909.00175 from its LaTeX source.
- `check_page.mjs` (browser check of every control), `check_data.py` (page embeds exactly the data; prose numbers match).

## Environments (outside the repo)
`ING/venv` (pypdf 6.20.1, pdfminer.six 20260107, pdfplumber 0.11.10, PyMuPDF and pymupdf4llm 1.28.2, docling 2.138.0), `ING/unenv` (unstructured 0.27.25), `ING/mkenv` (marker-pdf 2.0.0), `ING/muenv` (mineru 4.0.12), `ING/cpenv` (colpali-engine 0.3.18); Tesseract 5.4.1 and poppler 26.02 from Homebrew. The shared `scratchpad/rag/venv` runs `vidore_text.py`.

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
