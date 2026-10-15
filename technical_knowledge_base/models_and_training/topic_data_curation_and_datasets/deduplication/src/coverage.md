# Coverage: the old "Filtering, dedup, and the curation pipeline" page, section 3 (Deduplication)

New page; the old dedup notes (root's src/read/old/02_filtering_dedup_pipeline.md, section 3, and the related lines of
01 and 00) are treated as unverified notes. Each claim, verified or corrected:

| Old claim | Status | Where on this page |
|---|---|---|
| Duplicates waste compute and amplify memorisation (Lee et al. 2021) | verified, with Table 4 numbers | section 2 |
| "degrades quality, but interacts with quality in non-obvious ways" | verified and sharpened: benchmark effects mixed (Pythia, Muennighoff, DCLM, FineWeb) | section 2 |
| Exact: hash docs or URLs; trivial, always do it | verified; added paragraph/line units, collision math, Dolma and Llama 3 numbers | section 3 |
| FineWeb MinHash: 5-grams, 112 hashes in 14 buckets of 8, catching ~75%+ | verified (FineWeb App. E.1, datatrove minhash.py:51-54) | sections 4, 12 |
| "documents sharing a bucket are duplicates" | corrected: candidates; clusters are connected components, which chain; FineWeb has no verification | section 5 |
| Per-snapshot dedup beat global | verified (FineWeb 3.4) | section 2 |
| "Global dedup preferentially kept the oldest copy of everything" | CORRECTED: FineWeb ran from the newest crawl back, so the newest copy was kept and the oldest crawls lost up to 90%; the problem was that what survived in old crawls was low quality | section 2 |
| "what survived ... was disproportionately low-quality boilerplate" | partly: the paper says lower-quality data, not specifically boilerplate | section 2 |
| Suffix arrays (RefinedWeb, Lee et al.): remove 50+ token spans; expensive, memory-heavy | verified; costs quantified (Lee App. B; measured here) and "remove" clarified as every copy | section 7 |
| RefinedWeb ran both | verified (MinHash then ExactSubstr) | sections 7, 12 |
| Bloom-filter dedup (Dolma toolkit): fast paragraph dedup in Rust, approximate | verified; false positives measured by the root lab; DCLM's BFF added | section 8 |
| Semantic dedup (SemDeDup, D4, NeMo Curator) removes paraphrase-level redundancy; gains smaller than fuzzy dedup's; risks pruning diversity; more for synthetic and SFT | partly: published gains are mixed (SemDeDup on LAION large, DCLM shows no gain as selection); "smaller than fuzzy dedup's" not supported by a direct comparison, dropped | section 9 |
| TxT360 and FineWeb2 keep duplicate counts and rehydrate | verified with both schemes (TxT360 3/5/8/10; FineWeb-2 filtering-rate weights) | section 12 |
| "Classifier choice/threshold dominates dedup-method choice (DCLM)" | consistent with DCLM Tables 4 and 17 (dedup methods differ by up to 2.1 Core at 1B; filtering by up to 4.1); not repeated here (the quality classifiers page owns it) | none |
| Old root tooling table: NeMo Curator "RAPIDS cuDF" fuzzy/semantic dedup | updated: 1.4.0 is Ray-based; connected components with cuGraph | sections 5, 10 |
