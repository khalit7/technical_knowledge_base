"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "10 min read, +~3h 20m resources"', 'dropped: replaced by the build-computed reading time and resources total (4h 00m now, two follow-up papers added)', ['min to read', 'of resources']),
 ('Authors: Shoeybi, Patwary, Puri, LeGresley, Casper, Catanzaro (NVIDIA)', R + ', headline card', ['Mohammad Shoeybi', 'Mostofa Patwary', 'Raul Puri', 'Patrick LeGresley', 'Jared Casper', 'Bryan Catanzaro', 'NVIDIA']),
 ('Date: September 2019 (arXiv v1; v4 March 2020)', R + ', headline card', ['September 2019', 'v4 13 March 2020']),
 ('Link arXiv 1909.08053 (~45 min)', 'card and Further reading, The paper', ['https://arxiv.org/abs/1909.08053', '(45 min)']),
 ('Link code NVIDIA/Megatron-LM (repo, ~25 min for the README and entry path)', 'card and Further reading', ['https://github.com/NVIDIA/Megatron-LM', 'about 25 minutes for the README and entry path']),
 # resources
 ('Ultra-Scale Playbook, TP section (HF/nanotron, 2025, ~40 min): clearest modern walkthrough of column/row parallel linears with comm-cost analysis and profiles', 'Further reading, Best resources', ['https://huggingface.co/spaces/nanotron/ultrascale-playbook?section=tensor_parallelism', 'the clearest modern walkthrough of column- and row-parallel linears, with communication-cost analysis and profiles', '(40 min)']),
 ('Lilian Weng, How to Train Really Large Models on Many GPUs? (~45 min): situates TP among other parallelism and memory-saving techniques', 'Further reading, Best resources', ['https://lilianweng.github.io/posts/2021-09-25-train-large/', 'situates Megatron-style tensor parallelism among the other parallelism and memory-saving techniques']),
 ('Megatron-LM repo as a resource: the living codebase (now Megatron-Core), reference implementation', 'Further reading, The paper (code entry); Why it matters', ['now as Megatron-Core, and the reference implementation of everything in the paper']),
 # problem
 ('2019 frontier: BERT-large 336M, GPT-2 1.5B, hit single-accelerator memory wall', R + ', Problem', ['BERT-large at 336M parameters, GPT-2 at 1.5B', 'had reached the memory of a single accelerator']),
 ('Weights + Adam state + activations no longer fit on a 32GB V100 even with activation checkpointing', R + ', Problem, plus the memory calculator', ['a 32 GB V100 was running out even with activation checkpointing', 'Adam optimizer']),
 ('Pipeline parallelism: bubble overhead and optimizer complications (GPipe, PipeDream)', R + ', Problem', ['pipeline bubbles that reduce efficiency', 'changes to the optimizer that affect accuracy', 'PipeDream']),
 ('General distributed tensor frameworks needing a custom compiler (Mesh-TensorFlow, FlexFlow)', R + ', Problem', ['FlexFlow and Mesh-TensorFlow are frameworks with their own language and compiler']),
 ('The gap: split a layer itself, native PyTorch, handful of comm ops, no new compiler or framework', R + ', Problem (The gap)', ['a way to split a transformer layer itself across GPUs that is simple enough to write in native PyTorch with a handful of communication calls: no new compiler, no new framework']),
 # method
 ('Core idea: intra-layer model parallelism (TP), split weights so nonlinearities never see partial sums; few all-reduces per layer', R + ', Idea', ['intra-layer model parallelism', 'tensor parallelism (TP)', 'so that no nonlinearity ever sees a partial sum']),
 ('MLP: Z = Dropout(GeLU(XA)B), A: H x 4H, B: 4H x H', R + ', Method: f and g', ['Z = Dropout(GeLU( XA ) B )', 'A : H × 4 H and B : 4 H × H']),
 ('Option 1: split A by rows, X by columns, XA = X1A1 + X2A2; GeLU nonlinear so all-reduce before GeLU', R + ', Idea (with the live split demo)', ['Split A by rows and X by columns', 'X 1 A 1 + X 2 A 2', 'before the GeLU', 'Rows, GeLU before the sum']),
 ('Option 2: split A by columns, [Y1,Y2] = [GeLU(XA1), GeLU(XA2)], no sync', R + ', Idea', ['Split A by columns', 'GeLU applies to each shard independently: no synchronisation']),
 ('Megatron: column-parallel first GEMM, row-parallel second, single all-reduce; general recipe column-split before nonlinearity, row-split after', R + ', Idea; Split tab animation', ['column-parallel', 'row-parallel', 'column-split the layer that feeds a nonlinearity, row-split the layer that follows it', 'with zero communication']),
 ('f: identity forward, all-reduce of gradients backward (block input; each GPU needs full X, input-gradient contributions summed)', R + ', Method: f and g table', ['all-reduce of the gradient', 'every GPU needs the full X , and each contributes part of the gradient with respect to X , which must be summed']),
 ('g: all-reduce forward, identity backward (block output, summing row-parallel partials)', R + ', Method: f and g table', ['sums the row-parallel partials']),
 ('Each is about four lines of PyTorch', R + ', Method: f and g (Code 1 reprinted)', ['class f(torch.autograd.Function)', 'Each is a few lines of PyTorch']),
 ('Exactly 4 all-reduces per layer: 2 forward (g), 2 backward (f), attention and MLP', R + ', Method; card; Split tab', ['4 all-reduces in total', '2 in the forward pass (one g per block) and 2 in the backward pass (one f per block)']),
 ('Self-attention embarrassingly parallel over heads; QKV column-split, subset of heads per GPU; softmax, weighted sum, attention dropout local', R + ', Method: self-attention', ['embarrassingly parallel over heads', 'full Q , K and V projections for a subset of heads', 'attention dropout and the weighted sum over V']),
 ('Output projection row-split consumes local head outputs, then g; same fused 2-GEMM pattern, single forward sync', R + ', Method: self-attention', ['The output projection is split by rows and consumes the local head outputs directly', 'the same fused pair of GEMMs, the same single forward synchronisation']),
 ('Input embedding E: H x v split along vocabulary; each GPU looks up its tokens; all-reduce merges', R + ', Method: embeddings and the loss', ['split along the vocabulary', 'each GPU looks up the tokens in its slice and an all-reduce']),
 ('Tied input/output embeddings, so the output GEMM is parallel too', R + ', Method: embeddings', ['because the input and output embeddings share weights, both are split']),
 ('Naive all-gather of logits communicates b x s x v (v ~ 50k); fused with cross-entropy, only b x s communicated', R + ', Method: embeddings, with the calculator', ['would communicate b × s × v elements', 'reduces what is communicated to b × s', '50,257']),
 ('LayerNorm, dropout, residual duplicated on every GPU rather than computed once and broadcast', R + ', Method: duplicate', ['every GPU keeps a duplicate copy of the LayerNorm parameters']),
 ('Each worker optimises its own shard; no optimizer-state communication needed', R + ', Method: duplicate', ['Each model-parallel worker optimises its own set of parameters', 'no updated parameter values are ever communicated']),
 ('Mixed precision with dynamic loss scaling', R + ', Setup (recipe)', ['Mixed precision with dynamic loss scaling']),
 ('Activation checkpointing after every layer', R + ', Setup (recipe)', ['activation checkpointing after every transformer layer']),
 ('Residual-branch weights scaled by 1/sqrt(2N)', R + ', Setup (recipe)', ['1/√(2 N )']),
 ('Vocabulary padded to multiple of 128 x TP degree', R + ', Method: embeddings', ['multiple of 128 × 8 = 1,024', '51,200']),
 ('TP orthogonal to DP and PP; 8-way TP within a DGX-2H (NVSwitch 300 GB/s) times 64-way DP', R + ', With data parallel (and the GPU-group picker)', ['orthogonal to data parallelism (and to pipeline parallelism)', '8 GPUs per model-parallel group times 64-way data parallelism is 512 GPUs', '300 GB/s']),
 ('Second contribution: BERT degrades past 336M with original post-LN; rearranging LN and residual makes 1.3B and 3.9B train stably with monotonic gains', R + ', Results: BERT (with the LN placement animation)', ['The often-forgotten second contribution', 'original post-LN BERT', 'Validation perplexity on a 3% held-out set falls monotonically']),
 ('"moving LN to the block inputs, an early pre-LN result"', R + ', Results: BERT, corrected: both arrangements already put LN at the block inputs; the change is where the residual is taken from (before the LN), and pre-LN was already in GPT-2', ['takes the residual from before the LayerNorm instead of after it', 'the pre-LN arrangement GPT-2 already used']),
 # results
 ('8.3B GPT-2 on 512 V100s, 8-way TP x 64-way DP', R + ', Results: scaling; card', ['8.3B', '512 V100']),
 ('15.1 PFLOP/s sustained, 76% weak-scaling efficiency', R + ', Results (76% or 74% box)', ['15.1 PFLOP/s', '76%', '75.6%']),
 ('Against a 1.2B single-GPU baseline at 39 TFLOP/s (30% of peak)', R + ', Results: scaling', ['39 TFLOP/s', '30% of the theoretical peak']),
 ('Pure 8-way model parallelism retains 77%', R + ', Results: scaling, with the predict question', ['keeps 77% of linear scaling']),
 ('WikiText103 perplexity 10.81 (prior SOTA 15.79)', R + ', Results: GPT-2 table; card; Tables tab', ['10.81', '15.79']),
 ('LAMBADA 66.51% (prior 63.24%)', R + ', Results: GPT-2 table', ['66.51%', '63.24%']),
 ('Bigger models converge faster and to lower perplexity throughout', R + ', Results: GPT-2', ['Larger models converge noticeably faster and to lower validation perplexity']),
 ('BERT 3.9B: RACE test 90.9% vs prior 89.4%', R + ', Results: BERT (made precise: 90.9 is the 5-way ensemble against ALBERT ensemble 89.4; single model 89.5 against 86.5)', ['90.9%', '89.4%', 'the 90.9% the abstract quotes is the ensemble']),
 ('Dev-set SOTA on MNLI, QQP, SQuAD 1.1/2.0 among BERT-style models', R + ', Results: BERT; Tables tab Table 5', ['best development-set results among BERT-style models on MNLI']),
 ('Without the rearrangement, models above 336M destabilise or underperform', R + ', Results: BERT', ['its loss jumps and does not recover']),
 ('Headline meaning: 5x larger than GPT-2 trainable at good efficiency with few primitives in vanilla PyTorch; scale translated into accuracy', R + ', Results: BERT (closing paragraph; "about 5.5 times", 8.3 / 1.5)', ['about 5.5 times GPT-2', 'the extra scale turned straight into accuracy']),
 # why it matters
 ('TP became a standard axis; DP/TP/PP/EP and the 3D framing trace TP to this paper', R + ', Why it matters', ['Tensor parallelism became a standard axis', '"3D parallelism" framing']),
 ('Column-then-row with conjugate f/g still canonical; standard at inference (tensor_parallel_size in vLLM, TensorRT-LLM, SGLang)', R + ', Why it matters (SGLang names it tp_size, checked in its server_args.py)', ['still the canonical formulation', 'tensor_parallel_size', 'tp_size']),
 ('Codebase outlived the paper: Megatron-Core, backbone of NVIDIA stack; Turing-NLG 17B (cited in v4), MT-NLG 530B, Nemotron, forks, Megatron-DeepSpeed', R + ', Why it matters', ['The codebase outlived the paper', 'Megatron-Core', 'Turing-NLG 17B', 'MT-NLG 530B', 'Nemotron', 'Megatron-DeepSpeed']),
 ('Narayanan et al. 2021 (arXiv 2104.04473, ~45 min): TP + PP + interleaved 1F1B (PTD-P), 502 PFLOP/s on 3072 A100s; the pair defines the playbook', R + ', Why it matters; Then and now; Further reading', ['https://arxiv.org/abs/2104.04473', 'interleaved 1F1B', 'PTD-P', '502 PFLOP/s on 3,072 A100s', 'classic pre-training scaling playbook']),
 ('Communication-cost mental model: TP all-reduces need fast interconnect, so TP capped at NVLink domain (8 per node), DP and PP cross nodes', R + ', Why it matters; Split tab (InfiniBand switch)', ['capped at the NVLink domain (8 GPUs per node) while DP and PP cross nodes']),
 ('Pre-LN observation anticipated the now-universal pre-norm transformer', R + ', Why it matters (corrected: GPT-2 already used pre-LN; this paper showed it lets BERT scale)', ['It was not the first pre-LN transformer']),
 # connections
 ('Attention Is All You Need: the layer being partitioned', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'the layer being partitioned']),
 ('BERT: the architecture whose LN placement it fixes', 'Connections; Further reading', ['3c65c17b0d0d81e5ad9bd09cbf18ad7c', 'the architecture whose LayerNorm placement this fixes']),
 ('ZeRO: contemporaneous memory-side alternative, shards optimizer state under DP', 'Connections; Further reading; Then and now', ['3c65c17b0d0d81879a7ed90bca007699', 'the contemporaneous memory-side alternative']),
 ('GPT-3: trained with model parallelism at this scale', 'Connections; Then and now', ['3c65c17b0d0d8193ac92c7648cfaca12', 'a mixture of model parallelism within each matrix multiply']),
 ('Llama 3: 4D parallelism, TP included', 'Connections; Then and now', ['3c65c17b0d0d81aca58ccb9d720b474e', '4D parallelism']),
 ('DeepSeek-V3: engineering around TP, dropping it for EP/PP/ZeRO-1', 'Connections; Then and now (made precise: it still serves attention with TP 4)', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'without using costly Tensor Parallelism']),
 ('Topics: llm-training-and-post-training (TP axis), inference-and-serving (default multi-GPU serving), hardware (NVLink/NVSwitch bandwidth)', 'Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81c08b3bc95ff45c7b13', '3c65c17b0d0d8118beeefaed56da6f8e']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Introduced tensor (intra-layer model) parallelism: column-split the GEMM feeding each nonlinearity']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
