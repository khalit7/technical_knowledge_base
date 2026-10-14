# Dedup lab: visual ideas

## Built
- **Same 14 documents before/after each method** (animated steps: exact, MinHash, C4 spans, suffix array with the share of each document cut, semantic). Real documents, fates from the full 2,692-document run; shows chaining, remove-all semantics and paraphrase spam.
- **MinHash estimate against true Jaccard** for 856 pairs with the binomial band; shows the uint64 wrap-around in datatrove's hash does not matter, and the selection bias of low pairs.
- **Bands and rows explorer over measured pairs**: real 112-bit equality masks embedded, candidacy recomputed in the browser for any b x r up to 112, formula line on top, counts of misses and below-target candidates. Goes beyond the Reading tab's published-points S-curve.
- **Big settings table** (286 and 9,000 hashes) measured on the same pairs: RefinedWeb's two readings side by side.
- **Hand-labelled boundary pairs** (B/S/T/D) with filters, and the **cluster browser** (31 clusters with kinds).
- **Suffix array toy**, live in the browser (suffixes, sorted with LCP, marked spans, removed in documents) with an L slider; measured bytes against L for three stages with remove-all and keep-one curves.
- **Bloom filter toy** (32 bits, k slider, real repeated lines, false positives in red) and measured Dolma false positives against the streaming formula.
- **Semantic scatter** (Jaccard against cosine) with an eps line; across-crawl Jaccard histograms; a cost calculator.

## Rejected
- Redrawing the published S-curve (the Reading tab has it).
- Showing full texts of cluster members or labelled pairs: they include personal names (reviews, member pages, a bio); hostnames and hand descriptions instead.
- A pure-Python suffix array on the running example: the real tool builds; the toy covers the idea.
- A semantic-dedup 2-D embedding map (t-SNE/UMAP): distances in a projection mislead about the cosine cut that matters.
