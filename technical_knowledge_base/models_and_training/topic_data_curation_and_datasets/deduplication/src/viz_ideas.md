# Deduplication page: visual ideas

| # | Idea | What it shows, what the reader does | Data | Placement | Status |
|---|---|---|---|---|---|
| DP1 | MinHash step by step on real pairs, with an exact-Jaccard mode | Three real pairs (J 0.59, 0.86, 0.95): shingles, 8 hash functions with the minimum outlined, 112-cell signature, 14 bands, candidate verdict with its probability; the exact mode shows what MinHash replaces and the pair counts | dp_mhdemo.py (datatrove's own signer, checked) | Reading section 3 (moved 2026-10-24) | built |
| DP2 | The same pair hashed 2,000 times | Histogram of the estimate vs binomial(112, J); measured candidate rate of 24 pairs vs the S-curve for 4 settings | dp_mh_seeds.py | MinHash tab; spread chart in Reading | built |
| DP3 | Band designer | datasketch's (b, r) rule in the browser (target, hashes, FN weight, presets), measured candidate rates from 1,024-bit masks of 660 real pairs, expected false candidates over all 3.6M pairs, signature memory per 10^9 docs | dp_mh.py; datasketch lsh.py:21-48 | Reading section 3 (moved 2026-10-24) | built |
| DP4 | Union-find replay | datatrove's bucket pairs and union-find operations on the real 25-page banner cluster and two others, find paths, union by size, final removal; toggle a 0.8 Jaccard check (before/after) | dp_uf.py (equals run0's remove file) | Reading section 4 (moved 2026-10-24) | built |
| DP5 | Method comparer | 2,692 documents as a grid through exact, fuzzy (MinHash, MinHash+check, SimHash), semantic, suffix array (keep one / remove all) in sequence, every combination measured; table of all 24 x 3 | dp_compare.py | Own tab | built |
| DP6 | DCLM Table 17 scatter | Removal vs Core for 9 dedup recipes; shows the noise (Exact+MinHash below either) | published table | Reading | built |
| DP7 | SimHash Hamming vs Jaccard | 661 pairs; k <= 3 band; recall by k | dp_simhash.py | Reading | built |
| DP8 | Repeated spans vs scope and corpus | Suffix-array share at 230 bytes for run0, FineWeb 4k/16k/48k rows, four corpora | dp_sa.py | Reading | built |
| DP9 | Semantic encoders | Removals per eps for three encoders; agreement counts | dp_sem.py | Reading | built |
| DP10 | Birthday and scale calculators | Hash collisions vs bits; memory of every method's state for 10^8 to 5x10^10 documents | derived; measured per-item sizes | Reading | built |
| DP11 | t-SNE map of embeddings | | | | rejected: projections mislead about the cosine cut (as the root lab found) |
| DP12 | Suffix-array construction animation (SA-IS) | | | | rejected for now: the root lab's toy covers the sorted-suffix idea; SA-IS's induced sort is better read than watched at this depth |
| DP13 | Redrawing the root lab's S-curve sliders and 14-document before/after | | | | rejected: exists on the root; DP3 and DP5 go further |
| DP14 | Global vs per-crawl dedup on our data | | | | not possible here: needs many crawls; the root lab's CDX same-URL measurement and the pending whole-shard join cover what one machine can |

Methodology notes: the most useful new visuals were the ones that turn a randomised algorithm into a measured
distribution (DP2) and the ones that replay a tool's real operations (DP4); both need the tool's own code to be run
offline and its output checked against the pipeline's files.

## Added 2026-10-24 (teaching-contract rebuild)

| # | Idea | What it shows | Data | Placement | Status |
|---|---|---|---|---|---|
| DP15 | Hero: four keys, four kinds of copy | each step's key, what it catches, one WARC against web scale | dp_compare.json; Dolma 3 README | Reading top | built |
| DP16 | FineWeb 2013-48 bars to scale | 31B kept vs 460B removed vs 171B | FineWeb Section 3.4 | Reading section 1 | built |
| DP17 | Word-level suffix array of two pages | sorted suffixes, LCP, adjacent twins at L = 4 | illustrative, computed in the page | Reading section 6 | built (replaces the rejected SA-IS animation: the sorted list is the idea) |
| DP18 | Bloom filter bits | a false positive from two inserted lines | illustrative | Reading section 7 | built |
| DP19 | DCLM Table 22 bars | BFF removal grows with shard size | published | Reading section 7 | built |
| DP20 | Real photo or paper figure | | | | rejected: an algorithm page; diagrams teach the mechanisms better |
