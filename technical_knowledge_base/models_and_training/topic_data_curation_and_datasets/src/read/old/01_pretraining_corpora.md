# Pretraining corpora: lineage and current landscape

Notion id 3c65c17b0d0d81f382b6e75707d00663; fetched read-only 2026-10-14; page_last_edited_at 2026-09-22T02:26:32.607Z. Verbatim fetch text below.

Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81f382b6e75707d00663 as of 2026-09-22T02:26:32.607Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81f382b6e75707d00663">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d811fa5ecda8d365ab00f" title="Topic: data-curation-and-datasets"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Pretraining corpora: lineage and current landscape"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 9 min read · +7h 40m resources
## Best resources
- [FineWeb: decanting the web](https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1) (\~1h 30m): the canonical writeup of how a modern web corpus is built, with per-decision ablations
- [FineWeb paper (NeurIPS 2024 D&B)](https://arxiv.org/abs/2406.17557) (90 min): the same material in paper form
- [DCLM: DataComp for Language Models](https://arxiv.org/abs/2406.11794) (90 min): controlled testbed comparing curation strategies at fixed compute
- [Nemotron-CC](https://arxiv.org/abs/2412.02595) (45 min): how to keep 4x more tokens at equal quality; [Nemotron-CC-v2.1 card](https://huggingface.co/datasets/nvidia/Nemotron-CC-v2.1) (\~10 min)
- [Dolma paper](https://arxiv.org/abs/2402.00159) (90 min) and the [Olmo 3 / Dolma 3 release](https://allenai.org/blog/olmo3) (\~30 min): fully documented open corpus lineage
- [HuggingFaceFW org page](https://huggingface.co/HuggingFaceFW) (\~15 min): FineWeb, FineWeb-Edu, FineWeb2, FinePDFs, FineWiki, Smol-Data mixtures in one place
## The lineage
Everything starts at **Common Crawl** (CC): a nonprofit crawling the web since 2008, releasing
roughly monthly snapshots as WARC (raw HTML), WAT (metadata), and WET (pre-extracted text)
files; hundreds of TB per snapshot, petabytes total. Raw CC is unusable as-is: boilerplate,
spam, SEO farms, duplicates, adult content. The history of pretraining corpora is the history
of learning to distill it.
<table header-row="true">
<tr>
<td>Corpus</td>
<td>Year</td>
<td>Size</td>
<td>License</td>
<td>Key idea</td>
</tr>
<tr>
<td>C4</td>
<td>2019</td>
<td>\~175B tokens</td>
<td>ODC-BY</td>
<td>Heuristic filters on one CC snapshot (terminal punctuation, badwords, 3-sentence min) for T5</td>
</tr>
<tr>
<td>The Pile</td>
<td>2020</td>
<td>825GB, \~300B tokens</td>
<td>mixed, contested</td>
<td>22 curated sources (arXiv, PubMed, code, books); Books3 later removed for copyright</td>
</tr>
<tr>
<td>ROOTS</td>
<td>2022</td>
<td>1.6TB, 46 languages</td>
<td>mixed</td>
<td>BLOOM's multilingual curated corpus</td>
</tr>
<tr>
<td>RefinedWeb</td>
<td>2023</td>
<td>600B released (5T built)</td>
<td>ODC-BY</td>
<td>Falcon's thesis: filtered + deduped web alone beats curated mixes; trafilatura + strict dedup</td>
</tr>
<tr>
<td>FineWeb</td>
<td>2024</td>
<td>15T -\> 18.5T+ tokens</td>
<td>ODC-BY</td>
<td>RefinedWeb recipe, fully open, every step ablated; per-snapshot MinHash dedup</td>
</tr>
<tr>
<td>FineWeb-Edu</td>
<td>2024</td>
<td>1.3T (score\>=3); 5.4T (score\>=2)</td>
<td>ODC-BY</td>
<td>Llama-3-70B-annotated educational classifier over FineWeb; huge MMLU/ARC gains</td>
</tr>
<tr>
<td>DCLM-Baseline</td>
<td>2024</td>
<td>\~3.8T tokens (from 240T pool)</td>
<td>CC-BY-4.0</td>
<td>fastText classifier (OH-2.5 + ELI5 positives) is the single biggest lever</td>
</tr>
<tr>
<td>Dolma</td>
<td>2023-24</td>
<td>3T tokens</td>
<td>ODC-BY</td>
<td>Open, documented mix: web, code, papers, books; powered OLMo 1/2</td>
</tr>
<tr>
<td>Nemotron-CC</td>
<td>2024</td>
<td>6.3T (4.4T organic + 1.9T synthetic)</td>
<td>CC-BY-4.0</td>
<td>Classifier ensemble + quality buckets; rephrase low-quality instead of discarding</td>
</tr>
<tr>
<td>FineWeb2</td>
<td>2024-25</td>
<td>\~3T words, 1000+ languages</td>
<td>ODC-BY</td>
<td>Per-language pipelines, dedup-based upsampling of quality docs</td>
</tr>
<tr>
<td>Dolma 3</td>
<td>2025</td>
<td>5.9T mix (+ 100B Dolmino mid-train, +50-100B Longmino long-context)</td>
<td>ODC-BY</td>
<td>Full three-stage open recipe behind Olmo 3, incl. olmOCR-processed scientific PDFs</td>
</tr>
<tr>
<td>Nemotron-CC-v2/v2.1</td>
<td>2025</td>
<td>+2.5T then +2.1T tokens</td>
<td>NVIDIA open license</td>
<td>Fresh 2025 crawls; synthetic QA/dialogue via Qwen3-32B; code rephrasing/transpiling</td>
</tr>
<tr>
<td>FinePDFs / FinePDFs-Edu</td>
<td>2025</td>
<td>3T / 350B tokens</td>
<td>ODC-BY</td>
<td>PDFs are the untapped high-quality pool (long, technical documents)</td>
</tr>
</table>
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
4. **Not over-filtering**: Nemotron-CC's point: aggressive filtering (DCLM discards \~90% of
	tokens) caps your token horizon. Bucket by quality, keep medium tokens for bulk, rephrase
	instead of deleting. This matters for 15T+ token runs more than for small ones.
5. **Synthetic augmentation**: rephrased web and QA-ified documents are now a standard slice
	(Nemotron-CC's 1.9T synthetic tokens; see
	<mention-page url="https://app.notion.com/p/3c65c17b0d0d8171b5d9e36e05b7a5d0"/>).
Those five levers are also why the data side has outrun the modelling side: on the 2019--2025 decomposition recorded on <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fa5ecda8d365ab00f">Topic: data-curation-and-datasets</mention-page>, data improvements contributed 3.24x more compute-efficiency gain than architecture and optimisation combined, and the corpus generations in the table above are most of what that number is measuring.
**The founding evidence for point 4's premise.** The whole lineage above assumes filtering
earns its losses, and that assumption was first measured in the C4 paper itself, in an
experiment cleaner than most that came after it. Holding model, compute and evaluation fixed, an unfiltered variant of the same crawl
snapshot (6.1TB, roughly 8x more text than filtered C4's 745GB) scored worst on every single
downstream task, with no task where the extra volume bought anything. That is the strongest
form the filtering-beats-volume claim takes, and it is why Nemotron-CC's counter-argument is
about *how much* to filter rather than whether to.
The same paper also ran the repetition experiment that sets the token-horizon budget everyone
now reasons with. Truncating C4 and looping over it during a fixed-token run: 64 repeats is
harmless, 256 is marginal, and 1,024 repeats costs about 4 GLUE points and 4.6 on SQuAD, with
training loss *falling* as the corpus shrinks, which is the memorisation signature rather than
learning. So the practical rule that a corpus is large enough if you repeat it a few dozen times
at most predates the modern corpora by five years. See
<mention-page url="https://app.notion.com/p/3d45c17b0d0d81ec8ebfec02e953a7fd"/> (11 min read · +4h 12m resources).
## Current snapshot
Independent head-to-head evaluations consistently rank **Nemotron-CC-HQ** and **DCLM-Baseline**
at the top for per-token quality on English web, with **FineWeb-Edu** the default academic
reference corpus and the easiest to use. Nemotron-CC-HQ beats DCLM by roughly +5.6 MMLU in
NVIDIA's matched 8B ablations; recent "evolved curation" pipelines (e.g. Darwin-CC style
automated pipeline search) squeeze a bit more. For scale, the frontier open stack is a
composition: Nemotron-CC-v2.1 or FineWeb-family web + FinePDFs + The Stack v2/code +
FineMath-style math + a mid-training mix (Dolmino is the open template).
## What to use for a 150-350M pretrain on FineWeb-Edu
- **Core**: FineWeb-Edu (the 1.3T score\>=3 cut). At 150-350M params you will train maybe
	50-500B tokens (SmolLM2-135M/360M used 2T/4T; Chinchilla-optimal is only \~3-7B, so you are
	deliberately over-training for inference quality). You will never exhaust 1.3T, so the
	strictest cut is right; sample the `sample-350BT` or `sample-100BT` configs for convenience.
	nanochat and most nanoGPT-scale speedruns standardized on exactly this corpus.
- **Sprinkle**: \~5-10% code (python-edu or The Stack v2 smol) and \~5% math (FineMath 4+),
	mostly concentrated in the final 10-20% of training as an annealing phase; see
	<mention-page url="https://app.notion.com/p/3c65c17b0d0d819ea5d6c59471e66875"/>.
- **Tokenizer**: train it on the same distribution; see
	<mention-page url="https://app.notion.com/p/3c65c17b0d0d817187bcd94a1b0f15ea"/>.
- **Alternatives worth an ablation**: DCLM-Baseline sample (more diverse register than
	FineWeb-Edu's homogeneous educational tone, sometimes better at small scale on
	commonsense tasks), or a 50/50 FineWeb-Edu + DCLM mix (what SmolLM2 converged to after
	finding Edu-only too narrow); Nemotron-CC-HQ if you want the current per-token quality peak.
- **Decontaminate** against your eval suite before training, not after; see
	<mention-page url="https://app.notion.com/p/3c65c17b0d0d81579b32c07c92b7472b"/>.
See <mention-page url="https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba"/> for the
training-side decisions these tokens feed into.
</content>
</page>
