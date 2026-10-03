"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Corrections of the old page are listed
with the corrected text as the check.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw)))
R, Q, B, T, F = 'The paper tab', 'Quantise and accumulate tab', 'Check the bill tab', "The paper's tables tab", 'Further reading'
C = [
 # header
 ('Reading time line "12 min read, +~3h 5m resources"', 'replaced by the build-computed reading time and resources total (3h 20m: one resource added)', ['min to read', '3h 20m of resources']),
 ('Authors/lab: DeepSeek-AI', R + ', headline card', ['DeepSeek-AI']),
 ('Date: December 2024 (arXiv v1 2024-12-27; v2 2025-02-18)', R + ', headline card', ['arXiv v1 27 December 2024; v2 18 February 2025']),
 ('Link arXiv 2412.19437 (~1h 30m, technical report)', 'card and ' + F, ['https://arxiv.org/abs/2412.19437', '(1h 30m)']),
 ('Link GitHub weights + code (repo, ~20 min for README and entry path)', 'card and ' + F, ['https://github.com/deepseek-ai/DeepSeek-V3', 'about 20 minutes for the README and entry path']),
 ('Added to KB: 2026-08-24', 'breadcrumb line', ['added to the knowledge base 2026-08-24']),
 # resources
 ('Shirley Li TDS, MLA explained (~20 min): MLA from MHA/MQA/GQA incl. decoupled RoPE', F, ['https://towardsdatascience.com/deepseek-v3-explained-1-multi-head-latent-attention-ed6bee2a67c4/', 'the clearest derivation of MLA from MHA, MQA and GQA, including the decoupled RoPE trick']),
 ('Stratechery DeepSeek FAQ (~20 min): what the $5.576M covers, why the release landed', F + ' and ' + R, ['https://stratechery.com/2025/deepseek-faq/', 'what the $5.576M figure does and does not cover']),
 ('planetbanatt Fermi estimate (~15 min): independent sanity check of GPU hours', F + ', ' + R + ', ' + B, ['https://planetbanatt.net/articles/v3fermi.html', 'an independent sanity check that the claimed GPU hours are plausible']),
 ('DeepWiki MLA implementation walkthrough (~20 min): equations to code', F, ['https://deepwiki.com/deepseek-ai/DeepSeek-V3/4.2-multi-head-latent-attention-(mla)', "maps the paper's equations to the released code"]),
 # problem
 ('Open models trailed frontier closed models; dense scaling priced out of reach', R + ', Problem', ['Open models trailed the frontier closed ones', 'priced out of reach for most labs']),
 ('V2 validated MLA and fine-grained MoE; V3 asks how far co-design can push a 671B MoE on export-restricted H800s', R + ', Problem', ['DeepSeek-V2 had already validated', 'co-design of algorithms, frameworks and hardware', 'export-restricted H800s']),
 ('Three goals: MoE without aux-loss damage, FP8 without divergence, cross-node EP without communication bottleneck', R + ', Problem', ['an MoE balanced without the auxiliary loss', 'FP8 training that does not diverge', 'without the all-to-all communication becoming the bottleneck']),
 # method: shape
 ('671B total, 37B active; 61 layers, hidden 7168, 128 heads; 14.8T tokens; no irrecoverable spikes, no rollbacks', R + ', Problem and Architecture; card', ['671B total parameters, 37B active per token', '61 layers, hidden size 7,168, 128 attention heads', 'no irrecoverable loss spikes and no rollbacks']),
 # MLA
 ('MLA: h_t down-projected to latent c_KV of 512, up-projected per head', R + ', Architecture', ['d c = 512', 'up-projected per head for keys and values']),
 ('RoPE cannot commute through the up-projection: decoupled shared key k_R of 64 dims concatenated to every head', R + ', Architecture', ['RoPE cannot pass through the up-projection', 'of 64 dimensions, shared by all heads', 'concatenated to every head']),
 ('Only c_KV and k_R cached: 576 per token vs 32768 (K+V), ~57x reduction', R + ', Architecture; ' + T + ' checks', ['576 numbers per token per layer', '32,768', 'about 57 times fewer']),
 ('"matching or beating standard MHA quality" (corrected: the paper says comparable performance, evidence from V2)', R + ', Architecture', ['while maintaining performance comparable to standard Multi-Head Attention']),
 ('Query low-rank compression (1536) only to cut training activation memory; up-projections absorbed at inference', R + ', Architecture', ["d c ′ = 1,536", 'only to cut activation memory in training', 'absorbed into the neighbouring matrices']),
 # MoE
 ('MoE in all but first 3 layers: 1 shared + 256 routed experts, intermediate 2048', R + ', Architecture; parameter chart', ['1 shared expert and 256 routed experts, each with intermediate size 2,048']),
 ('Top-8 by sigmoid affinity, normalised over selected set', R + ', Architecture', ['sigmoid', 'top-8 scores are renormalised to sum to one']),
 ('Bias b_i added only for top-K selection, gate uses raw score', R + ', Balancing', ['only to choose', 'still uses the raw affinity']),
 ('After every step overloaded experts bias -gamma, underloaded +gamma; gamma=0.001', R + ', Balancing', ['falls by γ', 'γ = 0.001']),
 ('Vestigial sequence-wise balance loss alpha=1e-4 against extreme per-sequence imbalance', R + ', Balancing', ['α = 0.0001', 'just to avoid extreme imbalance within any single sequence']),
 ('Ablations at 16B and 229B (precisely 15.7B and 228.7B) show aux-loss-free beats aux-loss models', R + ' Balancing; ' + T + ' ablation chart', ['15.7B-total', '228.7B-total', 'wins 9 of 10 benchmarks at the small scale']),
 ('Stronger expert domain specialisation', R + ', Balancing', ['specialising more by Pile domain']),
 ('Batch-wise balancing strictly looser than sequence-wise', R + ', Balancing', ['a strictly tighter constraint', 'batch-wise']),
 ('Node-limited routing (at most 4 nodes); no tokens dropped in training or inference', R + ', Architecture and Balancing', ['at most M = 4 nodes', 'drops no tokens in training', 'drops none in inference']),
 # MTP
 ('MTP: one extra sequential module (D=1) predicts the second-next token, full causal chain', R + ', MTP', ['sequential', 'keep the full causal chain', 'depth D = 1']),
 ("Unlike Gloeckle et al.'s parallel heads; closer to EAGLE", R + ', MTP', ["Gloeckle et al.'s parallel independent heads", 'like EAGLE']),
 ('Shares embedding and output head; weighted CE loss lambda 0.3 then 0.1', R + ', MTP', ["shares the main model's embedding and output head", 'λ = 0.3 for the first 10T tokens, 0.1 for the last 4.8T']),
 ('Discarded at inference: free training-signal densifier, or speculative decoding', R + ', MTP', ['discarded', 'densify the training signal', 'speculative decoding']),
 ('Second-token acceptance 85-90%, 1.8x decoding TPS', R + ', MTP predict; ' + T + ' checks', ['85 to 90%', '1.8×']),
 ('MTP ablations: consistent gains at identical inference cost', R + ', MTP; ' + T, ['costs exactly the same to run', 'consistently enhances the model performance on most of the evaluation benchmarks']),
 # FP8
 ('First public validation of FP8 mixed precision at this scale', R + ', FP8', ['first validation of FP8 mixed-precision training on an extremely large model']),
 ('All three Linear GEMMs (Fprop, Dgrad, Wgrad) in FP8', R + ', FP8', ['Fprop, Dgrad and Wgrad']),
 ('Embedding, output head, MoE gating, normalisation, attention stay BF16/FP32; master weights and gradients FP32; optimizer moments BF16', R + ', FP8', ['the embedding, the output head, the MoE gating, normalisation and attention', 'Master weights and weight gradients stay FP32', 'two moments drop to BF16']),
 ('Fine-grained quantisation: 1x128 activation tiles, 128x128 weight blocks, online scales, sharing exponent bits', R + ' FP8; ' + Q, ['per 1×128 tile', 'per 128×128 block', 'Online scales', 'share exponent bits']),
 ('E4M3 everywhere', R + ' FP8; ' + Q, ['uses E4M3 everywhere']),
 ('H800 tensor cores accumulate ~14 bits; partial sums promoted to FP32 CUDA-core registers every N_c=128 with dequant scales applied there', R + ' FP8; ' + Q, ['accumulate with about 14 bits', 'every N C = 128 elements', 'applying the dequantisation scales there']),
 ('Relative loss error vs BF16 under 0.25%', R + ' FP8 and card', ['within 0.25% relative', '&lt; 0.25%']),
 ('Tile/block scaling anticipates microscaling formats native to Blackwell', R + ' FP8 and Why it matters', ['microscaling formats', 'Blackwell']),
 ('Section 3.5 wishlist to NVIDIA: accumulation precision, native fine-grained scaling, fused FP8 cast + TMA', R + ', Infrastructure (wishlist)', ['higher FP8 accumulation precision in tensor cores', 'native tile- and block-wise scaling', 'fused FP8 cast with TMA']),
 # DualPipe and infra
 ('Cross-node EP gives ~1:1 compute-to-communication', R + ', Infrastructure', ['roughly 1:1']),
 ('DualPipe: bidirectional, pairs forward and backward chunks, overlaps attention/MLP with dispatch/combine, splits backward into input/weight grads (ZeroBubble)', R + ', Infrastructure', ['from both ends of the pipeline', 'pairs a forward chunk with a backward chunk', 'as in ZeroBubble']),
 ('Bubble (PP/2 - 1)(F&B + B - 3W); 2x parameter copies, cheap given large EP', R + ' Table 2 (data) and Infrastructure', ['(PP/2-1)(F&B+B-3W)', 'two copies of the parameters, cheap because the expert-parallel degree is large']),
 ('16-way PP, 64-way EP across 8 nodes, ZeRO-1 DP, no TP', R + ', Infrastructure', ['16-way pipeline parallelism, 64-way expert parallelism across 8 nodes and ZeRO-1 data parallelism', 'no tensor parallelism']),
 ('IB 50 GB/s vs NVLink 160 GB/s; once over IB per node then NVLink; 8 experts cost the same as up to 13', R + ', Infrastructure; ' + T + ' checks', ['NVLink gives 160 GB/s, about 3.2 times IB', 'crosses IB once per target node', 'up to 13 experts']),
 ('Only 20 SMs, warp-specialised, tuned PTX', R + ', Infrastructure', ['Only 20 SMs', 'warp specialisation', 'custom PTX']),
 ('Memory tricks: recompute RMSNorm and MLA up-projections, EMA in CPU, shared embedding/head (corrected: on the same pipeline rank, not across ranks) keep everything without TP', R + ', Infrastructure', ['recompute every RMSNorm and every MLA up-projection', 'in CPU memory', 'on one pipeline rank']),
 ('Inference disaggregates prefill and decode with redundant experts', R + ', Infrastructure (Serving)', ['separates prefill and decode', 'redundant experts']),
 # bill
 ('$5.576M: 2.788M H800 GPU hours = 2664K pre-training + 119K context extension + 5K post-training', R + ' The bill; ' + B, ['2,664K H800 GPU hours of pre-training, 119K of context extension and 5K of post-training', '$5.576M']),
 ('180K GPU hours per trillion tokens, 3.7 days per trillion on 2048 GPUs, under 2 months', R + ' The bill; ' + B, ['180K GPU hours per trillion tokens, 3.7 days', 'under two months']),
 ('Context extension with YaRN, two stages, 4K to 32K to 128K', R + ', Pre-training', ['YaRN', 'from 4K to 32K and then to 128K']),
 ('At an assumed $2/GPU-hour', R + ' The bill; ' + B, ['assumed rental price of $2 per GPU hour']),
 ('Covers only the final official run: no prior research, ablations, failed experiments; implicitly no capex or salaries', R + ' The bill; ' + B, ['excluding the costs associated with prior research and ablation experiments', 'hardware purchase, staff, failed runs']),
 ('January 2025 discourse ignored the caveat; honest reading: marginal compute cost of one run; ~order of magnitude below dense frontier runs', R + ' The bill', ['January 2025 discussion ignored that sentence', 'the marginal compute cost of one training run', 'roughly an order of magnitude below']),
 # post-training
 ('SFT on 1.5M instances; reasoning data distilled from R1-series experts via rejection sampling, balancing accuracy and verbosity', R + ', Post-training', ['1.5M instances', 'rejection sampling', 'overthink']),
 ('GRPO with rule-based rewards (maths answers, code tests) plus model-based RM', R + ', Post-training', ['GRPO', 'rule-based rewards', 'compiler test cases', 'a reward model trained from V3']),
 ('Constitutional-AI-style self-rewarding with V3 voting', R + ', Post-training', ['in the style of Constitutional AI', 'voting']),
 # results
 ('Base: MMLU 87.1, BBH 87.5, HumanEval 65.2, MATH 61.6; beats LLaMA-3.1 405B (11x active) on most, especially code and math', R + ' Results; ' + T, ['MMLU 87.1, BBH 87.5, HumanEval 65.2, MATH 61.6', 'with 11 times fewer active parameters', 'especially in code and math']),
 ('Chat: MMLU 88.5, MMLU-Pro 75.9, GPQA-Diamond 59.1, MATH-500 90.2 (above o1-preview), AIME 39.2, LiveCodeBench 40.5, Codeforces 51.6 pct, SWE-bench Verified 42.0 vs Claude 50.8', R + ' Results; ' + T, ['MMLU 88.5, MMLU-Pro 75.9, GPQA-Diamond 59.1, MATH-500 90.2', 'o1-preview', 'AIME 2024 39.2', 'LiveCodeBench 40.5', '51.6th percentile', 'SWE-bench Verified 42.0', '50.8']),
 ('Arena-Hard 85.5: first open model over 85, on par with Claude-3.5-Sonnet', R + ' Results; ' + T, ['Arena-Hard 85.5, the first open model above 85']),
 ('Efficiency: 2.788M H800 hours; MTP 1.8x TPS; MLA small KV cache, solid 128K needle-in-a-haystack', R + ' Results, Pre-training', ['2.788M H800 hours', 'Needle in a Haystack', 'across the whole 128K window']),
 # why it matters
 ('Collapsed assumed cost floor; with R1 a month later triggered repricing ("DeepSeek moment")', R + ', Why it matters', ['collapsed the assumed cost floor', 'DeepSeek moment']),
 ('Reference blueprint for large-scale MoE efficiency, widely adopted', R + ', Why it matters', ['reference blueprint for large-scale MoE efficiency']),
 ('Normalised publishing real systems detail (SM counts, PTX tricks, hardware requests)', R + ', Why it matters', ['SM counts, PTX-level tricks and hardware requests to NVIDIA']),
 ('Base model for R1, substrate of the 2025 open reasoning wave', R + ', Why it matters', ['base model of DeepSeek-R1', '2025 wave of open reasoning models']),
 ('Case study of co-design when GPU supply binds', R + ', Why it matters', ['what co-design buys when GPU supply is the binding constraint']),
 # connections
 ('R1: RL successor on V3-Base; distillation source', R + ' Connections; ' + F, ['RL-based reasoning built on V3-Base']),
 ('DeepSeekMath: origin of GRPO', R + ' Connections; ' + F, ['origin of GRPO']),
 ('Mixtral and Switch Transformer: earlier MoE; aux-loss-free addresses Switch trade-off', R + ' Connections; ' + F, ['the bias rule addresses the auxiliary-loss trade-off Switch introduced']),
 ('RoFormer: RoPE incompatibility motivates decoupled key', R + ' Connections; ' + F, ['why MLA needs a decoupled key']),
 ('ZeRO and Megatron-LM: DP/TP/PP toolbox V3 remixes (ZeRO-1 DP, no TP, DualPipe PP)', R + ' Connections', ['ZeRO-1 DP, no TP, DualPipe PP']),
 ('Llama 3: dense 405B baseline overtaken with 37B active', R + ' Connections; ' + F, ['the dense 405B baseline V3 overtakes with 37B active parameters']),
 ('Constitutional AI: basis of self-rewarding', R + ' Connections; ' + F, ["the basis of V3's self-rewarding feedback for open-ended RL"]),
 ('Topics: llms, llm-training-and-post-training, inference-and-serving, hardware', R + ' Connections; ' + F, ['3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81c08b3bc95ff45c7b13', '3c65c17b0d0d8118beeefaed56da6f8e']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [], 'corrections': [o['fact'] for o in out if 'corrected' in o['fact']], 'items_list': out},
          open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
