# Mistral AI: visualisation research (v3)

Central question: what does each Mistral model cost you to hold and run (memory, compute, cache), and what may you do with it (licence)?
Existing visuals: the old embed (pages/mistral-ai/visual.html) is replaced. Scores 0-2 per Methodology question; "reproduces" and "computable" count double; build cost subtracted; +1 for step-by-step before/after animation.

| Rank | Idea | Score | Data and formulas | Placement | Status |
|---|---|---|---|---|---|
| 1 | Weights and cache tab: parameter accounting from configs with what-counts ticks; memory to hold and run vs H100/H200/node; KV per sequence vs context | 18 | HF config.json/params.json for 11 models (recompute.py); GQA layer = d*nh*hd + 2*d*nkv*hd + nh*hd*d; MLA layer as DeepSeek; FFN 3*d*f; KV GQA 2*L*nkv*hd*2 B, MLA (latent+64)*L*2 B. Reproduces 46.7/12.9, 141/39, 675/673/39, 119/6/6.5, 123, 128, 24, Ministral 3.4/13.5 independently; Small 4 "8B incl. embeddings" reproduced by no sum (max 7.06); Ministral 8B 8.4 off (8.49); Large 3 41B comes out 41.6 | Own tab | built |
| 2 | Animated cache: same 32,768-token input through rolling buffer + GQA vs full GQA (Mixtral) vs full MHA, to scale, ring with write head and laps, reach by layer, counters | 17 | Mistral 7B paper Table 1; b_tok = 2*32*8*128*2; reproduces 8x at 32k and 131K span (paper quotes) | Reading, Mistral 7B | built |
| 3 | Animated MoE layer: one token through Mixtral (8 big experts, top 2) vs Mistral 7B dense vs Small 4 (128 small + shared), area to scale, stored vs touched counters | 16 | configs; 41.9M attention, 176.2M expert, 25.2M Small 4 expert; reproduces 47B/13B, 119B | Reading, Mixtral | built |
| 4 | Lineage tab: lanes by job, dots by licence, consolidation arrows | 15 | Mistral news index dates (src/news.txt), posts per release | Own tab | built |
| 5 | Licence chooser | 12 | Modified MIT LICENSE ($20M monthly revenue), catalogue Premier list, Voxtral TTS CC BY-NC | Reading, licences | built |
| 6 | Magistral GRPO group calculator (reward rules, r - mu vs standard (r-mu)/sigma, zero-advantage filter) | 12 | Magistral paper sec. 2.1-2.2; group of 8 illustrative (paper gives no group size) | Reading, training | built |
| 7 | Mixtral routing repetition bars | 11 | Mixtral paper Table 5, baselines 12.5% and 46% | Reading, Mixtral | built |
| 8 | AA index vs cost per task, open-weight models | 11 | topic-llms/aa_snapshot.json, v4.3 (4.3.2), read 2026-10-01 | Reading, position | built |
| 9 | Memory vs compute bars with precision | 9 | stated totals/actives, C = 2*P_active | Reading, current line | built |

Rejected: price history, funding ledger, training compute (Khalid removed these kinds); Mixtral expert-by-domain distribution (image only in paper); Shieldstral live policy demo (would be fake, no model); Robostral trajectories (no data); SWE-bench bars (three vendor numbers, nothing to move); passkey retrieval (single number); separate GQA-group slider (owned by the Architecture Gallery page).

Findings from configs (new, sourced): Large 3 is DeepSeek-V3's skeleton (7168 wide, 61 layers, 128 heads, MLA 512+64, 3 dense layers, 1 shared expert) with 128 experts of 4096 / 4 active vs V3's 256 of 2048 / 8 active, same routed parameters per layer. Small 4 uses MLA (latent 256). Medium 3.5's text config equals Devstral 2's. Cache per sequence at 256K: Small 4 5.6 GiB, Large 3 17.2 GiB, Medium 3.5 88 GiB.

Contradictory primary sources shown side by side: Small 4 active 6B / 8B (blog) vs 6.5B (card); Shieldstral 3.8B (docs) vs 3B (post, repo); Medium 3.5 weights 28-29 Apr vs announcement 22 May.

What the methodology lacked here: a rule for "parameter counts that differ by counting convention across one vendor's own models" (Devstral 2 excludes the input embedding, Medium 3.5 of the same shape includes it); and a rule for API retirement vs weights availability, since several "current" open models are retired from the API but still downloadable.
