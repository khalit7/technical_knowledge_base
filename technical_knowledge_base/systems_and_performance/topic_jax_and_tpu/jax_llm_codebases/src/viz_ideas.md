# Visual ideas: JAX LLM codebases (prefix lc)

Question the page keeps returning to: what does each piece of a production JAX trainer do, and is it the same computation as the code you would write yourself?

| # | Idea | Placement | Score (0-2 each: measurable parameter, reproduces a figure, computable from public data, shows what a sentence cannot, corrects a misconception, before/after animation) | Status |
|---|---|---|---|---|
| 1 | Porting animation: one tensor (query weight, LayerNorm scale, MLP weight) from PyTorch layout to MaxText's stacked layout, step by step, shapes checked against MaxText's own | Reading, The model | 1,2,2,2,2,2 = 11 | built |
| 2 | Logical-axis rule resolution animation: one Llama 2 7B weight through MaxText's 80 rules on two meshes, collisions shown, result checked against MaxText's own PartitionSpec, then the device grid (before/after the mesh change) | Reading, Sharding rules | 2,2,2,2,2,2 = 12 | built |
| 3 | Every parameter of Llama 2 7B and of the running example sharded by MaxText's code (5 cases) | Reading table | 1,2,2,1,1,0 = 7 | built |
| 4 | Loss difference per step, MaxText's step against the twin, with the three settings switched back one at a time | Reading, The train step | 2,2,2,2,2,0 = 10 | built |
| 5 | Remat policies x scan: XLA memory, FLOPs, HLO lines; bar chart + table | Reading, Scan and remat | 2,1,2,2,2,0 = 9 | built |
| 6 | MaxText MFU table rechecked with MaxText's FLOP count, current against pre-July-2025 count | Reading, MFU | 1,2,2,2,2,0 = 9 | built |
| 7 | LoRA against full fine-tuning curves (toy) | Reading, Tunix | 1,0,2,1,0,0 = 4 | built (labelled toy) |
| 8 | GRPO step through RLCluster, colocated against disaggregated (before/after), read from source | Reading, Tunix | 1,0,1,2,1,2 = 7 | built (illustrative, labelled) |
| 9 | Codebase map: three repos part by part, sized by lines, concern filter, symbols at their lines | Tab | 1,0,2,2,0,0 = 5 (+ the brief asked for it) | built |
| 10 | Config explorer: 81 flags, verbatim defaults and comments, values per model file | Tab | 1,0,2,1,1,0 = 5 (+ brief) | built |
| 11 | One train step: the 90 MaxText functions entered while tracing, stage by stage beside the running example; step 1 (cached) as the "after" | Tab | 1,2,2,2,2,2 = 11 | built |
| 12 | MaxText ahead-of-time compile for a v5e topology (train_compile.py) | | needs libtpu (Linux); not runnable here | rejected |
| 13 | Tunix GRPO run on the running example | | needs a KV-cache model and tokenizer; would teach the RL page's content | rejected |
| 14 | Levanter training run | | needs the Marin monorepo environment; Haliax demo covers named axes | rejected |
| 15 | Checkpoint save/restore through MaxText | | Orbax owned by the training stack page | rejected |

Inspiration: the DeepSeek MLA explainer (before/after on one input), the root's Tool map, the sharding child's propagation explorer.
What the methodology lacked: a rule for "a codebase as the subject": we used the five boxes as the axis and an equivalence run as the "reproduces a figure" criterion.
