// ---- Reading tab: published figures used by the Reading visuals (every value sourced; see src/read/facts.md) ----
window.RDD={
// DCLM Table 4 (1B-1x: 1.4B params, 28.8B tokens), Core centered accuracy
filt:[['RefinedWeb reproduction (no model filter)',27.5],['Top 20% by PageRank',26.1],['SemDedup',27.1],['Linear classifier on BGE embeddings',27.2],['AskLLM (prompt an LM)',28.6],['Perplexity filtering (CCNet style)',29.0],['Top-k average logits',29.2],['fastText, OH-2.5 + ELI5 positives',30.2]],
// corpora: name, x (year, jittered within the year for legibility only), tokens, kind (web|mixed|pdf), sel (kept only a top slice by a quality model), note, source
lin:[
['C4',2019.5,175e9,'web',0,'One crawl (April 2019), line-level heuristic rules and three-sentence dedup; trained T5. 745 GB of text.','https://arxiv.org/abs/1910.10683'],
['The Pile',2020.5,387e9,'mixed',0,'22 curated sources (arXiv, PubMed, GitHub, books, web). 825 GiB. Its Books3 part was later taken down.','https://arxiv.org/abs/2101.00027'],
['RefinedWeb',2023.3,600e9,'web',0,'Falcon\'s web-only corpus: trafilatura, strict rules, exact-substring plus MinHash dedup. About 5 trillion tokens built, 600 billion released.','https://arxiv.org/abs/2306.01116'],
['Dolma',2023.6,3e12,'mixed',0,'AI2\'s documented mix of web, code, papers, books; Bloom-filter dedup. Trained OLMo 1.','https://arxiv.org/abs/2402.00159'],
['RedPajama v2',2023.85,30e12,'web',0,'Lightly processed crawl text shipped with quality signals, so users filter it themselves.','https://arxiv.org/abs/2406.11794'],
['FineWeb',2024.25,15e12,'web',0,'Every crawl since 2013, each step ablated, MinHash per crawl. 15 trillion tokens in the paper (96 crawls), 18.5 trillion by July 2025 (110 crawls).','https://arxiv.org/abs/2406.17557'],
['FineWeb-Edu',2024.4,1.3e12,'web',1,'FineWeb filtered by a classifier distilled from Llama-3-70B "educational value" scores, threshold 3 of 5. 5.4 trillion at threshold 2.','https://arxiv.org/abs/2406.17557'],
['DCLM-Pool',2024.5,240e12,'web',0,'All of Common Crawl through 2022 extracted with resiliparse: the raw pool DCLM\'s benchmark filters from.','https://arxiv.org/abs/2406.11794'],
['DCLM-baseline',2024.55,3.8e12,'web',1,'RefinedWeb rules, Bloom dedup, then a fastText classifier keeps the top 10%.','https://arxiv.org/abs/2406.11794'],
['Zyda-2',2024.75,5e12,'mixed',0,'A union of FineWeb-Edu, DCLM, Dolma-CC and Zyda, cross-deduplicated and reweighted.','https://huggingface.co/datasets/Zyphra/Zyda-2'],
['Nemotron-CC',2024.92,6.3e12,'web',0,'Three-classifier ensemble into quality buckets; low buckets rephrased by an LLM rather than dropped. 4.4T real plus 1.9T synthetic tokens.','https://arxiv.org/abs/2412.02595'],
['Essential-Web v1.0',2025.45,24e12,'web',0,'24 trillion tokens with a taxonomy label on every document, so users carve their own subsets.','https://arxiv.org/abs/2506.14111'],
['Nemotron-CC v2',2025.62,6.6e12,'web',0,'Adds eight 2024 and 2025 crawls and more synthetic rephrasing (6.6T in total).','https://huggingface.co/datasets/nvidia/Nemotron-CC-v2'],
['FinePDFs',2025.7,3e12,'pdf',0,'Text from 475 million PDFs in 1,733 language-script pairs: long, technical documents the HTML crawl misses.','https://huggingface.co/datasets/HuggingFaceFW/finepdfs'],
['Dolma 3 Mix',2025.85,5.93e12,'mixed',0,'The pretraining mix of Olmo 3 7B: 4.51T web, 805B OCR\'d science PDFs, 409B code, 151B math, from a 9.31T pool.','https://huggingface.co/datasets/allenai/dolma3_mix-6T-1025'],
['Nemotron-CC v2.1',2025.96,2.5e12,'web',0,'2.5T new tokens to add to v2: three 2025 crawls, translated and rephrased data.','https://huggingface.co/datasets/nvidia/Nemotron-CC-v2.1']
],
// FineWeb paper Appendix: P(match) for 14 bands x 8 rows at Jaccard 0.7, 0.75, 0.8, 0.85; RefinedWeb Appendix G.3.1: 20 x 450 at 0.75 and 0.8
fwP:[[0.7,0.56],[0.75,0.77],[0.8,0.92],[0.85,0.988]],rwP:[[0.75,0.76],[0.8,0.994]],
// Dolma 3 pool README (allenai/dolma3 @ 1a9daced): 26 bands of 11, 'Jaccard 0.8 with probability 90%, 0.6 with 10%'
d3P:[[0.6,0.10],[0.8,0.90]],
// OLMo 2 Table 9, 7B: pretraining (4T tokens) vs pretraining plus 50B Dolmino tokens
olmo:{cols:['Avg','MMLU','ARC-C','HSwag','WinoG','NQ','DROP','AGIEval','GSM8K','MMLU-Pro','TQA'],pre:[53.0,59.8,72.6,81.3,75.8,29.0,40.7,44.6,24.1,27.4,74.6],mid:[62.9,63.7,79.8,83.8,77.2,36.9,60.8,50.4,67.5,31.0,78.0]},
// T5 Table 9 (T5-base, 2^35 training tokens): repeats, GLUE, SQuAD
t5rep:[[0,83.28,80.88],[64,82.87,80.97],[256,82.62,79.78],[1024,79.55,76.27],[4096,76.34,70.92]],
// SmolLM2 Table 1 (1.7B, 350B tokens): FineWeb-Edu vs DCLM
smol:[['MMLU',37.5,35.5],['ARC',57.5,53.5],['OpenBookQA',41.9,40.8],['HellaSwag',60.1,62.3],['CommonsenseQA',36.2,40.1],['PIQA',76.2,76.9]]
};
