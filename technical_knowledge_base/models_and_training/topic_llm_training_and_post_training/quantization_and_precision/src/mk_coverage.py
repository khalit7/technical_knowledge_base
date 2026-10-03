"""Write coverage.json: every fact, number, mechanism step, caveat and link in live.md, where the HTML carries it.
Each entry's 'probe' must occur in ../index.html (checked here), or the entry says why it was dropped or corrected."""
import json, os, re, html
HERE = os.path.dirname(os.path.abspath(__file__))
H = open(os.path.join(HERE, '..', 'index.html')).read()
T = html.unescape(re.sub(r'<[^>]+>', ' ', H)); T = re.sub(r'\s+', ' ', T)
E = []
def c(fact, where, probe, status='kept'): E.append(dict(fact=fact, where=where, probe=probe, status=status))
R = 'Reading'
# resources
c('Grootendorst Visual Guide to Quantization, ~40 min', 'Further reading', 'A Visual Guide to Quantization')
c('Ultra-Scale Playbook mixed-precision section, ~1h', 'Further reading', 'Ultra-Scale Playbook, mixed-precision section')
c('Pretraining LLMs with NVFP4, 45 min', 'Further reading; Reading 4-bit frontier', 'Pretraining LLMs with NVFP4')
c('NVFP4 vs MXFP4 decision guide (Spheron), ~25 min', 'Further reading; Reading 4-bit frontier', 'NVFP4 vs MXFP4 decision guide')
c('LMSYS end-to-end MXFP8 and NVFP4 RL, ~30 min', 'Further reading; Reading 4-bit frontier', 'LMSYS: end-to-end MXFP8 and NVFP4 RL')
# formats table
for f, p in [('fp32 1/8/23 master weights, reductions', 'Master weights, optimiser state, reductions'), ('tf32 1/8/10 Ampere matmul default, fp32 range', "Ampere's default for fp32 matmuls"),
             ('fp16 1/5/10 precision-rich range-poor needs loss scaling', 'Precision-rich, range-poor'), ('bf16 1/8/7 fp32 range less precision, training default, no loss scaling', 'the training default'),
             ('fp8 E4M3/E5M2 1/4/3, 1/5/2 Hopper+; E4M3 weights/activations, E5M2 grads', 'E4M3 for weight and activation tensors, and E5M2 for gradient tensors'), ('int8 classic inference PTQ target', 'The classic PTQ target'),
             ("NF4 QLoRA's normal-distribution-optimal codebook", "QLoRA's codebook"), ('MXFP8/MXFP4 fp8/fp4 + shared E8M0 scale per 32-block, OCP open standard (NVIDIA + AMD)', 'The OCP open microscaling standard'),
             ('NVFP4 fp4 E2M1 + fp8 scale per 16-block, Blackwell native, finer scaling better quality', 'NVIDIA Blackwell native')]:
    c('Formats table: ' + f, R + ', Number formats (table)', p)
# PTQ
c('PTQ: quantize a trained model, no retraining; fp32 to fp16/bf16 essentially free', R + ', PTQ', 'fp32 to fp16 or bf16 is essentially free')
c('mapping quantized = round(x/scale) + zero_point, per tensor/channel/block', R + ', PTQ', 'q = round(x / scale) + zero_point')
c('Dynamic PTQ: activation params on the fly per batch; simpler, latency overhead', R + ', PTQ', 'Dynamic PTQ')
c('Static PTQ: calibration set, record activation statistics, fix params; lower latency', R + ', PTQ', 'Static PTQ')
c('Weight-only methods mainstream since inference is memory-bound', R + ', PTQ', 'Weight-only methods')
c('GPTQ: layer-wise, output error, approximate second-order Hessian, 3-4 bit', R + ', PTQ (weight-only methods)', 'GPTQ')
c('AWQ: protect ~1% salient channels by activation magnitude via per-channel scaling before 4-bit', R + ', PTQ', 'protecting only 1% salient weights')
c('llama.cpp K-quants/GGUF, bitsandbytes NF4: ecosystem workhorses', R + ', PTQ', 'ecosystem workhorses')
c('Unsloth Dynamic 3.0 GGUFs shipped 19 August 2026, next iteration of dynamic quantization, docs ~15 min', R + ', PTQ; Further reading', 'Dynamic 3.0 GGUFs (19 August 2026')
c('SmoothQuant W8A8: migrate activation outliers into weights', R + ', PTQ and Outliers (animation)', 'migrate activation outliers into the weights')
c('FP8 W8A8 low-effort serving default on Hopper+', R + ', PTQ', 'FP8 W8A8')
c('Ternary weights -1/0/+1, compression floor, quality cost smaller than bits suggest', R + ', Ternary', 'where the compression floor currently sits')
for p in ['Ternary Bonsai 2 27B', '1.76 effective bits per weight', 'FP16 group-wise scaling', '5.9GB', '98.2%', '83.9', '262K', 'Qwen3.8 27B']:
    c('Bonsai 2 27B: ' + p, R + ', Ternary (with derived checks)', p)
c('Nominal floor not 1.585; five-trit packing rounds to 1.625', R + ', Ternary', 'rounds up to 1.625')
c('zeros up to 51.5% across 29 ternary models', R + ', Ternary', '51.5%')
c('BITCOS bitmap + sign vector, 2 - z bits per weight', R + ', Ternary', '2 − z bits per weight')
c('BITCOS beats five-trit packing on 26 of 29, 1.485 bits on sparsest', R + ', Ternary', '1.485 bits')
c('BITCOS 1.18x CPU, 1.27x GPU', R + ', Ternary', '1.18×')
c('Ternary models built not converted: packing result, not a reason to quantise far', R + ', Ternary (warning box)', 'were built ternary rather than converted')
c('Outliers central difficulty; per-channel/block scales, AWQ, rotations QuIP#/SpinQuant for 2-3 bit', R + ', Outliers', 'Outliers, the central difficulty')
# names
c('Quant name section framing: method vs notation, decode without config.json', R + ', Reading a name', 'without opening config.json')
c('GGUF pattern: Q, nominal bits, underscore, variant tag', R + ', GGUF grammar', 'The variant tag carries the information')
c('_0/_1 legacy: 32-weight block, fp16 scale (sym) or scale+min (asym); superseded except Q8_0 fast decode', R + ', GGUF grammar', 'trivially fast to decode')
c('K-quants: super-block 256, 8x32 (Q4_K,Q5_K) or 16x16 (Q2_K,Q3_K,Q6_K); fp16 scale (+min); sub-scales 4/6-bit; scales quantised; like GPTQ/AWQ group one level further', R + ', GGUF grammar', 'which is the whole trick')
c('S/M/L suffix is a per-tensor mixing recipe from layer sensitivity', R + ', GGUF grammar', 'is not a different block format')
c('Q4_K_M promotes attention.wv and ffn_down to Q6_K for roughly half the layers', R + ', GGUF grammar (with use_more_bits)', 'exactly half of a 32-layer model')
c('Q4_K_S uniformly Q4_K; _L pushes output head and embeddings up', R + ', GGUF grammar (correction box)', 'is uniformly', 'corrected: Q4_K_S promotes early attn_v/ffn_down to Q5_K; only _L type in llama.cpp is Q3_K_L')
c('Value and down projections most quantisation-sensitive, same finding as AWQ', R + ', GGUF grammar', 'the most quantisation-sensitive')
c('IQ family: codebook/lattice, imatrix-steered, makes 2-3 bit usable; XXS..M size order; NL 16-entry non-uniform codebook over 32; slower decode (lookup)', R + ', GGUF grammar', 'importance-matrix family')
c('Two overheads: block bookkeeping (Q4_K 144 bytes/256 = 4.5) and mixing recipe + embeddings/output', R + ', Effective bits (and block layout widget)', 'Two overheads sit between the name and the file size')
c('Q4_K_M file ~4.9 bpw, Q2_K ~3.2 vs 2.625 block', R + ', Effective bits', 'near 3.2')
c('bpw column measured whole-file on Llama-3.1-8B from llama.cpp tools/quantize README', R + ', Effective bits (table note, widget caption)', 'measured on Llama-3.1-8B')
c('Perplexity column from llama.cpp historical LLaMA-7B table, strongly model-dependent; newer models degrade more; read as ordering', R + ', Effective bits', 'strongly model-dependent')
for q, a, b in [('Q2_K', '3.16 (2.625)', '+0.87'), ('Q3_K_M', '4.00 (3.4375', '+0.24'), ('Q4_K_S', '4.67', '+0.11'), ('Q4_K_M', '4.89', '+0.05'), ('Q5_K_M', '5.70', '+0.014'), ('Q6_K', '6.56', '+0.004'), ('Q8_0', '8.50', '+0.0004'), ('IQ2_XXS', '2.38 (2.06)', 'expect large'), ('IQ3_M', '3.76', 'beats'), ('IQ4_XS', '4.46', 'class')]:
    c(f'Table row {q}: bpw {a}, ppl {b}, verdict', R + ', quant table', a)
c('Table row Q4_0: about 4.6 (block 4.5), +0.22, obsolete, same size as Q4_K_S for twice the error', R + ', quant table (correction box)', 'Obsolete: about the size of', 'corrected: +0.22 is from the August 2023 list; same-version (July 2023) value +0.2499; ratio 1.7 to 2.2 times')
c('Table row MXFP4: 4.25 nominal, depends on training, use when native (gpt-oss)', R + ', quant table', 'Do not convert into it hoping for free quality')
c('Verdict texts per row (last resort; only when Q4 will not fit; fallback; default/knee; margin; indistinguishable; reference/debug; 70B+ in 24 GB; best per byte ~3 bits; value pick)', R + ', quant table', 'The only way to fit a 70B+ in 24 GB')
c('imatrix: per-tensor record of column influence; llama-imatrix; sum of squared activations; minimise activation-weighted error', R + ', importance matrix', 'sum of squared activations feeding each column')
c('I-quants require imatrix; K-quants optionally; Unsloth Dynamic = imatrix + hand-tuned per-tensor allocation', R + ', importance matrix', 'hand-tuned per-tensor allocation')
c('Bad calibration fails sneakily; English wikitext example; short contexts; never accept uploader perplexity; prefer broad mixed corpus', R + ', importance matrix', 'quietly loses capability off it')
for n, p in [('gptq-4bit-128g-actorder_True: group 128, 32g quality end, no g per-channel, act-order desc_act, kernel incompatibility', 'gptq-4bit-128g-actorder_True'), ('awq-4bit-128g: rescales ~1% salient channels, no reordering, simpler faster kernels', 'awq-4bit-128g'),
             ('nf4/fp4/load_in_4bit/bnb-4bit: runtime flag not checkpoint; 64-weight blocks; double quant; QLoRA base; not competitive on throughput', 'runtime flag, not a checkpoint format'), ('W4A16: llm-compressor naming; weights 4-bit, activations 16; calibration GPTQ/AWQ; low concurrency', 'W4A16'),
             ('W8A8 INT8: matmul in int8; calibration; compute-bound pre-Hopper', 'the matmul itself runs in int8'), ('FP8-dynamic: per-channel weights, per-token activations at runtime; no calibration; near-lossless default', 'per-channel weight scales and per-token activation scales computed at runtime'),
             ('FP8-static: frozen activation scales; marginally faster; brittle, clipping', 'shows up as clipping'), ('NVFP4/MXFP4 checkpoints: 16 blocks fp8 scales calibration global activation scale; 32 blocks E8M0 RTN', 'requires a calibration dataset to calibrate activation global scales'),
             ('-KV8/-FP8-KV: KV cache quantised, orthogonal, bigger win at long context', 'often the bigger memory win at long context')]:
    c('Names outside GGUF: ' + n, R + ', names outside GGUF table', p)
c('Dual 5090s: bigger model at Q4_K_M beats smaller at Q8_0; ~0.6 GB per billion', R + ', On the dual 5090s (with derived check)', '0.61 GB per billion')
c('Dense cliff below ~3 bits: broken reasoning chains, format drift', R + ', On the dual 5090s', 'broken reasoning chains and format drift')
c('MoE experts tolerate harder quantisation; 100B-class MoE at 4-bit on 64 GB vs dense 70B', R + ', On the dual 5090s', '100B-class MoEs run acceptably at 4-bit on 64 GB')
c('5090s: Blackwell SM120 native fp8 and NVFP4; K-quants dequantise to fp16 before matmul; single-stream llama.cpp wins; concurrency vLLM fp8/NVFP4 gap large', R + ', On the dual 5090s', 'Blackwell SM120 with native FP8 and NVFP4 tensor cores')
c('Link: Ollama, llama.cpp, and local serving (fit and residency arithmetic; running locally)', R + ', On the dual 5090s; Further reading', 'Ollama, llama.cpp, and local serving')
c('Link: Model formats page (the container)', R + ', On the dual 5090s; Further reading; Mistakes', 'Model formats: GGUF, safetensors, ONNX, and the rest')
for n, p in [('What is quantization? (~20 min)', 'What is quantization?'), ('Quantization in practice: GPTQ vs AWQ (~25 min)', 'Quantization in practice: GPTQ vs AWQ'), ('GGUF format and k-quants explained (~25 min)', 'GGUF format and k-quants explained'),
             ('HF Hub GGUF quantisation types (~20 min)', 'Hugging Face Hub: GGUF quantisation types'), ('llama.cpp quantize README (~15 min)', 'llama.cpp quantize README'), ('llm-compressor compression schemes (~20 min)', 'llm-compressor compression schemes'),
             ('Which Quantization Should I Use? arXiv 2601.14277 (45 min)', 'Which Quantization Should I Use?')]:
    c('Further resource: ' + n, 'Further reading (and inline)', p)
# QAT
c('QAT: fake-quantization quantize-dequantize forward, straight-through estimator backward', R + ', QAT', 'straight-through estimator')
c('QAT costs extra compute; recovers most of PTQ loss at 4 bits and below', R + ', QAT (with published results table)', 'recovers most of PTQ')
c('Current practice: short QAT fine-tunes after PTQ (torchao), Gemma/Qwen official QAT checkpoints, QAT-from-scratch 4-bit-native', R + ', QAT', 'official QAT checkpoints', 'corrected: Qwen ships AWQ, GPTQ-Int4 and FP8 checkpoints, no QAT ones found; Gemma 3 and Llama 3.2 QAT kept')
c('QLoRA-style frozen NF4 base + bf16 adapters as budget alternative; link PEFT', R + ', QAT', 'QLoRA-style training (frozen NF4 base plus bf16 adapters)')
# mixed precision
c('Mixed precision: compute low, sensitive state high', R + ', Mixed precision', 'numerically sensitive state stays high')
c('1. fp32 master weights and optimizer states; tiny updates round away otherwise', R + ', Mixed precision', 'small updates round away')
c('2. matmuls fp16/bf16 tensor cores; reductions/softmax/norms fp32', R + ', Mixed precision', 'reductions, softmax and norms often in fp32')
c('3. Loss scaling fp16 only: multiply loss by S (e.g. 1024 or dynamic), unscale in fp32; bf16 skips it, why bf16 default', R + ', Mixed precision', 'this is why bf16 became the default', 'refined: paper used 8 to 32K, dynamic scaling proposed not run; example 1024 replaced by the paper\'s 8 for SSD')
c('4. fp8 training Hopper/Blackwell + TE: E4M3/E5M2, per-tensor delayed or per-block; accumulate higher precision', R + ', Mixed precision', 'delayed scaling')
c('DeepSeek-V3 fine-grained fp8 at 671B: 128x128 weights, tile-wise activations', R + ', Mixed precision', '128 × 128 blocks for weights')
c('torchtitan/TE fp8 config flag with ~30-40% throughput gains', R + ', Mixed precision (correction box)', 'Float8 is a configuration flag', 'corrected: +41% Float8 over compile, +50% with compile vs eager, +65% at 128 GPUs')
# frontier
c('Blackwell tensor cores natively support MXFP8/MXFP4/NVFP4: 4-bit from storage trick to compute format', R + ', 4-bit frontier', 'moving 4-bit from a storage trick to a compute format')
c('NVFP4 pretraining: 12B, 10T tokens, matching quality', R + ', 4-bit frontier', '10T tokens')
c('NVFP4 pretraining 2-3x matmul speedups', R + ', 4-bit frontier (correction box)', 'not a speedup measured in the paper', 'corrected: 2x/3x is peak FP4 rate vs FP8 on GB200/GB300')
c('needs Hadamard outlier smoothing, stochastic rounding, sensitive layers higher precision', R + ', 4-bit frontier', 'stochastic rounding on gradients')
c('NVFP4 16-blocks fp8 scales beat MXFP4 32-element E8M0 on quality; MXFP4 ~36% more tokens; MXFP4 wins only for portability', R + ', 4-bit frontier', '36% more tokens', 'refined: 8B experiment, 1.36T vs 1T')
c('Low-precision RL: MXFP8 rollouts+training, NVFP4 rollouts with bf16 training (LMSYS Miles 2026), reducing mismatch', R + ', 4-bit frontier (correction box)', 'higher train-inference mismatch than BF16', 'corrected: mismatch is higher, not lower; NVFP4 covers MoE experts in rollout and forward only')
c('Inference default stack 2026: bf16 -> fp8 W8A8 -> NVFP4/int4 weight-only; MoE experts aggressive', R + ', 4-bit frontier; At a glance', 'Inference default stack, 2026')
c('Links: Topic inference-and-serving (kernels, KV-cache quantization); Topic hardware', R + ', 4-bit frontier; Further reading', 'Topic: hardware')
c('Read time 21 min + 6h 25m resources', 'not carried', '', 'dropped: Notion header metadata; Further reading lists each resource with its time')
missing = [e for e in E if e['probe'] and e['probe'] not in T and e['probe'] not in H]
for e in missing: print('MISSING', e['probe'])
json.dump(dict(source='src/live.md (Notion, fetched 2026-10-03)', entries=E, counts=dict(total=len(E), kept=sum(e['status'] == 'kept' for e in E), corrected=sum(e['status'] != 'kept' and not e['status'].startswith('dropped') for e in E), dropped=sum(e['status'].startswith('dropped') for e in E))), open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print(len(E), 'entries;', len(missing), 'missing')
