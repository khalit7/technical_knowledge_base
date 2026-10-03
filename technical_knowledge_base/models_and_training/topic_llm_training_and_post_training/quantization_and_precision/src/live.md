<!-- Fetched from Notion 2026-10-03 (page last edited 2026-09-22T02:15:50.311Z), id 3c65c17b0d0d817b8f41ff66fba4cd0e. Verbatim content. Parent: Topic: llm-training-and-post-training (3c65c17b0d0d81b6876ee72b7056793b). No child pages, databases or video. -->
⏱ 21 min read · +6h 25m resources
## Best resources (1 min)
- [Maarten Grootendorst, A Visual Guide to Quantization](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization) (\~40 min): the best visual intro to formats, PTQ, QAT, GPTQ.
- [Ultra-Scale Playbook, mixed-precision section](https://huggingface.co/spaces/nanotron/ultrascale-playbook) (\~1h for the mixed-precision section): bf16/fp8 training mechanics.
- [Pretraining LLMs with NVFP4 (NVIDIA, 2025)](https://arxiv.org/abs/2509.25149) (45 min) and [NVFP4 vs MXFP4 decision guide](https://www.spheron.network/blog/nvfp4-vs-mxfp4-gpu-cloud-4bit-quantization-guide/) (\~25 min): the 4-bit training/inference frontier.
- [LMSYS: end-to-end MXFP8 and NVFP4 RL (2026)](https://www.lmsys.org/blog/2026-07-29-mxfp8-nvfp4-rl/) (\~30 min): low-precision RL in practice.
## Number formats (1 min)
<table header-row="true">
<tr>
<td>Format</td>
<td>Bits (sign/exp/mantissa)</td>
<td>Notes</td>
</tr>
<tr>
<td>fp32</td>
<td>1/8/23</td>
<td>Master weights, reductions</td>
</tr>
<tr>
<td>tf32</td>
<td>1/8/10</td>
<td>Ampere matmul default, fp32 range</td>
</tr>
<tr>
<td>fp16</td>
<td>1/5/10</td>
<td>Precision-rich, range-poor: needs loss scaling</td>
</tr>
<tr>
<td>bf16</td>
<td>1/8/7</td>
<td>fp32 range, less precision; **training default**, no loss scaling</td>
</tr>
<tr>
<td>fp8 E4M3 / E5M2</td>
<td>1/4/3, 1/5/2</td>
<td>Hopper+; E4M3 for weights/activations, E5M2 for grads</td>
</tr>
<tr>
<td>int8</td>
<td>integer</td>
<td>Classic inference PTQ target</td>
</tr>
<tr>
<td>NF4</td>
<td>4-bit code</td>
<td>QLoRA's normal-distribution-optimal codebook</td>
</tr>
<tr>
<td>MXFP8/MXFP4</td>
<td>fp8/fp4 + shared E8M0 scale per 32-block</td>
<td>OCP open microscaling standard (NVIDIA + AMD)</td>
</tr>
<tr>
<td>NVFP4</td>
<td>fp4 (E2M1) + fp8 scale per 16-block</td>
<td>NVIDIA Blackwell native; finer scaling, better quality</td>
</tr>
</table>
## Post-training quantization (PTQ) (2 min)
Quantize a trained model, no retraining. fp32 -\> fp16/bf16 is essentially free.
Integer/4-bit needs a mapping: quantized = round(x / scale) + zero_point, with
scale/zero-point chosen per tensor, per channel, or per block.
- **Dynamic PTQ**: activation quantization parameters computed on the fly per
	batch; simpler, some latency overhead.
- **Static PTQ**: run a small calibration set through the model first, record
	activation statistics, fix the quantization parameters; lower latency.
- **Weight-only methods** (the LLM mainstream, since inference is memory-bound):
	- **GPTQ**: layer-wise quantization minimising output error using approximate
		second-order (Hessian) information; 3-4 bit weights.
	- **AWQ**: activation-aware; protect the \~1% salient weight channels (identified
		by activation magnitude) via per-channel scaling before 4-bit quantization.
	- **llama.cpp K-quants / GGUF**, **bitsandbytes NF4**: ecosystem workhorses. Unsloth's Dynamic 3.0 GGUFs (shipped 19 August 2026) are the next iteration of its dynamic quantization scheme for local models. [Docs](https://unsloth.ai/docs/basics/dynamic-3.0-ggufs) (\~15 min)
	- **SmoothQuant** (W8A8): migrate activation outliers into weights so both
		quantize well; **FP8 W8A8** is now the low-effort serving default on Hopper+.
	- **Ternary** (weights restricted to minus one, zero and plus one) is where the
		compression floor currently sits, and the quality cost is smaller than the bit count
		suggests: **Bonsai 2 27B** (Prism ML, September 2026) compresses Qwen3.8 27B to 1.76
		effective bits per weight with FP16 group-wise scaling, nine times smaller than full
		precision at 5.9GB, retaining 98.2% of aggregate benchmark performance at 83.9 overall
		with 262K context, image input and tool use intact. The nominal floor is not 1.585
		bits either. Five-trit packing rounds it up to 1.625 by assuming the three symbols are
		equally likely, but across 29 ternary models zeros account for up to 51.5% of weights,
		so BITCOS instead stores a dense presence bitmap plus a compacted sign vector, costing
		2 minus z bits per weight at zero density z: it beats five-trit packing on 26 of those
		29 models, reaches 1.485 bits on the sparsest, and runs end-to-end inference 1.18x
		faster on CPUs and 1.27x on GPUs. Note what this is not: these models were built
		ternary rather than converted, so the bits-per-weight numbers are a packing result and
		not a reason to quantise an ordinary checkpoint this far.
- Outliers are the central difficulty: a few channels with huge magnitudes destroy
	naive scaling (hence per-channel/block scales, AWQ, and rotation methods like
	QuIP#/SpinQuant for 2-3 bit).
## Reading a quantisation name (12 min)
Everything above is the *method*; this section is the *notation*: how to decode a quant string on a Hub repo without opening `config.json`.
### The GGUF grammar
The pattern is the letter `Q`, a nominal bit count, an underscore, and a variant tag. The variant tag carries the information.
- **`0`**** and ****`1`** (`Q4_0`, `Q5_1`, `Q8_0`): the **legacy** flat formats. A block is 32 weights with one fp16 scale (`_0`, symmetric) or a scale plus a minimum (`_1`, asymmetric). No second level of scaling. Superseded for everything except `Q8_0`, which survives because it is trivially fast to decode.
- **`K_S`****, ****`K_M`****, ****`K_L`** (`Q4_K_M`): the **K-quants**, and the two-level super-block scheme. A super-block is 256 weights, cut into 8 blocks of 32 (`Q4_K`, `Q5_K`) or 16 blocks of 16 (`Q2_K`, `Q3_K`, `Q6_K`). The super-block carries one fp16 scale, plus one fp16 minimum for the asymmetric types. Each inner block then carries its own 4-bit or 6-bit *sub-scale* (and sub-minimum) expressed relative to the super-block value. The scales are themselves quantised, which is the whole trick: you get group-wise granularity without paying a full fp16 scale per group. Same idea as GPTQ/AWQ group scaling, taken one level further.
- The **S/M/L suffix is not a different block format.** It is a per-tensor *mixing recipe* baked into llama.cpp, derived from measured layer sensitivity. `Q4_K_S` is uniformly `Q4_K`; `Q4_K_M` promotes `attention.wv` and `ffn_down` to `Q6_K` for roughly half the layers; `_L` additionally pushes the output head and token embeddings up. Value and down projections get the extra bits because they are empirically the most quantisation-sensitive, the same finding AWQ acts on when it protects salient channels.
- **`IQ`**** plus bits plus ****`XXS`****/****`XS`****/****`S`****/****`M`****/****`NL`** (`IQ2_XXS`, `IQ3_M`, `IQ4_XS`): the **importance-matrix family**. These are not scaled integers at all: they are codebook (lattice / lookup) quantisers whose bit allocation is steered by an imatrix, which is what makes 2-bit and 3-bit models usable. `XXS` to `M` orders by size within a bit width. `NL` means non-linear: a 16-entry non-uniform codebook over 32-weight blocks. Decode is slower than a K-quant because it is a table lookup rather than a multiply.
### Effective bits per weight, which is never the nominal number
Two overheads sit between the name and the file size. First, block bookkeeping: `Q4_K` costs 144 bytes per 256 weights, so its block format is exactly **4.5** bpw, not 4. Second, the mixing recipe plus the token-embedding and output tensors, which llama.cpp keeps at higher precision. So a `Q4_K_M` file lands near **4.9** bpw, and `Q2_K` near **3.2**, well above its 2.625 bpw block format.
Left column is what you type. The bpw column is measured whole-file bits per weight on Llama-3.1-8B from llama.cpp's own `tools/quantize` README, so it includes both overheads. The perplexity column is from llama.cpp's historical LLaMA-7B wikitext table and is **strongly model-dependent**: newer, smaller, more heavily-trained models degrade noticeably more than 2023-era LLaMA did, so read it as an ordering, not a prediction for your model.
<table fit-page-width="true" header-row="true">
<tr>
<td>Quant</td>
<td>Effective bpw (whole file, Llama-3.1-8B)</td>
<td>Quality cost (ppl delta vs fp16, LLaMA-7B)</td>
<td>Verdict</td>
</tr>
<tr>
<td>`Q2_K`</td>
<td>3.16 (block format 2.625)</td>
<td>+0.87</td>
<td>Last resort. Real, audible damage. Prefer `IQ2_M`/`IQ3` at the same size</td>
</tr>
<tr>
<td>`Q3_K_M`</td>
<td>4.00 (block 3.4375)</td>
<td>+0.24</td>
<td>Only when Q4 will not fit. `IQ3_M` is better quality for fewer bytes</td>
</tr>
<tr>
<td>`Q4_0`</td>
<td>About 4.6 (block 4.5), dropped from the current table</td>
<td>+0.22</td>
<td>Obsolete: same size as `Q4_K_S` for twice the error. Use only if a runtime supports nothing else</td>
</tr>
<tr>
<td>`Q4_K_S`</td>
<td>4.67</td>
<td>+0.11</td>
<td>The fallback when `Q4_K_M` overshoots your VRAM by a hair</td>
</tr>
<tr>
<td>**`Q4_K_M`**</td>
<td>4.89</td>
<td>+0.05</td>
<td>**The default.** Sits on the knee of the curve; the quant everything else is judged against</td>
</tr>
<tr>
<td>`Q5_K_M`</td>
<td>5.70</td>
<td>+0.014</td>
<td>When VRAM is free and you want margin on a task you have not evaluated</td>
</tr>
<tr>
<td>`Q6_K`</td>
<td>6.56</td>
<td>+0.004</td>
<td>Practically indistinguishable from fp16 on any benchmark you will run</td>
</tr>
<tr>
<td>`Q8_0`</td>
<td>8.50</td>
<td>+0.0004</td>
<td>Reference and debug builds. Over fp16 it buys only bandwidth, not quality</td>
</tr>
<tr>
<td>`IQ2_XXS`</td>
<td>2.38 (block 2.06)</td>
<td>Not in that table; expect large</td>
<td>The only way to fit a 70B+ in 24 GB. Needs an imatrix. Accept that it is a different model</td>
</tr>
<tr>
<td>`IQ3_M`</td>
<td>3.76</td>
<td>Not in that table; beats `Q3_K_M` per byte</td>
<td>Best quality per byte around 3 bits. Slower decode, needs an imatrix</td>
</tr>
<tr>
<td>`IQ4_XS`</td>
<td>4.46</td>
<td>Not in that table; `Q4_K_M` class</td>
<td>Roughly `Q4_K_M` quality at `Q4_K_S` size. The value pick when decode speed is not the constraint</td>
</tr>
<tr>
<td>`MXFP4`</td>
<td>4.25 nominal (E2M1 plus one E8M0 scale per 32)</td>
<td>Depends entirely on whether the model was trained for it</td>
<td>Use when the release is natively MXFP4 (gpt-oss). Do not convert into it hoping for free quality</td>
</tr>
</table>
### The importance matrix
An **imatrix** is a per-tensor record of how much each weight *column* actually influences the model's output, collected by running a calibration corpus through the fp16 model with `llama-imatrix` and accumulating the sum of squared activations feeding each column. The quantiser then minimises activation-weighted error rather than raw weight error, spending its scarce bits where they change the output.
I-quants **require** one: their codebooks are far too coarse for uniform treatment to survive at 2-3 bits. K-quants can optionally use one, and increasingly do; Unsloth's Dynamic GGUFs (noted above) are essentially an imatrix plus a hand-tuned per-tensor allocation.
A bad calibration set fails sneakily: **the model looks fine on the calibration distribution and quietly loses capability off it.** An imatrix built from English wikitext yields excellent wikitext perplexity while code generation, non-English output and instruction-following in unusual formats degrade; too-short calibration contexts produce a model that falls apart at long context. So never accept an uploader's reported perplexity as evidence for an I-quant, evaluate it on your own tasks, and when in doubt prefer a quant whose imatrix came from a broad mixed corpus (code, several languages, long documents) over one with a better-looking headline number.
### Names you will meet outside GGUF
<table fit-page-width="true" header-row="true">
<tr>
<td>Name you see</td>
<td>What it means</td>
</tr>
<tr>
<td>`gptq-4bit-128g-actorder_True`</td>
<td>GPTQ, 4-bit weight-only. **Group size 128**: one scale and zero-point per 128 consecutive weights along the input dimension. Smaller `g` is finer and more accurate but adds scale overhead; `32g` is the quality end, `128g` the usual compromise, no `g` means per-channel. **act-order** (`desc_act` in the config) quantises columns in order of decreasing activation importance so accumulated error lands on the columns that matter least. Better accuracy, historically incompatible with some fused kernels</td>
</tr>
<tr>
<td>`awq-4bit-128g`, `AWQ-INT4`</td>
<td>AWQ, 4-bit weight-only, group size 128. Instead of reordering, it rescales the roughly 1% of salient channels (chosen by activation magnitude) before quantising. No reordering means simpler, faster kernels, which is why AWQ often wins on throughput at similar accuracy</td>
</tr>
<tr>
<td>`nf4`, `fp4`, `load_in_4bit`, `bnb-4bit`</td>
<td>bitsandbytes. A **runtime flag, not a checkpoint format**: the fp16 weights are quantised on load. NF4 is a 16-level codebook fitted to a normal distribution over 64-weight blocks; "double quant" additionally quantises the block scales. This is the QLoRA base. Convenient, not competitive on serving throughput</td>
</tr>
<tr>
<td>`W4A16`</td>
<td>compressed-tensors / llm-compressor (the vLLM naming). Weights 4-bit integer, **activations left at 16-bit**. Needs calibration (GPTQ or AWQ under the hood). Memory-bound win: right for low concurrency where you are streaming weights</td>
</tr>
<tr>
<td>`W8A8` (`-INT8`)</td>
<td>Weights and activations both int8, so the matmul itself runs in int8. Needs calibration for the activation scales. The high-QPS, compute-bound choice on pre-Hopper hardware</td>
</tr>
<tr>
<td>`FP8-dynamic`</td>
<td>fp8 W8A8 with **per-channel weight scales and per-token activation scales computed at runtime**. No calibration set required. The low-effort near-lossless default on Hopper and Blackwell</td>
</tr>
<tr>
<td>`FP8-static`</td>
<td>Same, but the activation scales are frozen from a calibration pass. Marginally faster (no per-token reduction), and marginally more brittle: a distribution shift away from the calibration data shows up as clipping</td>
</tr>
<tr>
<td>`NVFP4`, `MXFP4` checkpoints</td>
<td>Blackwell-native 4-bit. NVFP4 uses 16-element blocks with fp8 scales and needs calibration for the global activation scale; MXFP4 uses 32-element blocks with E8M0 scales and works round-to-nearest. See the 4-bit frontier section above</td>
</tr>
<tr>
<td>Trailing `-KV8`, `-FP8-KV`</td>
<td>Not about the weights at all: the **KV cache** is stored quantised. Orthogonal to the weight scheme, and often the bigger memory win at long context</td>
</tr>
</table>
### On the dual 5090s
Spend the memory budget on parameters, not on bits: **a bigger model at ****`Q4_K_M`**** beats a smaller model at ****`Q8_0`** almost every time, and the 4-bit rule of thumb of roughly 0.6 GB per billion parameters tells you which model that is. The cliff for dense models sits below about 3 bits, where the drop stops being a perplexity number and becomes visible as broken reasoning chains and format drift. MoE is different: the experts tolerate much harder quantisation than the attention and shared layers, which is why 100B-class MoEs run acceptably at 4-bit on 64 GB when a dense 70B at the same bpw would be more compromised. But note what the two 5090s are: **Blackwell SM120 with native fp8 and NVFP4 tensor cores**, while GGUF's K-quants are a CPU-friendly design that dequantises to fp16 before the matmul. For single-stream interactive work the difference is small and llama.cpp's flexibility wins; once concurrency matters, an fp8 or NVFP4 checkpoint under vLLM uses hardware the GGUF path never touches, and the gap becomes large. Fit and residency arithmetic for these cards is in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81f7a144fe25d799e811"/>.
**Further resources**: [What is quantization?](https://theaiengineer.substack.com/p/what-is-quantization) (\~20 min) and [Quantization in practice: GPTQ vs AWQ](https://theaiengineer.substack.com/p/quantization-in-practice-gptq-vs-awq) (\~25 min) (The AI Engineer); [GGUF format and k-quants explained](https://zeroentropy.dev/concepts/gguf/) (\~25 min); [HF Hub: GGUF quantisation types](https://huggingface.co/docs/hub/gguf) (docs, \~20 min), the reference table for block structures and nominal bpw; [llama.cpp quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md) (\~15 min), the source of the measured bpw column; [llm-compressor compression schemes](https://docs.vllm.ai/projects/llm-compressor/en/stable/guides/compression_schemes/) (docs, \~20 min), the authority on the `W4A16` naming; [Which Quantization Should I Use? (arXiv 2601.14277)](https://arxiv.org/abs/2601.14277) (45 min), a unified evaluation of llama.cpp quantizations on Llama-3.1-8B-Instruct.
Running these locally: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81f7a144fe25d799e811"/>. What the container around them is: <mention-page url="https://app.notion.com/p/3cd5c17b0d0d81ea815aedfa052e4919"/>.
## Quantization-aware training (QAT) (1 min)
Insert **fake-quantization** ops during training (quantize-dequantize in forward;
straight-through estimator in backward) so the model learns weights robust to the
eventual precision. Costs extra training compute; recovers most of PTQ's loss at
4 bits and below. Current practice: short QAT fine-tunes after PTQ (torchao),
Gemma/Qwen official QAT checkpoints, and "QAT-from-scratch" for 4-bit-native
models. QLoRA-style training (frozen NF4 base + bf16 adapters) is the budget
alternative; see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eba08eef56b3e3b4eb"/>.
## Mixed-precision training (2 min)
Compute-heavy ops run in low precision; numerically sensitive state stays high:
1. **fp32 master weights and optimizer states**; low-precision working copies for
	forward/backward (otherwise tiny updates round away).
2. Matmuls in fp16/bf16 (tensor cores); reductions/softmax/norms often fp32.
3. **Loss scaling** (fp16 only): gradients underflow fp16's range, so multiply the
	loss by S (e.g. 1024, or dynamic) before backward, scaling all grads up
	through the chain rule; unscale in fp32 before the optimizer step. bf16 has
	fp32's exponent range, so it skips loss scaling entirely: this is why bf16
	became the default.
4. **fp8 training** (Hopper/Blackwell + Transformer Engine): matmul inputs in
	E4M3/E5M2 with per-tensor (delayed) or per-block scaling; weights/grads
	accumulate in higher precision. DeepSeek-V3 proved fine-grained fp8 pretraining
	at 671B scale (block-wise 128x128 weight scales, tile-wise activations);
	torchtitan/TE make fp8 a config flag with \~30-40% throughput gains.
## The 4-bit frontier (2025-26) (2 min)
Blackwell tensor cores natively support MXFP8/MXFP4/NVFP4, moving 4-bit from a
storage trick to a compute format:
- **NVFP4 pretraining** (NVIDIA 2025): 12B model, 10T tokens, matching-quality
	training with 2-3x matmul speedups; needs Hadamard-transform outlier smoothing,
	stochastic rounding, and keeping sensitive layers in higher precision.
- **NVFP4 vs MXFP4**: NVFP4's 16-element blocks with fp8 scales beat MXFP4's
	32-element E8M0 blocks on quality (one study: MXFP4 needs \~36% more tokens to
	match NVFP4's loss); MXFP4 wins only for NVIDIA+AMD portability.
- Low-precision **RL** is live: MXFP8 rollouts+training and NVFP4 rollouts with
	bf16 training (LMSYS Miles, 2026), reducing the rollout/trainer precision
	mismatch that destabilises RL.
- Inference default stack 2026: bf16 -\> fp8 W8A8 (near-lossless) -\> NVFP4/int4
	weight-only for memory-bound serving; MoE models quantize experts aggressively.
Serving-side kernels and KV-cache quantization live in
<mention-page url="https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13"/>; hardware details in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e"/>.
