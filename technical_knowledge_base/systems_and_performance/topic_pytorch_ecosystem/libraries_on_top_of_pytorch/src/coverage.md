# Coverage of the old page "The layer above core: HF stack and training frameworks"

Old text: the root's `src/read/old/hf_stack_and_frameworks.md` (fetched 2026-09-22, verbatim). Every claim, its status (**verified**, **corrected**, **unconfirmed**, **moved**, **dropped**) and where the page carries it (R = Reading section, tab names as on the page). Checked 2026-10-13. Also the two claims the Making training fast child moved here.

| Old claim | Status | Where now |
|---|---|---|
| Last verified 2026-09-14; transformers 5.15, Axolotl 0.29+, torchtune discontinued | corrected: transformers 5.19.0 (2026-10-06), Axolotl 0.20.0 (2026-09-30; "0.29+" was wrong), torchtune unmaintained since 2025-07-15 | R4, R8, R9 |
| Resources: v5 blog, torchtune issue 2883, torchtitan repo and tech report, Axolotl docs, TRL docs | carried, links checked (HTTP 200, 2026-10-13) | Further reading |
| transformers v5: 5.0 in January 2026, monthly 5.x | verified (5.0.0 on 2026-01-26; 5.19.0 nine months later) | R4 |
| PyTorch-only, TF and Flax sunset | verified (v5 announcement) | R4 |
| Modular model definitions | verified (announcement); detail not repeated | R4 (one line: attention moved to a registry) |
| Pluggable attention: sdpa, flash_attention_2/3, flex_attention, kernels-hub entries | verified and run: registry keys at 5.19.0 include flash_attention_4 and paged eager; flex_attention trains nowhere here (no FlexAttention backward on CPU or MPS), inference ran | R4 |
| Quantization first class (bitsandbytes, TorchAoConfig, GPTQ/AWQ, fp8) | verified as "a first-class citizen" (announcement); the list moved to Quantization and Precision | R4 (link) |
| kernels library pulls prebuilt kernels from the Hub | verified on the root's map (kernels 0.17.2); not repeated | root map |
| transformers as model-definition source for vLLM and SGLang | verified (announcement) | R4 |
| pretraining-friendly init paths | verified ("reworked to support scaled pre-training") | R4 |
| Accelerate: launcher, prepare(), mixed precision, FSDP2 (fsdp_version: 2), DeepSpeed, Megatron plugins; device_map="auto" | verified in source (fsdp2_prepare_model L851-885; backward L2851); measured DDP on 2 processes; device_map not repeated | R4 |
| PEFT: LoRA, QLoRA, DoRA; composes with FSDP2 and TRL | verified for LoRA on the running example (root map); methods moved to the PEFT page | R4 (link) |
| TRL: SFTTrainer, DPO family, GRPOTrainer with vLLM, RewardTrainer | verified (all subclass transformers.Trainer); added: TRL's own defaults (gradient checkpointing, bf16, lr 2e-5 / 1e-6) | R4 |
| Scale-out RL goes to verl, SkyRL, OpenRLHF | kept as the chooser's many-node RL pick, linked to the post-training topic; not re-verified here | Chooser |
| datasets: Arrow, IterableDataset streaming; WebDataset or StreamingDataset for web scale | dropped as off-subject (data loading is not a training-loop library); datasets 5.1.0 is on the root's map | root map |
| torchtitan: pretraining reference, minimal-abstraction model code, FSDP2, TP/SP, PP, CP, EP, compile, float8/MXFP8, DCP async, torchft; fork and own; experiments tree; post-training consolidating there | verified and run on CPU (four patches); "meta-pytorch" ownership corrected by the root (it is pytorch/torchtitan); torchft not re-verified | R6 |
| torchtune discontinued 2025, critical fixes only, do not start new projects | verified (issue 2883) | R9 |
| torchforge: late 2025, Monarch + vLLM, paused in 2026, consolidating into torchtitan | paused and consolidation verified (README via root); Monarch + vLLM design not re-verified | R9 |
| Axolotl: YAML over transformers, PEFT, TRL; broad recipes; FSDP2 and DeepSpeed; MoE quantization; day-one support; the pragmatic default | verified as a Trainer/TRL subclass in source; defaults read; "MoE expert quantization" and "day-one" not re-verified (kept as "recipe surface", unquantified) | R8 |
| Lightning and Fabric: Trainer with callbacks, Fabric keeps your loop; FSDP2 and DeepSpeed strategies; LLM parallelism lands later | verified; corrected detail: FSDPStrategy is FSDP1, FSDP2 is ModelParallelStrategy (experimental) | R5 |
| Composer: maintenance, StreamingDataset, MPT-era recipes | verified as quiet (last release 2025-07-26) | R9 |
| Unsloth: single-GPU LoRA speed via Triton kernels | verified in source and extended (forward replacement, 41 Triton kernels, GPU required, MLX path, transformers cap) | R8 |
| LLaMA-Factory: GUI config fine-tuning | verified exists (0.9.5, 2026-05-30, PyPI); not read further | R8 |
| NeMo / Megatron-LM: NVIDIA scale-out pretraining | corrected: the NeMo repository is now speech only; LLM training is Megatron Core (0.19.2) | R9 |
| "When to use which" table | rebuilt as the Chooser tab with reasons tied to recorded facts | Chooser |
| Rule of thumb: HF for breadth, torchtitan for transparency and peak MFU; frameworks repackage FSDP2, DeepSpeed, TRL | kept as section 0's framing ("which duties you hand over"); "peak MFU" unconfirmed (no measurement here) and not stated | R0 |
| NVIDIA buying Hugging Face for $12.93B, confirmed 3 September; "now sits inside" NVIDIA | corrected by the root (definitive agreement 2026-09-02, about $11.9B plus up to about $1.0B retention equity, close expected first half 2027); this page links the root | R9 |
| Meta's churn tune -> forge -> titan; torchtitan releases track PyTorch minors | churn verified; "track PyTorch minors" unconfirmed and dropped | R9 |
| FSDP2 is the shared substrate for accelerate, Axolotl, Lightning, TRL, torchtitan; DeepSpeed the main alternative, a Foundation project | verified by traces (Lightning, torchtitan call fully_shard; Accelerate in source) and the root's source scan | R7 |
| Fine-tuning tools converge on TRL-derived trainers; differentiation is kernels, packing, config UX | verified for Axolotl (TRL subclasses) and Unsloth (kernels) | R8 |
| Cross-refs to Distributed PyTorch, alignment and RLVR pages | Distributed PyTorch linked; alignment and RL linked through Topic: llm-training-and-post-training | R0, Further reading |

## Moved here by the Making training fast child

| Claim | Status | Where |
|---|---|---|
| HF transformers supports `attn_implementation="flex_attention"` | verified: a key of `AttentionInterface` at 5.19.0 (modeling_utils.py L5122); ran inference on CPU and MPS; training raises (no FlexAttention backward on CPU or MPS at torch 2.14.1) | R4 |
| torchtitan uses FlexAttention with document masking | verified: every Llama 3 flavour defaults to `attn_backend="flex"`; SDPA is refused for language models; masks are block-causal per document (measured 55.9% masked at length 256 against 49.8% causal) | R6 |
| torchtitan exposes none / selective (op or layer) / full activation checkpointing | corrected: at 0.3.0 the options are none, full, selective (per-op only; the per-layer option is gone) and memory-budget; the per-op policy is described from source | R6 |

## New facts this page adds (not on the old page)

HF Trainer defaults read in source and measured (clip active on 145 of 150 steps); DeepSpeed's clipping default changing from 0 to 1.0 in 0.19.3 (PR 8068), measured; loss averaging under accumulation for five libraries, measured; v5's `dtype="auto"`; TRL's config overrides; torchtitan's bf16-on-one-rank, global token normalisation, FSDP divide factor 1, chunked loss, weight decay on every parameter; Lightning's per-step SIGTERM broadcast; ZeRO-3's persistence threshold and Python-side collectives; Axolotl's and Unsloth's version pins.
