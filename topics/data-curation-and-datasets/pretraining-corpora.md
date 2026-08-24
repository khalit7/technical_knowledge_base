# Pretraining corpora: lineage and current landscape

Last updated: 2026-08-24

## Best resources

- [FineWeb: decanting the web](https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1): the canonical writeup of how a modern web corpus is built, with per-decision ablations
- [FineWeb paper (NeurIPS 2024 D&B)](https://arxiv.org/abs/2406.17557): the same material in paper form
- [DCLM: DataComp for Language Models](https://arxiv.org/abs/2406.11794): controlled testbed comparing curation strategies at fixed compute
- [Nemotron-CC](https://arxiv.org/abs/2412.02595): how to keep 4x more tokens at equal quality; [Nemotron-CC-v2.1 card](https://huggingface.co/datasets/nvidia/Nemotron-CC-v2.1)
- [Dolma paper](https://arxiv.org/abs/2402.00159) and the [Olmo 3 / Dolma 3 release](https://allenai.org/blog/olmo3): fully documented open corpus lineage
- [HuggingFaceFW org page](https://huggingface.co/HuggingFaceFW): FineWeb, FineWeb-Edu, FineWeb2, FinePDFs, FineWiki, Smol-Data mixtures in one place

## The lineage

Everything starts at **Common Crawl** (CC): a nonprofit crawling the web since 2008, releasing
roughly monthly snapshots as WARC (raw HTML), WAT (metadata), and WET (pre-extracted text)
files; hundreds of TB per snapshot, petabytes total. Raw CC is unusable as-is: boilerplate,
spam, SEO farms, duplicates, adult content. The history of pretraining corpora is the history
of learning to distill it.

| Corpus | Year | Size | License | Key idea |
|---|---|---|---|---|
| C4 | 2019 | ~175B tokens | ODC-BY | Heuristic filters on one CC snapshot (terminal punctuation, badwords, 3-sentence min) for T5 |
| The Pile | 2020 | 825GB, ~300B tokens | mixed, contested | 22 curated sources (arXiv, PubMed, code, books); Books3 later removed for copyright |
| ROOTS | 2022 | 1.6TB, 46 languages | mixed | BLOOM's multilingual curated corpus |
| RefinedWeb | 2023 | 600B released (5T built) | ODC-BY | Falcon's thesis: filtered + deduped web alone beats curated mixes; trafilatura + strict dedup |
| FineWeb | 2024 | 15T -> 18.5T+ tokens | ODC-BY | RefinedWeb recipe, fully open, every step ablated; per-snapshot MinHash dedup |
| FineWeb-Edu | 2024 | 1.3T (score>=3); 5.4T (score>=2) | ODC-BY | Llama-3-70B-annotated educational classifier over FineWeb; huge MMLU/ARC gains |
| DCLM-Baseline | 2024 | ~3.8T tokens (from 240T pool) | CC-BY-4.0 | fastText classifier (OH-2.5 + ELI5 positives) is the single biggest lever |
| Dolma | 2023-24 | 3T tokens | ODC-BY | Open, documented mix: web, code, papers, books; powered OLMo 1/2 |
| Nemotron-CC | 2024 | 6.3T (4.4T organic + 1.9T synthetic) | CC-BY-4.0 | Classifier ensemble + quality buckets; rephrase low-quality instead of discarding |
| FineWeb2 | 2024-25 | ~3T words, 1000+ languages | ODC-BY | Per-language pipelines, dedup-based upsampling of quality docs |
| Dolma 3 | 2025 | 5.9T mix (+ 100B Dolmino mid-train, +50-100B Longmino long-context) | ODC-BY | Full three-stage open recipe behind Olmo 3, incl. olmOCR-processed scientific PDFs |
| Nemotron-CC-v2/v2.1 | 2025 | +2.5T then +2.1T tokens | NVIDIA open license | Fresh 2025 crawls; synthetic QA/dialogue via Qwen3-32B; code rephrasing/transpiling |
| FinePDFs / FinePDFs-Edu | 2025 | 3T / 350B tokens | ODC-BY | PDFs are the untapped high-quality pool (long, technical documents) |

Other corpora worth knowing: **TxT360** (globally deduped 15T with per-doc counts for flexible
upsampling), **Zyda-2** (5T, cross-dataset filtered union of FineWeb-Edu/DCLM/Zyda/Dolma),
**Ultra-FineWeb** (efficient verification-based filtering over FineWeb), **Common Pile v0.1**
(8TB of genuinely openly licensed text, for license-clean training), **Essential-Web v1.0**
(24T tokens with a 12-category taxonomy label per document, so you can carve your own subsets),
and **The Stack v2** (code, 900B+ tokens, from Software Heritage).

## What actually separates the generations

1. **Extraction**: WARC + trafilatura/resiliparse instead of prefab WET text. FineWeb measured
   this as one of the largest single wins.
2. **Model-based quality filtering**: DCLM showed a cheap fastText classifier trained on
   instruction-ish positives beats every heuristic stack; FineWeb-Edu showed an
   LLM-annotation-distilled classifier does the same for educational content.
3. **Dedup done right**: fuzzy MinHash per snapshot (global dedup over all snapshots hurt in
   FineWeb's ablations); exact substring dedup via suffix arrays in RefinedWeb.
4. **Not over-filtering**: Nemotron-CC's point: aggressive filtering (DCLM discards ~90% of
   tokens) caps your token horizon. Bucket by quality, keep medium tokens for bulk, rephrase
   instead of deleting. This matters for 15T+ token runs more than for small ones.
5. **Synthetic augmentation**: rephrased web and QA-ified documents are now a standard slice
   (Nemotron-CC's 1.9T synthetic tokens; see
   [synthetic-and-post-training-data.md](synthetic-and-post-training-data.md)).

## Aug 2026 snapshot

Independent head-to-head evaluations consistently rank **Nemotron-CC-HQ** and **DCLM-Baseline**
at the top for per-token quality on English web, with **FineWeb-Edu** the default academic
reference corpus and the easiest to use. Nemotron-CC-HQ beats DCLM by roughly +5.6 MMLU in
NVIDIA's matched 8B ablations; recent "evolved curation" pipelines (e.g. Darwin-CC style
automated pipeline search) squeeze a bit more. For scale, the frontier open stack is a
composition: Nemotron-CC-v2.1 or FineWeb-family web + FinePDFs + The Stack v2/code +
FineMath-style math + a mid-training mix (Dolmino is the open template).

## What to use for a 150-350M pretrain on FineWeb-Edu

- **Core**: FineWeb-Edu (the 1.3T score>=3 cut). At 150-350M params you will train maybe
  50-500B tokens (SmolLM2-135M/360M used 2T/4T; Chinchilla-optimal is only ~3-7B, so you are
  deliberately over-training for inference quality). You will never exhaust 1.3T, so the
  strictest cut is right; sample the `sample-350BT` or `sample-100BT` configs for convenience.
  nanochat and most nanoGPT-scale speedruns standardized on exactly this corpus.
- **Sprinkle**: ~5-10% code (python-edu or The Stack v2 smol) and ~5% math (FineMath 4+),
  mostly concentrated in the final 10-20% of training as an annealing phase; see
  [data-mixing.md](data-mixing.md).
- **Tokenizer**: train it on the same distribution; see
  [../llm-training-and-post-training/tokenizers.md](../llm-training-and-post-training/tokenizers.md).
- **Alternatives worth an ablation**: DCLM-Baseline sample (more diverse register than
  FineWeb-Edu's homogeneous educational tone, sometimes better at small scale on
  commonsense tasks), or a 50/50 FineWeb-Edu + DCLM mix (what SmolLM2 converged to after
  finding Edu-only too narrow); Nemotron-CC-HQ if you want the current per-token quality peak.
- **Decontaminate** against your eval suite before training, not after; see
  [filtering-and-dedup.md](filtering-and-dedup.md).

See [../llm-training-and-post-training/pretraining.md](../llm-training-and-post-training/pretraining.md)
for the training-side decisions these tokens feed into.
