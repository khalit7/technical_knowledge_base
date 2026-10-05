# Source and link checks (fetched 2026-10-05)

Checked by fetching each page or PDF directly (web search unavailable). Reading times are estimates.

## Reading-path resources
| Resource | URL (checked, HTTP 200) | Edition / date | Part to read, time |
|---|---|---|---|
| Mathematics for Machine Learning (Deisenroth, Faisal, Ong) | https://mml-book.github.io/ (PDF book/mml-book.pdf) | Cambridge UP, 2020 | ch. 2-7 (Linear Algebra, Analytic Geometry, Matrix Decompositions, Vector Calculus, Probability and Distributions, Continuous Optimization), about 230 pp, 20-30 h |
| 3Blue1Brown, Essence of Linear Algebra | https://www.3blue1brown.com/topics/linear-algebra | 16 videos | about 3 h |
| 3Blue1Brown, Essence of Calculus | https://www.3blue1brown.com/topics/calculus | 12 videos | about 3 h 10 min |
| Parr and Howard, The Matrix Calculus You Need For Deep Learning | https://explained.ai/matrix-calculus/ (arXiv 1802.01528) | 2018 | 1.5-2.5 h |
| Olah, Visual Information Theory | https://colah.github.io/posts/2015-09-Visual-Information/ | posted 14 Oct 2015 (slug says 2015-09) | 45-60 min |
| Boyd and Vandenberghe, Convex Optimization | https://web.stanford.edu/~boyd/cvxbook/ | Cambridge UP 2004, free PDF | ch. 2-5 (Convex sets, Convex functions, Convex optimization problems, Duality), 20-30 h; ch. 2, 3, 5.1-5.5 about 10 h |
| Boyd and Vandenberghe, Introduction to Applied Linear Algebra (VMLS) | https://web.stanford.edu/~boyd/vmls/ | Cambridge UP 2018, free PDF | gentle linear algebra and least squares |
| Strang, MIT 18.06 | https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/ | 34 lectures (recorded 1999) | about 25 h; ML subset 1-3, 9-11, 14-17, 21-22, 25-27, 29-30 |
| Strang, MIT 18.065 | https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/ | Spring 2018, 34 recorded lectures; book Linear Algebra and Learning from Data (2019) | lectures 1-9 and 21-27, about 12 h |
| Bishop, PRML | https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/Bishop-Pattern-Recognition-and-Machine-Learning-2006.pdf | 2006, free PDF | ch. 1-2, 8-10 h |
| Bishop and Bishop, Deep Learning: Foundations and Concepts | https://www.bishopbook.com/ | Springer 2024, free online version | ch. 2 and 7, 4-6 h |
| MacKay, ITILA | https://www.inference.org.uk/mackay/itila/ | Cambridge UP 2003, free PDF | ch. 1, 2, 4, 8, 8-12 h |
| CS229 main notes | https://cs229.stanford.edu/main_notes.pdf | Ma and Ng, dated 23 Aug 2026, 278 pp | selected chapters |
| CS229 probability review | https://cs229.stanford.edu/section/cs229-prob.pdf | Maleki and Do, 12 pp | 1-1.5 h |
| CS229 linear algebra review | https://cs229.stanford.edu/section/cs229-linalg.pdf | Kolter, updated by Do, 2015, 26 pp | 2-3 h |
| The Matrix Cookbook | https://www.math.uwaterloo.ca/~hwolkowi/matrixcookbook.pdf | version 15 Nov 2012, 72 pp | reference |

## Primary-source claims
- LoRA (arXiv 2106.09685): 10,000 times fewer trainable parameters and 3 times less GPU memory, CONFIRMED; B initialised to zero, CONFIRMED. "Ranks 1 to 8 competitive" CORRECTED: the paper says "a rank as small as one suffices" for Wq and Wv on GPT-3 (Table 6 tests r = 1, 2, 4, 8, 64).
- GaLore (2403.03507): "reduces memory usage by up to 65.5% in optimizer states", CONFIRMED.
- Kaplan et al. 2020 sec. 2.1: C about 6N per training token, backward about twice forward, CONFIRMED (non-embedding compute).
- Chen et al. 2016: O(sqrt n) memory for one extra forward pass per mini-batch, CONFIRMED.
- Cohen et al. 2021: sharpness hovers just above 2/eta in full-batch GD, CONFIRMED.
- CLIP: batch 32,768; temperature initialised to 0.07, clipped so logits are scaled by at most 100, CONFIRMED.
- CPC: I >= log N - L_N, CONFIRMED.
- The Pile: 0.29335 GPT-2 tokens per byte; BPB preferred for tokenization invariance, CONFIRMED.
- Deletang et al.: 43.4% ImageNet, 16.4% LibriSpeech vs PNG 58.5%, FLAC 30.3% (raw rates, model size ignored), CONFIRMED.
- Muon: Newton-Schulz orthogonalisation, stable in bfloat16, CONFIRMED (post dated 8 Dec 2024).
- Dauphin et al. 2014: saddles outnumber minima exponentially with dimension, CONFIRMED.
- enwik8: first 10^8 bytes of the 3 Mar 2006 English Wikipedia dump, CONFIRMED.
- Adam: v_t is an exponential moving average of squared gradients (wording CORRECTED from "running mean"); the paper itself says v_t approximates the diagonal of the Fisher, CONFIRMED.
