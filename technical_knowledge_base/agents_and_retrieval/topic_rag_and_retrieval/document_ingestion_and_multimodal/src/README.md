# src: Document ingestion and multimodal retrieval

Build: `sh build.sh` writes `../index.html` from `parts/` (after `python3 build_data.py` has regenerated `parts/22_ing_data.js` from `data/`).

Shape: a child page of Topic: rag-and-retrieval (method `.claude/skills/explainer-page/page-kinds/topic-child.md`). Reading tab in the subject's own order (what a PDF is, extractors, layout parsers, OCR, tables, figures, metadata, re-indexing, page-image retrieval, choosing), then one tab per lab that needs room: Parser viewer, Table lab, Re-indexing lab, Page-image retrieval, Further reading. Departure from the method: no "in production now" configs section, because the subject's production facts are tool versions and measured behaviour, which sit in sections 3 and 3b.

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
The page is about 600 KB, over the 300 KB guide of the time (retired 2026-10-17; now about 1 MB for a child page): it embeds real parser outputs (13 tools on 7 pages, cut at 2,500 characters), nine small page images and the ViDoRe thumbnails. Cutting them would remove the evidence the labs show.
