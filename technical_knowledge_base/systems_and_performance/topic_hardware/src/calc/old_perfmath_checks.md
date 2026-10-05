# Old child page "Performance math: the arithmetic before every run" (Notion 3c65c17b0d0d81faad1ef390b0e54d08), checked by the calculator agent

Fetched read-only 2026-10-05 (last edited 2026-09-22). The Reading agent saves the verbatim copy in src/read/old/; this file only records verdicts for the facts the Performance calculator now carries.

| Old claim | Verdict | Where the calculator carries it |
|---|---|---|
| C = 6ND; inference 2N per token plus attention | verified (PaLM App. B, Kaplan) | Terms; "When 6ND is wrong" |
| "add ~30% if activation checkpointing recomputes the forward" | verified as 8ND/6ND = +33% hardware FLOPs; MFU still counts 6ND | "When 6ND is wrong", training formula box (HFU) |
| 8B, 1T tokens, 8 H100 at 40% MFU: ~176 days | verified: 175.5 days | Training preset "old8"; checks table |
| 16 bytes/param mixed-precision Adam; 8B 128 GB, 70B 1.1 TB | verified (8.03B x 16 = 128.5 GB; 70.55B x 16 = 1.13 TB) | Training calculator; drill 1 |
| Inference FP8/FP4 1 / 0.5 bytes; LoRA ~2 + adapters | verified; FP4 formats carry scales (NVFP4 4.5 bits, MXFP4 4.25 bits); LoRA r=16 adapters counted from the config | Inference weight formats; LoRA recipe |
| Activations "sbh x L x c (batch s x seq b ...)" | corrected: in Korthikanti et al. s is sequence and b is micro-batch; c = 34 + 5as/h, 34 with FlashAttention, 2 per layer with full recompute | Training activations option and formula box |
| KV per token 2 L n_kv d_head bytes; Llama 3.1 8B 128 KB/token; 8K tokens 1 GB | verified: 131,072 B = 128 KiB; 8,192 tokens = 1 GiB | Inference KV stat; checks table |
| 5090 FP8 8B ceiling ~224 tok/s | verified: 1,792 / 8.03 = 223 tok/s | Inference preset "old5090" |
| "expect 60-80% of it in vLLM/TensorRT-LLM" | unconfirmed (no source); replaced by a user-set efficiency slider | Inference efficiency slider |
| 64K context, FP8 KV: "64K x 128 KB / 8 = ~4 GB ... roughly halves it" | corrected: 4.3 GB is right but the arithmetic is "/ 2" (FP8 halves BF16's 8.6 GB); the ceiling drops 35% to 145 tok/s, not by half | checks table |
| 8x H100 70B TP8 batch-1 ceiling ~190 tok/s | verified: 26.8 TB/s / 141.1 GB = 190 tok/s (TP all-reduces excluded) | Inference preset "l70"; drill 4 |
| Critical AI: 5090 BF16 ~117, FP8 ~234; H100 ~295; B200 FP8 ~560 | verified against FACTS peaks | Roofline lab owns these; calculator uses 295 in prose |
| ~300 concurrent decode tokens to reach H100 critical AI | verified for short context (exact crossover 308 with Llama 3.1 8B); corrected in spirit: at 4K context decode never becomes compute-bound because each sequence reads its own KV | Inference crossover stat and chart; decode animation |
| 7.9e15 x 0.5 / 1.6e10 = ~250K tok/s for 8B on a node | arithmetic verified (247K); ignores KV reads and memory capacity, unconfirmed as achievable | not carried as a figure |
| MFU = tokens/s x 6N / peak; 50K tok/s on 8 H100 8B = 30% | verified: 30.3% | drill 8 |
| "40-50% very good, 30% respectable, under 20% means a bottleneck" | partly sourced: PaLM 46.2%, Llama 3 38-43%; the bands are the old page's judgement | Terms card says 35-45% is good for large dense training (Llama 3 Table 4, PaLM) |
| "full fine-tune of 8B (128 GB) does not fit two 5090s (64 GB)" | verified; the old page's "Khalid's hardware" framing dropped (no local NVIDIA GPU) | QLoRA preset uses one RTX 5090 |
| "One H100 node (640 GB) full-fine-tunes 8B easily and 70B only with FSDP + recompute + care (1.1 TB > 640 GB)" | verified arithmetic; 70B needs offload or more nodes | Training calculator (set l70, 8 GPUs, ZeRO 3) |
| Checklist (memory, 6ND, roofline, comm volume, inference) | kept as the tab's structure | section order |
| Best resources (EleutherAI Transformer Math 101, kipply, scaling book, Horace He, PaLM App. B) | links for Further reading (Reading agent owns 39_tab_more.html) | suggest adding all five there |
