# Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity

⏱ 10 min read · +~4h 45m resources

- **Authors/lab**: William Fedus, Barret Zoph, Noam Shazeer (Google Brain)
- **Date**: January 2021 (arXiv v1 2021-01-11; published JMLR 2022)
- **Links**: [arXiv 2101.03961](https://arxiv.org/abs/2101.03961) (~1h 30m, JMLR-length paper) | [JAX code + checkpoints (t5x)](https://github.com/google-research/t5x) (repo, ~20 min for the README and entry path) | [Mesh-TensorFlow reference implementation](https://github.com/tensorflow/mesh/blob/master/mesh_tensorflow/transformer/moe.py) (~15 min)
- Added to KB: 2026-08-24

### Best resources

- [Mixture of Experts Explained (Hugging Face blog)](https://huggingface.co/blog/moe) (~30 min): the canonical MoE explainer; its sections on Switch routing, capacity factor, load balancing, and selective precision are essentially a modern restatement of this paper.
- [A Visual Guide to Mixture of Experts (Maarten Grootendorst)](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts) (~30 min): the clearest diagrams of the router, expert capacity, and token dropping; walks through the Switch simplification step by step.
- [Mixture-of-Experts LLMs deep dive (Cameron Wolfe)](https://cameronrwolfe.substack.com/p/moe-llms) (~40 min): places Switch in the lineage from Shazeer 2017 and GShard through Mixtral and DeepSeekMoE, with the sparse-vs-active parameter math.
- [Yannic Kilcher's paper walkthrough (YouTube)](https://www.youtube.com/watch?v=iAR8LkkMMIM) (~1h): hour-long read-through of the paper with commentary on the routing and scaling claims.

### Problem

Kaplan-era scaling said bigger dense models are better, but every dense parameter is touched by every token, so parameter count and per-token FLOPs scale together. Sparse Mixture-of-Experts (Shazeer 2017, GShard) had shown you can decouple them, yet MoE saw little adoption for three reasons the paper attacks head-on: complexity (top-k routing, multiple auxiliary losses, capacity juggling), training instability (especially in bfloat16; GShard fell back to full float32), and communication cost. Switch Transformer asks whether MoE can be made simple, stable, and fast enough to make parameter count a routine fourth scaling axis at constant FLOPs per token.

### Method

**Architecture.** Take T5 and replace the FFN in (every other) Transformer block with a Switch layer: N expert FFNs plus a linear router W_r. The router computes logits h(x) = W_r x, softmaxes them into probabilities p_i(x), and sends the token to the single argmax expert. The layer output is the chosen expert's output scaled by its gate value p_i(x), which keeps the router differentiable.

**Top-1 routing (the core simplification).** Shazeer 2017 conjectured k >= 2 experts were needed for useful router gradients. Switch shows k = 1 preserves quality and wins on every systems metric: router compute drops, each expert's batch (capacity) can be at least halved, and the dispatch implementation and all-to-all communication get simpler and cheaper. Head-to-head at 128 experts, Switch beats a top-2 MoE Transformer on a speed-quality basis and tolerates lower capacity factors better.

**Capacity factor and token dropping.** TPU compilation needs static shapes, but routing is dynamic, so each expert gets a fixed buffer: expert capacity = (tokens per batch / num experts) * capacity factor. CF > 1.0 buys slack for imbalanced routing at the cost of padding compute and memory. Tokens that overflow an expert are dropped: they skip the FFN and pass through the residual connection unchanged. With good balancing, drops stay under about 1%, and low CF (1.0-1.25) is the sweet spot; this matters most at large scale where memory is scarce.

**Auxiliary load-balancing loss.** Per Switch layer, with f_i the fraction of tokens actually dispatched to expert i (argmax counts, non-differentiable) and P_i the mean router probability for expert i (differentiable), add loss = alpha * N * sum_i f_i * P_i. This is minimized by uniform routing at 1/N each, the N factor keeps its magnitude constant as expert count varies, and alpha = 1e-2 balances load without disturbing the language-modeling loss. This single loss replaces the separate load and importance losses of Shazeer 2017.

**Selective precision.** Pure bfloat16 diverges (the router's softmax and exponentials are the culprit); pure float32 is stable but pays float32 all-to-all communication (1160 vs 1390 examples/s). The fix: cast to float32 only inside the router function, locally on each device, and recast the dispatch/combine tensors to bfloat16 before they are communicated. Result: float32 stability at bfloat16 speed. Two more stability/regularization tricks: initialization scale reduced 10x (s = 0.1), and expert dropout at 0.4 (vs 0.1 elsewhere) when fine-tuning on small tasks.

**Expert parallelism.** Each device holds its own expert(s); the batch is data-parallel-sharded, the router builds a dispatch mask [n, B/n, E, C], and an all-to-all reshards tokens from the data dimension to the expert dimension, then back after the FFN. Section 5 lays out the full design space of data, model, and expert parallelism (how weights vs data shard over a 2D mesh) and combines all three for the biggest models. Switch-C (1.6T parameters, 2048 experts) uses expert + data parallelism only; Switch-XXL (395B, 64 experts) adds model parallelism for larger d_model/d_ff at fewer experts.

### Results

- **7x pretraining speedup at equal FLOPs**: Switch-Base 64e reaches T5-Base quality in one-seventh the wall-clock time on the same 32 TPUv3 cores (7.5x on a step basis). Quality improves monotonically with expert count (up to 256 experts, 14.7B params) at constant FLOPs per token.
- **Beats bigger dense models too**: Switch-Base outperforms T5-Large per step and gives a 2.5x wall-clock speedup despite T5-Large spending 3.5x more FLOPs per token.
- **Beats top-2 MoE**: at fixed compute, Switch reaches the quality threshold fastest (62.8h vs 80+ for MoE-Base variants) with a smaller compute footprint.
- **Downstream, not just perplexity**: FLOP-matched fine-tuning gains almost everywhere; SuperGLUE +4.4 points over T5-Base and +2 over T5-Large, large gains on Winogrande, closed-book TriviaQA, XSum, ANLI.
- **Distillation**: sparse teachers distill into FLOP-matched dense students keeping about 30% of the quality gain even at 95-99% parameter compression (e.g. 3.8B sparse into 223M dense).
- **Multilingual**: over mT5-Base on 101 languages, every language improves; mean 5x step speedup, 91% of languages at 4x or more.
- **Trillion scale**: Switch-C hits 1.6T parameters and trains with no instability; Switch-XXL (395B, 10x more FLOPs per token) is better per step but sporadically unstable. Both give a 4x speedup over T5-XXL, and Switch-XXL sets the upstream perplexity state of the art, though upstream gains only partially transfer to reasoning-heavy fine-tuning (a gap the paper flags honestly).

### Why it matters

This is the paper that made sparse MoE practical. It demolished the belief that top-k routing with k > 1 was necessary, compressed MoE's loss zoo into one balancing loss, showed bfloat16 sparse training is possible with a one-line precision fix, and articulated the vocabulary the field still uses: expert capacity, capacity factor, token dropping, expert parallelism, sparse vs active parameters. It established parameter count as a scaling axis independent of FLOPs, and its 1.6T Switch-C was the first trillion-parameter model trained. The lineage runs straight through GLaM and ST-MoE to Mixtral (top-2, coarse experts, open weights) and DeepSeekMoE/DeepSeek-V3 (fine-grained plus shared experts, aux-loss-free balancing that fixes the balancing-vs-quality tension Switch's loss introduced), to today's default frontier recipe of high-sparsity MoE (GPT-4-class models, Llama 4, Qwen3-MoE, Kimi K2). Its pain points were as influential as its fixes: token dropping motivated dropless kernels (MegaBlocks), and its instability at scale motivated the router-z-loss line of work (ST-MoE).

### Connections

- papers/2024-01_mixtral: the open-weights descendant that made the sparse-FFN template mainstream; top-2 where Switch is top-1, no capacity-factor machinery on GPUs.
- papers/2024-12_deepseek-v3: modern high-sparsity MoE; its aux-loss-free balancing is a direct response to the auxiliary loss introduced here.
- papers/2020-01_scaling-laws: the dense scaling results Switch extends with a fourth axis (parameters at fixed FLOPs).
- papers/2019-09_megatron-lm: tensor model parallelism, the technique Switch combines with expert and data parallelism in section 5.
- papers/2017-06_attention-is-all-you-need: the Transformer whose FFN sub-block the Switch layer replaces.
- Topics: `topics/llm-training-and-post-training` (expert parallelism, distributed training, distillation), `topics/llms` (MoE architecture lineage).
