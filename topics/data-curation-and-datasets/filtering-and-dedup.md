# Filtering, dedup, and the curation pipeline

⏱ 8 min read · +5h 45m resources

Last updated: 2026-08-24

## Best resources

- [FineWeb blog post](https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1) (~1h 30m): every stage ablated with 1.8B-param proxy runs; read this first
- [DCLM paper](https://arxiv.org/abs/2406.11794) (90 min): controlled comparisons of extractors, filters, dedup at multiple compute scales
- [RefinedWeb paper](https://arxiv.org/abs/2306.01116) (45 min): the MDR pipeline (Macrodata Refinement) that FineWeb descends from
- [Deduplicating Training Data Makes Language Models Better (Lee et al. 2021)](https://arxiv.org/abs/2107.06499) (45 min): the foundational dedup evidence
- [SemDeDup](https://arxiv.org/abs/2303.09540) (45 min): semantic dedup via embedding clusters
- [datatrove](https://github.com/huggingface/datatrove) (docs, ~30 min for the core pages): reference implementations of everything below (local/Slurm/Ray executors)

## Pipeline order

URL filtering -> text extraction -> language ID -> heuristic quality filters -> model-based
quality filtering -> dedup -> decontamination -> PII scrubbing. Order matters mostly for cost:
cheap filters first, dedup after filtering (fewer pairs), decontamination last (evals change).

## 1. Extraction

- **WET files** (Common Crawl's own text extraction) are noticeably worse than re-extracting
  from **WARC** HTML: FineWeb's ablation showed WARC + custom extraction beating WET even
  after WET data was aggressively filtered. Do not train on WET.
- **trafilatura** (RefinedWeb, FineWeb): best-quality boilerplate removal, Python, slower.
- **resiliparse** (DCLM): ~4x faster, slightly more boilerplate retained; DCLM found it
  performed comparably to trafilatura and far better than WET.
- PDFs need their own stack (Docling, olmOCR, marker); this is where FinePDFs and Dolma 3's
  scientific-PDF slice come from.

## 2. Quality filtering

- **Heuristics** (cheap, first pass):
  - C4 rules: keep lines ending in terminal punctuation, drop docs with "lorem ipsum",
    braces (JS), fewer than 3 sentences, badword list.
  - Gopher rules: doc length 50-100k words, mean word length 3-10, symbol-to-word ratios,
    bullet/ellipsis line fractions, >=80% lines with an alphabetic character, stop-word count.
  - FineWeb added three custom filters found by comparing quality signals against dedup
    survivors (e.g. fraction of lines shorter than 30 chars, duplicated-line fraction);
    together worth about +1% aggregate on their benchmark suite.
- **Model-based classifiers** (the big lever):
  - DCLM: fastText binary classifier, positives = OpenHermes-2.5 instructions + r/ELI5
    answers, keep top ~10% by score. This single choice outperformed every other filtering
    strategy they tried and is the main reason DCLM-Baseline is strong. Cheap to run at scale.
  - FineWeb-Edu: Llama-3-70B-Instruct scored 450k FineWeb docs 0-5 for "educational value";
    a small embedding-based regression head (Snowflake-arctic-embed) was distilled from these
    annotations and run over all 15T tokens; threshold >=3 gives the 1.3T-token Edu cut.
    Dramatic gains on MMLU/ARC/OpenBookQA at equal compute; mild losses on some narrative
    tasks (HellaSwag), reflecting the narrower register.
  - Nemotron-CC: ensemble of three classifiers, bucket documents into 5 quality tiers rather
    than binary keep/drop; low tiers get rephrased or downweighted, not discarded. Preserves
    ~4x more unique tokens at comparable quality, which matters for long token horizons.
  - Perplexity filtering (CCNet lineage): KenLM trained on Wikipedia, drop high-perplexity
    docs. Mostly superseded; keeping only "Wikipedia-like" text limits diversity, and both
    FineWeb and DCLM found classifier approaches strictly better.
- **Practical note**: every classifier encodes a target distribution. FineWeb-Edu's optimizes
  knowledge benchmarks; DCLM's optimizes instruction-flavored helpfulness. Pick (or ensemble)
  according to what you want the model to be good at.

## 3. Deduplication

- **Why**: duplicated text wastes compute, amplifies memorization (Lee et al. 2021), and
  degrades quality; but dedup also interacts with quality in non-obvious ways.
- **Exact**: hash whole docs (xxhash/sha) or URLs. Trivial, always do it.
- **Fuzzy: MinHash + LSH** (the workhorse): shingle into n-grams (FineWeb: 5-grams, 112
  hashes in 14 buckets of 8, catching ~75%+ similarity), documents sharing a bucket are
  duplicates. FineWeb's key finding: per-snapshot dedup beat global dedup across all
  snapshots. Global dedup preferentially kept the oldest copy of everything and what
  survived 90+ snapshots of dedup was disproportionately low-quality boilerplate; per-dump
  dedup performed better despite leaving cross-dump duplicates.
- **Exact substring: suffix arrays** (RefinedWeb, Lee et al.): remove any 50+ token span
  repeated verbatim across docs. Expensive (memory-heavy) but catches templated spans MinHash
  misses. RefinedWeb ran both.
- **Bloom-filter dedup** (Dolma toolkit): fast paragraph-level dedup in Rust, approximate.
- **Semantic dedup** (SemDeDup, D4, NeMo Curator's GPU implementation): embed documents,
  cluster, drop near-neighbors within clusters. Removes paraphrase-level redundancy; gains
  are real but smaller than fuzzy dedup's, and it risks pruning legitimate diversity. Used
  more for synthetic data and SFT sets than for raw web.
- **Dedup as upsampling policy**: TxT360 and FineWeb2 keep duplicate counts and re-inflate
  ("rehydrate") high-quality documents deliberately: dedup gives you the knob, mixing decides
  the setting.

## 4. Decontamination

- Remove benchmark test data from training corpora: standard is n-gram overlap (GPT-3 used
  13-grams; most groups use 10-13-gram exact or near-exact match against eval sets), plus
  longest-common-substring ratios; embedding similarity for paraphrased leakage.
- DCLM checked whether their gains came from contamination and found they did not (notably
  for MMLU); still, always decontaminate against **your own eval suite** (for a small model:
  HellaSwag, ARC, MMLU, PIQA, WinoGrande, GSM8K, HumanEval) so your curves are trustworthy.
- Beware: over-aggressive decontamination (short n-grams, common phrases) silently removes
  good data. Log what you drop and eyeball it.
- Contamination checking from the eval side lives in
  ../evaluation-and-llm-judges/.

## 5. PII scrubbing

- Standard practice (FineWeb): regex-anonymize email addresses and public IPs to fixed
  placeholders. Phone numbers and physical addresses are noisier to detect; most web corpora
  stop at email/IP.
- Presidio-style NER scrubbers and NeMo Curator's PII module go further when compliance
  demands it. Opt-out honoring (robots.txt after the fact, takedown lists) is now standard
  for redistribution.

## What moves the needle (ablation evidence, condensed)

1. Extraction from WARC and model-based quality filtering are the two largest effects
   (FineWeb, DCLM agree).
2. Classifier choice/threshold dominates dedup-method choice (DCLM).
3. Dedup helps, but scope matters: per-snapshot MinHash > global (FineWeb).
4. Heuristic filter stacks are worth a real but modest amount once the above are in place.
5. Over-filtering trades token horizon for per-token quality; irrelevant at 350M scale
   (you have tokens to spare), critical at 10T+ (Nemotron-CC).

For a 150-350M run on FineWeb-Edu the corpus already did all of this; your remaining jobs are
decontamination against your evals and any extra filtering of the code/math sprinkle. If you
build a pipeline from scratch, datatrove's FineWeb example config reproduces the whole thing.
