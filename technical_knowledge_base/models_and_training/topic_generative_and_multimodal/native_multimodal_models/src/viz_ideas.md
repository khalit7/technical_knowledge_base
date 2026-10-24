# Visual ideas: Native multimodal and any-to-any models (prefix nm)

Central question: when one network reads and writes images and speech, what does the image become inside the sequence (soft vectors or discrete codes), and what does writing it cost in quality, sequential calls and compute?

## Built (score: quantity moves with a control / reproduces a figure / computable from public data / shows what prose cannot; 0 to 3 each)
| # | Idea | Placement | Score | Data |
|---|---|---|---|---|
| 1 | One request through a pipeline (VLM + separate diffusion generator) and through an early-fusion token model, step by step, with counters (positions, sequential calls, what the generator saw of the photo) | Reading s1 (before/after animation) | 2+2+3+3 = 10 | SmolVLM 1,088 tokens (root VLM lab), Chameleon 1,024 (paper), SD 1.5 25 steps (running example) |
| 2 | Fusion explorer: ten designs on one toy request, attention mask grid, loss per position, image in and out, calls; compare two side by side | Own tab | 3+1+3+3 = 10 | papers and configs quoted in the Reading tab |
| 3 | One test image as 64 FSQ codes, decoded by FSQ and by the Latent lab's VQ | Reading s2 | 2+0+3+3 = 8 | tokenize.json, test16 |
| 4 | Bits per position without context (unigram entropy) and with the AR model (its NLL), two 8 x 8 maps | Reading s2 | 1+0+3+3 = 7 | tokenize.json, ar_fsq1000 eval |
| 5 | Temperature table with samples, FD, accuracy, diversity, distinct images per class (greedy collapse) | Reading s3 | 3+0+3+3 = 9 | samples.json |
| 6 | One image three ways: raster AR (64 calls), masked (8 rounds), DDIM (20 steps, the Diffusion lab's frames); counters for calls and FLOPs | Reading s4 (before/after animation) | 3+1+3+3 = 10 | samples.npz frames, df strips |
| 7 | Equal-compute table and FD bars with the tokenizer ceiling and the real-image floor | Reading s5 | 2+2+3+3 = 10 | runs/*.json, samples.json, root labs' JSON |
| 8 | Token generator lab: temperature x top-k x guidance grid (45 settings, same random draws), sweeps with click-to-see samples, one image written token by token with real top-5 probabilities and entropy | Own tab | 3+0+3+3 = 9 | samples.json/npz |
| 9 | Token economics: a mixed request's tokens and cache (Gemini docs, Qwen3.5 rule, SmolVLM rule, Chameleon, Mimi), writing one image three ways (calls, FLOPs, time at your ms per call), speech real-time budget | Own tab | 3+2+3+2 = 10 | Qwen/SmolVLM rules checked against the VLM sibling's 24 + 6 recorded rows (checks/check_tok.mjs); Moshi 17 tokens per 80 ms |
| 10 | Predict-then-reveal: speech steps (10 s of Mimi), Transfusion's parity FLOP ratio; mistakes with real errors (IndexError, wrong tokenizer FD) | Reading | | mistakes.json |

## Rejected
- A live in-browser AR model and FSQ decoder: weights about 3.1M parameters (12 MB fp32, 3 MB int8) plus the convolutional decoder; over the page budget for no lesson the recorded grid does not give.
- Running Janus-Pro-1B or Emu3's tokenizer here: tokens per image are published and the av sibling already ran a 4,096-token MoVQ; the extra lesson is small against the download and memory.
- A latency race chart of GPT-4o, Moshi and Qwen3-Omni: the numbers are self-reported under different setups and would invite a ranking the sources do not support.
- Rebuilding the VLM sibling's tile viewer or the root's Model map rows: linked instead.

## What the methodology lacked
- A rule for comparing generator families at "equal compute" when one needs a separately trained tokenizer: here the generator's training FLOPs are matched and the tokenizer's are reported apart (about 8% of the budget).

## Rebuild 2026-10-24 (teaching contract)
| # | Idea | Placement | Kind |
|---|---|---|---|
| 11 | Hero: design grid, what an image becomes going in against how it is written out, every named model placed | Reading top | static annotated diagram (HTML table, cards at phone width) |
| 12 | Transfusion against Chameleon-style tokens: parity FLOP ratio on six metrics (Table 3) | Reading s6 | static bars |
| 13 | Data mixes of Chameleon, Transfusion, Janus and Janus-Pro, each 100% of its own unit | Reading s7 | static stacked bars |
| 14 | MoT: separate weights, shared attention; savings against the dense baseline | Reading s7 | static diagram plus bars |
| 15 | Cascade against Moshi's frame layout (17 tokens per 80 ms step, acoustic codebooks one frame late) | Reading s9 | static diagram at measured width |
Moved inline: #2 (Fusion explorer, now s6) and #8 (Token generator lab: stepper and sweeps in s3, the 45-setting grid closed). Removed: #5's temperature table (the sweep chart carries the same rows). Rejected: a paper's canonical figure (Transfusion Figure 1, Chameleon Figure 1): the explorer already draws the same masks in this page's colours, and the arXiv licences were not checked as reusable.
