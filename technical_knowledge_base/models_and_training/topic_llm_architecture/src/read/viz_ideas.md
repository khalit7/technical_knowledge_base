# Reading tab visuals

Built:
- Section 6: the same batch of 8 tokens through a dense FFN and an MoE layer (8 experts, top 2, capacity factor 1.25), 6 and 4 steps, router strips, dispatch lines, dropped assignments dashed, load bars against capacity, counters. Before/after on the same input (type 1). Router logits illustrative (seeded) until a recorded run exists. Score: moving quantity yes, mechanism animation yes, not elsewhere on the root (the MoE child will go deeper).
- Section 10: the same 8 tokens through one attention layer and one recurrent layer, areas to scale (one cache cell = 1,024 numbers; the state = 512 cells), the other method's footprint dashed behind, counters; plus a derived log-log chart of numbers held against context, crossing at 512 tokens (Qwen3-Next shapes). Corrects the misconception that a recurrent layer is always smaller: it is bigger below 512 tokens.
- Drills (predict-then-reveal): FFN share of a block; Llama 3.1 70B cache at 128K.
- Static: the decoder in one screen (section 0), the block table with shapes and weights (section 2), the attention variants at one shape (section 4), the annotated config (section 12), choosing (section 13).

Rejected:
- MHA, GQA, MQA, MLA cache animation in Reading: the Attention lab owns it, and DeepSeek owns MLA's; linked instead.
- Residual norm pre against post-norm animation in Reading: the Block lab owns it (measured).
- KV-cache calculator in Reading: the Attention lab and Config calculator own it.
- RoPE past the trained length animation: the Positional Encodings child owns it; a root section stays short.
- Parameter breakdown bar for Llama 3.1 8B: the Config calculator draws it for any model.
