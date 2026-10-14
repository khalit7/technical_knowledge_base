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
