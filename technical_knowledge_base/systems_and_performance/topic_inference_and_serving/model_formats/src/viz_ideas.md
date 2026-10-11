# Visualisation ideas (Model formats)

| # | Idea | Score (teach / data / novelty) | Placement | Status |
|---|---|---|---|---|
| 1 | Pickle machine stepped opcode by opcode on a real checkpoint, a malicious pickle and the same tensors as safetensors (before/after on one input; counters: opcodes, imports, calls, bytes) | 5/5/5 | Reading s2 | built |
| 2 | File explorer: three real files of one model parsed field by field, whole-file and header maps, hex of each field, every tensor listed | 5/5/4 | tab | built |
| 3 | GGUF anatomy to scale: whole file, header zoom (tokenizer dominates), data section coloured by type | 5/5/4 | Reading s4 | built |
| 4 | Q4_K super-block bytes decoded by hand next to the original BF16 values | 4/5/4 | Reading s4 | built |
| 5 | Same 256 weights: GGUF block vs MLX groups, byte strips with offsets of the three MLX tensors | 4/5/4 | Reading s5 | built |
| 6 | Load time and memory, pickle vs safetensors, with whiskers | 4/5/3 | Reading s3 | built |
| 7 | dtype bit layouts plus "try a value" BF16/F16 representability | 4/4/3 | Reading s1 | built |
| 8 | Repo folder to scale by bytes | 3/5/3 | Reading s1 | built |
| 9 | ONNX operator counts of the exported Qwen3-0.6B | 3/5/4 | Reading s6 | built |
| 10 | Conversion map: format nodes, routes coloured lossless/lossy/kept, runs recorded per route; same model as eight files to scale | 4/5/3 | tab | built |
| 11 | Animated SVG graph of conversions | 2/3/2 | | rejected: labels unreadable at 390 px; the node grid plus route cards teaches the same |
| 12 | Quant-type quality ladder | | | rejected here: owned by Local and on-device inference (Quant ladder tab), linked |
| 13 | Cold-cache load comparison | | | not run: macOS cannot drop the page cache without root; cold numbers linked from LLM serving in production |

Methodology note: for a format page the strongest data is the bytes themselves; every visual is drawn from fields read out of real files rather than from documentation diagrams.
