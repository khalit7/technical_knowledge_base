# Coverage and corrections

This is a new page: there was no old Notion page to carry. The floor it had to cover is the parent's Reading
section 6 ("Speculative decoding: guess several tokens, check them in one pass"), the parent's coverage notes in
`../src/read/coverage.md` and the old `inference_techniques.md` paragraph on speculative decoding. Each claim from
those, checked again on 2026-10-08:

| Claim (parent page or old notes) | Status here | Where on this page |
|---|---|---|
| Decode at small batch leaves arithmetic idle, so checking 5 tokens costs about the same as producing 1 | Verified, and qualified: on the M1 Pro a Qwen3-4B pass over 5 tokens cost the measured `ratio5` times a 1-token pass; on an H100 the derived curve is flat to about 165 tokens | Reading 1 (chart, predict) |
| The rule min(1, p/q) with residual keeps the target's distribution (Leviathan; Chen) | Verified (papers) and tested on real models (chi-square, 20,000 samples per rule) | Reading 3, Acceptance rule lab |
| Tokens per pass (1 - a^(k+1))/(1 - a); 2.77 at a = 0.7, k = 4 | Verified; checked against 72 real runs (median error 3%) | Reading 4 |
| Medusa 2.2 to 3.6x | **Corrected**: the 3.6x is the abstract of arXiv v1; the current v3 abstract says Medusa-1 over 2.2x and Medusa-2 2.3 to 2.8x (Vicuna-7B Medusa-2 2.83x in Table 1). The page uses v3 | Reading 6 |
| EAGLE 2.7 to 3.5x latency on LLaMA2-Chat 70B | Verified (batch 1, authors) | Reading 6 |
| DFlash2 for Qwen3.8-27B 3.43x at concurrency 1 on GSM8K | Verified, and completed: the same card gives 2.84x at concurrency 8 and 1.45x at 32, and the model's own seven-token MTP between 0.77x and 1.04x at 32 | Reading 6 and 9 |
| vLLM v0.31.0 offers draft models, Medusa, EAGLE, MTP, n-gram, suffix, DFlash (config/speculative.py L74) | Verified, extended to the full method list (L39 to L84, 27 MTP model types, dspark) and to SGLang, TensorRT-LLM, llama.cpp, mlx-lm | Reading 8 |
| On the laptop a 4B pass over 4 tokens cost 2.2x a pass over 1, so the 0.6B draft was slower on free text and at best 1.32x on a list; MLX slower at every k | Re-measured with a finer method (llama-bench pass-time curve) and extended to EAGLE-3, DFlash, DSpark and n-gram drafters | Reading 1 and 5; Drafters measured |
| At k = 6 MLX's greedy output differed from its own baseline on two prompts | Reproduced and explained: the first differing token sits at a near-tie of the target's logits, and batched verification rounds differently | Reading 3 |
| llama-server: `-md` alone loads the draft but does nothing; `--spec-type draft-simple` is required | Consistent with the b11146 source (default spec type none) | Drafters measured setup |
| "Prompt lookup works well for code edits and retrieval answers" | Measured with llama.cpp's n-gram modes on real code-editing, quoting and summarisation prompts | Drafters measured |

New claims on this page that were not on the parent, all sourced inline: the sample-and-compare rule used by
llama.cpp and mlx-lm (source lines), the batch-size schedules of vLLM, SGLang and TensorRT-LLM (source lines; the
TensorRT-LLM doc and code disagree at v1.2.1, both shown), EAGLE-3's throughput by batch size (Table 3, measured by
the SGLang team), DFlash Table 3, MagicDec, TurboSpec, DSpark (DeepSeek, July 2026), P-EAGLE, Medusa's typical
acceptance and TensorRT-LLM's relaxed acceptance being lossy.

Unconfirmed or not verifiable, marked on the page: DeepSeek-V3's 1.8x has no hardware or batch size; DSpark's
production hardware and batch size are not stated in the passages read; the z-lab Qwen3-4B DFlash card's
per-benchmark numbers exist only in an image; no fully independent (non-vendor, non-author) benchmark of
speculative decoding across batch sizes was found.
