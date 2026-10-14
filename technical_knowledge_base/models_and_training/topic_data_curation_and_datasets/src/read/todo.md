# Reading tab: open TODOs

Every TODO is also visible on the page as a dashed orange box (class `rd-todo`) so it cannot ship unnoticed. Owner in brackets: the tab whose output fills it. Remove the box and this line when filled.

| # | Where | Owner | What is needed |
|---|---|---|---|
| 1 | Section 0, running example paragraph (`parts/20_read.html`) | setup | One or two sentences: the Common Crawl crawl, segment and number of WARC records; the curated corpora joined by URL with overlap counts; benchmark sets; post-training samples; models. Source: root `src/data/README.md`. |
| 2 | Section 3, page animation caption (`parts/20_read_b.html`) | pipe | Replace the illustrative library page by the Pipeline lab's real Common Crawl page, before and after trafilatura and resiliparse, with measured rule values and its real lid.176 score (keep the rule code in `parts/24_js_rd_pipe.js`, swap `LINES`, `MIRROR`, `HTML`, and the language score). |
| 3 | Section 3, page animation step 6 (`parts/24_js_rd_pipe.js`) | qual | The FineWeb-Edu classifier score and the DCLM fastText score of that real page. |
| 4 | Section 3, FineWeb funnel card (`parts/20_read_b.html`, `parts/24_js_rd_pipe.js`) | pipe | The running example's measured funnel (fraction kept after each stage, from datatrove stats) as a second series. |
| 5 | Section 3, "A detail that matters" box | pipe | Measured effect of `char_duplicates_ratio` 0.01 (datatrove default) against 0.1 (paper) on the running example. |
| 6 | Section 5, prediction answer (`parts/20_read_d.html`) | qual | Measured agreement of the FineWeb-Edu and DCLM classifiers on the running example (top-slice overlap, rank correlation). |
| 7 | Section 5, "How to check a quality filter" | qual | Hand-labelled result: share of dropped documents a human would keep; topics or formats over-represented among wrong drops. |
| 8 | Section 6, decontamination card (`parts/20_read_e.html`) | post (and pipe) | Measured overlap of the web slice and post-training samples against the benchmark sets. |
| 9 | Section 7, mid-training card (`parts/20_read_f.html`) | mix | Link the Mixing lab's token-budget animation and, when the GPU run exists, its proxy-model result. |
| 10 | Section 8, after the two lineages (`parts/20_read_g.html`) | post | The same web document before and after rephrasing by a local Qwen3 model (pending GPU run): measured change in length and classifier score. |
| 11 | Section 9, after the table (`parts/20_read_g.html`) | post | Measured statistics on the post-training samples: lengths, near-duplicate rate, contamination rate, rows a simple filter removes. |
| 12 | Child pages (`parts/20_read_i.html`) | Khalid | The child-page structure, proposed after the labs; then each section's "Go deeper" note links its child. A starting proposal is in `README.md` here. |
| 13 | Further reading, lab cards (`parts/39_tab_more.html`) | each lab | Each lab's reading time ("time to be set by the lab") and a one-line summary matching what was built. |
| 14 | Section 0 lead | read | Re-measure the Reading time once the TODOs are filled (now about 40 minutes at 200 words a minute: 7,625 words of prose and captions outside widgets, plus 1,325 in folded answers; see README). |
