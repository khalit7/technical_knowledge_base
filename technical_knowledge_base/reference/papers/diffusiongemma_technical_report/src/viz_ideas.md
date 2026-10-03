# DiffusionGemma Technical Report: visualisation ideas

The question the page keeps returning to: **how many forward passes does a block of text need, and what does each pass cost?** Speed is TPF / t_fwd (Eq. 12); training raises TPF, inference engineering lowers t_fwd, and the quality tax is the price. Existing visuals elsewhere in the KB that this page must not repeat: the 2026-08-24 tech news animation of one 256-token block decoded autoregressively, with speculative decoding and with DiffusionGemma (N3), and the DDPM and Stable Diffusion pages' continuous-diffusion toys.

Scores: quantity the reader moves (0 to 2), reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation bonus; build cost subtracted.

| # | Idea | Placement | Score | Status |
|---|---|---|---|---|
| P-diffusiongemma_technical_report.1 | **Algorithm 1 run live on a trained toy DiffusionGemma**, step by step: shared-weights causal encoder filling a KV cache, bidirectional decoder denoising 3 canvases of 8, entropy-bounded acceptance (outlined), uniform re-noising, temperature annealing, adaptive stopping, encode-and-append; the same problem through a masked-diffusion twin and through the same weights decoding autoregressively; counters for passes, TPF, revisions, correct bits | Reading, The sampler (animation) and own tab | 14 | built |
| P-diffusiongemma_technical_report.2 | **Run the toy tab**: task (Appendix G.2's sequential and parallel tasks, 3-bit window), rule table (32 held out), every sampler knob (b, N, e_stop, τ, seed, self-conditioning), an in-browser test on 64 held-out problems for all three decoders | Own tab | 12 | built |
| P-diffusiongemma_technical_report.3 | **Predict: sequential against parallel passes per canvas**, then 96 held-out problems run live, beside the paper's single prompts (7 and 4 steps, Figures 24 and 25) | Reading, The sampler | 10 | built |
| P-diffusiongemma_technical_report.4 | **Figure 11 to scale with a TPF slider** and what-if toggles (MoE, sampling, attention at AR cost); speed = TPF / (GPU time + 0.93 ms) against AR's 204 and MTP's 303; break-even TPF | Reading, Speed | 11 | built (defaults reproduce Section 6's 1,456, 7.1x, 4.8x by construction) |
| P-diffusiongemma_technical_report.5 | **Predict: distinct experts per 256-token canvas** (8, 84 or 128): independent uniform routing gives 128.00, measured 84; 10.5x the experts for 4.3x the MoE time | Reading, Speed | 10 | built |
| P-diffusiongemma_technical_report.6 | **Predict: does SD·RL lengthen or shorten answers?** Reveal: tokens and forward passes against Gemma 4 (4,001 against 7,207; 203 against 5,148 = 3.9%) | Reading, Training | 9 | built |
| P-diffusiongemma_technical_report.7 | **Forward-process demo**: one canvas corrupted at noise level t, multinomial against masked; counts visible noise the model cannot detect | Reading, Discrete diffusion | 8 | built |
| P-diffusiongemma_technical_report.8 | **Figure 12(b) printed ratios with the extrapolated crossover** (about 0.75 per doubling reaching parity near 33 users); the figure stops at 16 | Reading, Speed | 9 | built |
| P-diffusiongemma_technical_report.9 | **Quality dot plot**: every Table 3 benchmark, diffusion mode against AR mode against Gemma 4, thinking toggle, sort by gap, binomial standard-error whiskers where the size is known | Reading, Results | 9 | built |
| P-diffusiongemma_technical_report.10 | **37 checks of the paper's own numbers** (Eq. 12, Figure 11 ratios, Table 4 internal consistency, MTP's implied 4.62 ms per pass, AR mode "squarely between" 18 of 19, Table 7 caption against its row) with verdicts agree / does not / context | Tables tab | 10 | built |
| P-diffusiongemma_technical_report.11 | **Toy speed-quality frontier**: offline sweep of N (4 to 48) and b (0.1, 1) for both toys, accuracy against TPF, the reader's own test runs added | Run tab | 9 | built |
| P-diffusiongemma_technical_report.12 | Tables 3 and 4 parsed from the HTML, deltas from Gemma 4, recomputed columns (tokens / E2E, ms per pass, tokens / forwards, 256 / (DNS + 1)) | Tables tab | 8 | built |
| P-diffusiongemma_technical_report.13 | Training curves from the toy's logs, per task and model, unsmoothed | Run tab | 6 | built |
| P-diffusiongemma_technical_report.14 | AR against speculative against block diffusion, in passes and milliseconds | | | rejected: already built on the 2026-08-24 tech news page (N3); linked |
| P-diffusiongemma_technical_report.15 | A toy SD·RL stage (self-distillation with reward filtering) showing the entropy curriculum | | | rejected: the report gives no objective, weighting or schedule, so any implementation would be invented; said so on the page |
| P-diffusiongemma_technical_report.16 | Redrawing Figures 5, 8, 9, 10 (step boxplots, SD·RL curves, Pareto frontiers) | | | rejected: PNG images with no printed values except point labels; the method forbids reading curves |
| P-diffusiongemma_technical_report.17 | Mercury 2 NNLS refit (Appendix E) | | | rejected: the per-request API data is not released |
| P-diffusiongemma_technical_report.18 | Then and now tab | | | rejected: a two-month-old report has no "now" yet; its lineage (DDPM, BERT, T5, block diffusion) is linked |
| P-diffusiongemma_technical_report.19 | Training-bill or GPU-hours tab | | | rejected: a pattern Khalid removed, and the paper gives no compute numbers ("fewer than 10% of the tokens" only) |

What the methodology lacked for this page: a rule for **context checks** (recomputed numbers that frame a claim without confirming or refuting a printed value, such as expected experts under uniform routing); the checks table now has a third verdict, "context", for these.
