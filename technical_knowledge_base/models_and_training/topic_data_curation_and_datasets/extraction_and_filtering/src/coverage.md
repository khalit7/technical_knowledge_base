# Coverage of the old page "Filtering, dedup, and the curation pipeline"

Source: the root's `src/read/old/02_filtering_dedup_pipeline.md` (fetched 2026-10-14). Every claim, checked 2026-10-15.

| Old claim | Verdict | Where now |
|---|---|---|
| Best resources: FineWeb blog, DCLM, RefinedWeb, Lee et al., SemDeDup, datatrove | Kept the ones on this page's subject (FineWeb paper, DCLM, RefinedWeb, datatrove); Lee et al. and SemDeDup belong to Deduplication | Further reading; Deduplication sibling |
| Pipeline order URL, extraction, LID, heuristics, model filter, dedup, decontamination, PII | Corrected: FineWeb ran per-crawl MinHash before C4 and custom filters (paper 3.7); datatrove's example puts dedup after; "cheapest first" kept | Reading s12, s15 |
| WET noticeably worse than WARC re-extraction | Verified (FineWeb 3.2, DCLM Table 3) and measured (877 vs 2,692 kept) | s3, s13 |
| "even after WET was aggressively filtered" | Corrected: both arms had only fastText English filtering, no dedup | s15 |
| trafilatura best quality, Python, slower | Verified with nuance: WCEB paper's top single tool; here readability ties it on token F1; about 8x slower than resiliparse (DCLM) | s2, s3 |
| resiliparse ~4x faster | Corrected: DCLM Table 16 8.1x per core; about 28x here (rough) | s2, s15 |
| DCLM found resiliparse comparable to trafilatura, far better than WET | Verified (24.1 vs 24.5 vs 20.7 Core) | s3 |
| PDFs need own stack (Docling, olmOCR, marker); FinePDFs and Dolma 3 PDFs | Partly: Dolma 3's science PDFs used olmOCR (root facts); tool list not checked here; PDFs owned by Pretraining corpora | s15 |
| C4 rules: terminal punctuation, lorem ipsum, braces, fewer than 3 sentences, bad words | Verified against T5 paper and TFDS code; added: lines of 5+ words, JavaScript lines, policy lines in code; datatrove swaps 3 and 5 | s7, s8 |
| Gopher: 50 to 100k words, mean word length 3 to 10, symbol ratios, bullet/ellipsis fractions, "80% lines with alphabetic character", stop words | Corrected: 80% of WORDS; rest verified (Gopher App. A) | s7, s15 |
| FineWeb three custom filters, e.g. short lines, duplicated-line fraction, about +1% | Verified and corrected: line punctuation, duplicated-line characters, short lines; found from per-crawl vs global dedup histograms; ~22% tokens removed, ~1% aggregate | s7, s15 |
| Model-based classifiers (DCLM, FineWeb-Edu, Nemotron-CC buckets, perplexity) and the "practical note" | Moved: owned by Quality classifiers sibling (link) | s0 deep note |
| Deduplication section (exact, MinHash, suffix arrays, Bloom, semantic, rehydration) | Moved: owned by Deduplication sibling | link |
| Decontamination section | Moved: Decontamination, PII and governance sibling | link |
| PII: FineWeb regex anonymises emails and public IPs; NER scrubbers go further | Verified (FineWeb 3.7; datatrove pii.py in root's lab); details moved to the PII sibling | s0 deep note |
| "What moves the needle" list (WARC extraction and classifiers largest; classifier choice dominates dedup choice; per-snapshot dedup; heuristics modest; over-filtering vs token horizon) | Extraction part verified (s3); heuristics "real but modest" consistent with FineWeb's ~1% for custom filters (s7); classifier and dedup claims moved to siblings | s3, s7 |
| "For a 150-350M run on FineWeb-Edu your remaining job is decontamination" | Advice, not a fact; dropped here (belongs to the root's choosing section) | none |
