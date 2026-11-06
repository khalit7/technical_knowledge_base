# Visualisation ideas: Document ingestion and multimodal retrieval

The question the page keeps returning to: **how much of a document survives the trip from file to retrievable chunk, and what does each way of making that trip cost?** A visual earns its place when it makes survival or cost measurable on real files.

Existing visuals on neighbouring pages: none on ingestion. The root's Pipeline lab starts from already-clean text (QASPER as parsed by S2ORC); the rerankers page owns MaxSim (so the page-image tab does not re-animate MaxSim on text, only on patches).

Scores: 0 to 2 per question (parameter the reader moves; reproduces a published figure; computable from public data; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; animatable before/after). Reproduce and computable count double.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| 1 | **One page read three ways, animated** (page 1 of arXiv 1909.00175): every text line drawn as a box at its PDF coordinates and lit in output order for the content stream (PyMuPDF), pdfplumber's lines (34 of 60 cross the gutter) and Docling's order (stamp dropped); counters for column switches and gutter-crossing lines. Built as lines, not blocks: a block-level first draft showed nothing, because pdfTeX's stream order is already near reading order; pdfplumber is the real before | 15 | Reading s1 | built |
| 2 | **Parser viewer**: the same page parsed by every tool, side by side with the page image; evidence spans (QASPER) and olmOCR-bench test strings highlighted pass/fail (a word-level diff against the best output was dropped: the checks already locate each failure) | 14 | Own tab | built |
| 3 | **Evidence survival and retrieval recall per parser** (QASPER, 24 papers): stacked bars intact/damaged/lost and BM25 recall@k | 13 | Reading s3 | built |
| 4 | **olmOCR-bench sample per category** heat table, with the published table beside it (authors' runs vs vendor runs vs here) | 12 | Reading s3 | built |
| 5 | **Table before/after**: a real QASPER table (page crop) as each parser emits it, the LaTeX ground-truth grid, cells found, body adjacency F1 and a header-association score per parser; toggle raw / rebuilt grid / row serialisation. Header association was added after the first scoring: plain adjacency F1 ranked MinerU above Docling although MinerU's headers were split mid-word | 13 | Own tab | built |
| 6 | **Re-indexing animation**: arXiv v(n-1) to v(n) of 10 real papers chunked four ways, each new chunk decided in turn (hash seen or not), with the diff track above and the floor line; default paper 1801.02073, where one inserted initial re-embeds all 17 fixed chunks | 14 | Own tab and a predict block in Reading s8 | built |
| 7 | **Page-image vs OCR-text retrieval** on three ViDoRe sets: nDCG@5 for BM25 on Tesseract text, dense on Tesseract text, colSmol page images; published ColPali numbers beside; per-query browser showing the top pages from each | 13 | Own tab | built |
| 8 | Chunk record (metadata) shown as a real JSON record | 6 | Reading s7 | built (static) |
| 9 | Interactive "draw your own table" structure editor | 5 | none | rejected: illustrative only, no real data |
| 10 | Embedding-space projection of page images | 4 | none | rejected: a 2-D projection of 1,030-vector pages misleads; MaxSim is not a single-vector geometry |
| 11 | Throughput bar chart of parsers from vendor tables | 5 | none | rejected as a chart: vendor throughputs are on different hardware (B200 concurrent vs L4 vs CPU); the vendor's numbers are quoted in prose with their hardware |
| 12 | Predict-then-reveal blocks (evidence loss, re-indexing, page images) | 9 | Reading s3b, s8, s10 | built |
| 13 | Evidence survival bars with recall@3 beside them | 12 | Reading s3b | built (the finding that recall barely moves is the point) |

What the methodology lacked for this page: a rule for a page whose "published figure" is a benchmark score measured on a different sample; here the sample score is shown beside the published one with sample size and interval, never as a reproduction.

## Rebuild of 2026-10-24 (teaching contract)

| # | Idea | Placement | Status |
|---|---|---|---|
| 14 | **Hero: two routes from a file to an index** (parse route with each stage's measured loss or cost; page-image route), boxes link to sections | Reading top | built (static SVG, horizontal at 820 px and up, stacked below) |
| 15 | **Rule-based thresholds**: glyphs to lines, lines to boxes, boxes to an order with LAParams defaults; good and interleaved orders on two columns | Reading s2 | built (static, illustrative glyphs) |
| 16 | **OCR routing**: text-layer check, then extract, classic OCR or VLM OCR, with this page's times | Reading s5 | built (static) |
| 17 | **Record beside its page**: page 3 of 1909.00175 rendered, the Docling bounding box drawn where the record says | Reading s8 | built (real data) |
| 18 | **ColPali patches and cost to scale**: a ViDoRe page squeezed to 448 px with the 32 by 32 grid; storage and indexing bars to scale from paper Tables 4 and 5 | Reading s10 | built |
| 19 | Docling pipeline figure (the report's Figure 1, CC BY 4.0) | Reading s3 | built (real image) |
| 5, 6, 7 | Table lab, Re-indexing lab, Page-image retrieval moved from their tabs into Reading s6, s9 and s11 beside the claims they prove | Reading | moved |
| 20 | DocLayNet example pages with layout boxes | none | rejected: arXiv non-exclusive licence |

## The 2026-11-06 pass (split layout, 3D stages on renderer v2)

| # | Idea | Placement | Status |
|---|---|---|---|
| 21 | **Fig. 1 hero as a 3D stage** (`28a_sc_hero.js`, 5 steps): the real page 1 of 1909.00175 lying on the floor with its 90 text lines lifting off as the text layer; the parse route as four stations and an index of one vector per chunk, flows between them; the page-image route in front (the page squeezed square, a 32 by 32 glass grid, a glass block of patch vectors, a multi-vector index) | Reading top | built; replaces #14 (its numbers are in the step list, each step links to its section) |
| 22 | **Fig. 2 reading orders as a 3D stage** (`28b_sc_anat.js`, 4 steps): the page image flat, each of the 90 lines a slab at its PDF coordinates, the order path drawn as it is built with dots streaming along it; stream order (camera in close on the stamp), pdfplumber's 60 merged lines (34 cross the gutter, in orange), Docling's columns and the dropped stamp | Reading s1 | built; replaces #1 (a 60 to 90 frame replay with a mode toggle; now one explained step per reader) |
| 23 | **Fig. 6 re-indexing as a 3D stage** (`28c_sc_cd.js`, 6 steps): the new version's words to scale with pins on the changed words, the chunks of each strategy as slabs (green reused, orange through a glass embedding-model plate into the vector store), then the ten-paper shares against the floor; a paper picker replays it | Reading s9 | built; replaces #6 (17 to 130 per-chunk frames per mode, now one step per chunker) |
| 24 | **Fig. 7 ColPali as a 3D stage** (`28d_sc_cp.js`, 7 steps): page, squeeze to 448, patch grid, one patch's vector, the block of 1,030 vectors, MaxSim from five query tokens (positions illustrative, said on the page), pooling at factor 3, storage and indexing time to scale | Reading s10 | built; replaces #18 |
| 15, 16, 17, 19, 3, 5, 7 | Kept 2D in the right column: rule thresholds and OCR routing are flat flow diagrams; evidence bars and nDCG bars are numbers on an axis; the table lab and the per-query browser are tables and thumbnails; the record is code beside a real page; the Docling figure is a real image | Reading | split, kept |
| 25 | A 3D table (cells as a grid in depth, header rows lifted) | none | rejected: a table reads best flat, and the lab already shows the grid each parser implies |
| 26 | MaxSim with real per-patch similarities from colSmol-256M on one page | none | proposal: needs a colpali-engine run on one page and one query (about a minute on CPU, model download about 0.5 GB); not run under the no-heavy-compute rule |
