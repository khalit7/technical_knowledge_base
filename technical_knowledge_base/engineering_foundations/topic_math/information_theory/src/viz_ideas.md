# Visualisation ideas: Information theory for ML

Central question: what does a log-loss number mean, and which part of it can a model remove?

| # | Idea | Score /16 | Data and formulas | Placement | Status |
|---|---|---|---|---|---|
| IT1 | One stream, two codes: 16 symbols from p encoded with p's code and q's code, bits to scale, counters converge to H(p) = 1.75, H(p,q) = 2.375, KL = 0.625 exactly (dyadic) | 15 | MacKay eq. 5.23; recompute.py | Reading s6 (before/after animation) | built |
| IT2 | Huffman build on the root's tiny bet, 5 steps; L 1.335 vs H 1.201; blocks 1.2145, 1.2107, 1.2094 | 12 | MacKay Thm 5.1 | Reading s3 | built |
| IT3 | Forward against reverse KL: one Gaussian fitted to two humps by gradient descent, both runs stacked, valley mass and both KLs as counters | 15 | grid integration; moment matching derived | Reading s7 | built |
| IT4 | InfoNCE estimate against N for five correlations, optimal critic, true I and ln N lines | 14 | CPC, Poole eq. 10, McAllester-Stratos | Reading s9 | built |
| IT5 | Arithmetic coding of "sat cat cat": nested intervals, width = product of probabilities, bits = total surprise | 12 | MacKay §6.2 | Reading s11 | built |
| IT6 | Compression ladder: raw, order-0 Huffman, five compressors, four models on 10 KB of Darwin | 14 | measured | Reading s11 | built |
| IT7 | Plug-in conditional entropy F_N on book and passage against model BPB (estimator collapse) | 13 | measured; Shannon 1951 | Reading s4 (and s14 text) | built |
| IT8 | Plug-in entropy bias against N with Miller-Madow and the formula; plug-in MI of independent variables | 12 | Paninski eq. 4.6 | Reading s14 | built |
| IT9 | Entropy and KL lab: two editable distributions, all divergences, KL terms per outcome, Huffman codes for both | 14 | IT core | own tab | built |
| IT10 | Real text tab: 4 models x 3 texts (tokens, PPL, BPB, BPC, whitespace tokens), PPL vs BPB ranks, first 40 tokens, prefix chart against compressors | 15 | score.py, comp.py | own tab | built |
| IT11 | Same model, four perplexities (token, word, token pair, byte) | 13 | exact chain-rule construction | Reading s10 table | built |
| IT12 | KL-regularised optimum table on the tiny model for 4 betas; k1/k2/k3 estimators | 11 | DPO App. A.1; Schulman 2020 | Reading s13 | built |
| R1 | Token-by-token perplexity strip under three tokenizers | | already on Evaluation metrics (EM7) | linked | rejected |
| R2 | Sampler temperature/entropy explorer | | Sampling and Decoding's Sampler lab | linked | rejected |
| R3 | Toy CLIP batch with temperature | | CLIP paper page | linked | rejected |
| R4 | Real arithmetic coder driven by GPT-2 in the browser | | needs model weights in the page; the arithmetic is shown exactly on the tiny model | none | rejected |

Methodology gaps: no published bits-per-byte number exists for these passages, so the real measurements reproduce nothing published; the page says "by construction" for PPL = exp(CE) and BPB = total/bytes, and compares GPT-2's tokens per byte with the Pile's 0.29335 only as consistency.
