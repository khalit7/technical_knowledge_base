"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Numbers filled in by script are checked
through the data they come from (recompute.json is embedded in the page).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, N = 'The paper tab', 'Step through a training step tab', "The paper's tables tab", 'Then and now tab'
C = [
 # header
 ('Reading time line "9 min read, +~3h 45m resources"', 'dropped: replaced by the build-computed reading time and resources total (3h 45m, the same)', ['min to read', '3h 45m of resources']),
 ('Authors: Rajbhandari, Rasley, Ruwase, He (Microsoft)', R + ', headline card', ['Samyam Rajbhandari', 'Jeff Rasley', 'Olatunji Ruwase', 'Yuxiong He', 'Microsoft']),
 ('Date: October 2019 (arXiv v1); v3 May 2020; published at SC20', R + ', headline card', ['October 2019 (arXiv v1); v3 May 2020; published at SC20']),
 ('Link arXiv 1910.02054 (~1h)', 'card and Further reading', ['https://arxiv.org/abs/1910.02054', '(1h)']),
 ('Link DeepSpeed repo (repo, ~20 min for the README and entry path)', 'card and Further reading', ['https://github.com/microsoft/deepspeed', 'about 20 minutes for the README and entry path']),
 ('Link Microsoft Research blog (~15 min)', 'Further reading, Best resources', ['https://www.microsoft.com/en-us/research/blog/zero-deepspeed-new-system-optimizations-enable-training-models-with-over-100-billion-parameters/', '(15 min)']),
 # resources
 ('HF Ultra-Scale Playbook, ZeRO section (~40 min): clearest modern walkthrough of stage-by-stage memory math and communication schedules, with diagrams', 'Further reading', ['https://huggingface.co/spaces/nanotron/ultrascale-playbook?section=zero_zero_redundancy_optimizer', 'clearest modern walkthrough of the stage-by-stage memory math and communication schedules', '(40 min)']),
 ('DeepSpeed ZeRO tutorial (docs, ~20 min): practitioner view, config flags for stages 1/2/3, offload, what each knob costs', 'Further reading; also cited in Reading and Then and now', ['https://www.deepspeed.ai/tutorials/zero/', 'config flags for stages 1, 2 and 3, offload, and what each knob costs']),
 ('Lilian Weng, How to Train Really Large Models on Many GPUs (~45 min): ZeRO in the DP/TP/PP/MoE landscape', 'Further reading', ['https://lilianweng.github.io/posts/2021-09-25-train-large/', 'data, tensor, pipeline and expert parallelism', '(45 min)']),
 ('PyTorch FSDP docs (docs, ~25 min for the core pages): PyTorch-native descendant of ZeRO-3; maps ZeRO stages onto FSDP sharding strategies', 'Further reading; mapping in Reading and Then and now', ['https://docs.pytorch.org/docs/stable/fsdp.html', 'maps ZeRO stages onto FSDP sharding strategies', '(25 min)']),
 # problem
 ('DP replicates the full model state on every GPU; DDP OOM beyond ~1.4B on 32GB V100s regardless of GPU count', R + ', Problem', ['replicates the full model state on every GPU', '1.4B parameters', 'however many GPUs you add']),
 ('Model parallelism (Megatron tensor parallelism) partitions memory but fine-grained compute and heavy per-layer communication; collapses past one NVLink node', R + ', Problem', ['slicing every layer across GPUs', 'works within one node but collapses beyond it']),
 ('40B model across two DGX-2 nodes ran at ~5 TFLOPS/GPU, under 5% of peak', R + ', Problem; Tables tab check', ['about 5 TFLOPS per V100, under 5% of peak', '40B model with Megatron-LM across two DGX-2 nodes']),
 ('Real culprit: optimizer states and gradients replicated, not the fp16 weights', R + ', Problem "The diagnosis"', ['Most of the memory is not the fp16 weights; it is the optimizer states and gradients']),
 # method: accounting
 ('Accounting: "Where did all the memory go?"', R + ', section title', ['Where did all the memory go?']),
 ('fp16 parameters 2Ψ, fp16 gradients 2Ψ, optimizer K Ψ with K = 12 (fp32 master 4Ψ + momentum 4Ψ + variance 4Ψ)', R + ', predict reveal and memory bar', ['fp16 parameters (2Ψ bytes', 'fp16 gradients (2Ψ)', '4Ψ + 4Ψ + 4Ψ', 'K = 12 for mixed-precision Adam']),
 ('Total (2 + 2 + K)Ψ = 16Ψ bytes', R + ', reveal and stage table', ['2Ψ + 2Ψ + K Ψ = 16Ψ', '(2 + 2 + K )Ψ = 16Ψ']),
 ('1.5B GPT-2: 3GB fp16 weights, at least 24GB model states, why it does not fit a 32GB GPU under DDP', R + ', predict question; Tables check', ['GPT-2\'s 1.5B parameters take 3 GB in fp16', '24 GB, 16 bytes for every parameter', 'cannot be trained on a single 32 GB GPU']),
 ('Everything else (activations, temporary buffers, fragmentation) is residual states', R + ', accounting and Residual states list', ['residual states (activations, temporary buffers and fragmented memory)']),
 # ZeRO-DP
 ('ZeRO-DP keeps DP execution model (different mini-batch shard, full layers locally) but partitions model states across N_d ranks, materialising each piece only when needed', R + ', The idea', ['ZeRO-DP keeps DP\'s execution model', 'but partitions the model states', 'bring each piece to where it is needed, when it is needed']),
 ('Stage table: Baseline 16Ψ / ZeRO-1 2Ψ+2Ψ+KΨ/N_d, 4Ψ (4x) / ZeRO-2 2Ψ+(2+K)Ψ/N_d, 2Ψ (8x) / ZeRO-3 16Ψ/N_d linear; comm 2Ψ, 2Ψ, 2Ψ, 3Ψ (1.5x)', R + ', stage table; Step tab scale table', ['2Ψ + 2Ψ + K Ψ/ N d', '4Ψ (4× less)', '2Ψ (8× less)', '16Ψ/ N d', 'falls linearly with N d', '3Ψ, 1.5×']),
 ('7.5B, N_d = 64, K = 12: 120GB baseline, 31.4 ZeRO-1, 16.6 ZeRO-2, 1.9 ZeRO-3', R + ' Figure 1 live (defaults reproduce); Step tab; Tables calculator and check', ['Defaults reproduce Figure 1', '120, 31.4, 16.6 and 1.9 GB']),
 ('ZeRO-1: each rank stores and updates 1/N_d of optimizer states and fp32 master params; all-gather at end of step', R + ', P_os bullet; Step tab ZeRO-1 captions', ['updates only 1/ N d of the fp32 master parameters', 'an all-gather at the end of the step gives every process the full updated parameters']),
 ('Ring all-reduce = reduce-scatter + all-gather (Ψ + Ψ = 2Ψ per rank); ZeRO-1 volume unchanged', R + ', Communication', ['reduce-scatter', 'followed by an all-gather', 'plain DP already moves 2Ψ per step', 'alone is the same']),
 ('ZeRO-2: gradients reduce-scattered, each rank keeps only its slice, bucketised to overlap with backward; rest freed; still 2Ψ', R + ', P_g bullet; Communication; Step tab', ['reduced only onto their owner and then freed: a reduce-scatter', 'bucketed', 'overlap communication with the backward pass', '2Ψ, exactly DP\'s volume']),
 ('ZeRO-3: parameters sharded, owner broadcasts each layer just before forward and again in backward, discarded after; extra all-gather Ψ, 3Ψ total, 1.5x, memory 1/N_d, arbitrary model size fits', R + ', P_p bullet; Communication predict; Step tab', ['receives the others by broadcast from their owners just before forward and backward need them', '3Ψ, 1.5× DP', 'a model of any size fits']),
 # ZeRO-R
 ('P_a partitions activation checkpoints across MP ranks (MP replicates activations), all-gather on demand', R + ', ZeRO-R', ['Model parallelism replicates activations', 'all-gathers it back when backward needs it']),
 ('P_a example: 33GB to 2GB per GPU for a 100B model at MP = 16', R + ' ZeRO-R and Tables tab box (does not reproduce at fp16: 67.1 to 4.2 GB; matches only at 1 byte per value)', ['about 33 GB per GPU', 'about 2 GB', '1 byte per value']),
 ('P_a+cpu offloads checkpoints to CPU for near-zero activation footprint', R + ', ZeRO-R', ['offloads the partitioned checkpoints to CPU memory, for near-zero activation memory']),
 ('C_B constant-size fused communication buffers instead of model-size buffers', R + ', ZeRO-R', ['constant-size buffers', 'buffer of constant size once the model is large']),
 ('M_D defragments by pre-allocating contiguous buffers for long-lived tensors (checkpoints, parameter gradients); OOMs with 30%+ memory still free', R + ', ZeRO-R and Residual states', ['pre-allocates contiguous buffers for checkpoints and gradients', 'over 30% of memory still free']),
 ('ZeRO composes with MP: max memory reduction N_d x N_m; 1T on 1024 GPUs with 16-way MP within nodes and 64-way ZeRO-DP across nodes', R + ', With MP; Tables calculator', ['N d × N m', '16-way MP inside each DGX-2 node and 64-way ZeRO-DP across nodes']),
 # results
 ('ZeRO-100B = ZeRO-2 + ZeRO-R, PyTorch, model wrapping only, no model code changes', R + ', Results', ['ZeRO-100B', 'stages 1 and 2) plus all of ZeRO-R, in PyTorch', 'with no model changes']),
 ('Up to 170B parameters on 400 V100s, 8x larger than Megatron-LM alone could handle efficiently', R + ', Results (with the 8x against 20B, 4.25x against 40B)', ['170B', '400 GPUs', 'over 8×']),
 ('15 PFLOPS aggregate (~38 TFLOPS/GPU, over 30% of peak) on 100B-scale models; up to 10x throughput over Megatron, which drops below 5 TFLOPS/GPU once MP crosses nodes', R + ', Results; Tables check', ['15 PFLOPS', 'over 38 TFLOPS per GPU, over 30% of peak', 'up to 10×', 'drops below 5 TFLOPS per GPU']),
 ('Super-linear scaling 64 to 400 GPUs: freed memory buys larger per-GPU batches, raising arithmetic intensity', R + ', Results and predict reveal with recomputed memory', ['Super-linear scaling', 'doubling the GPUs more than doubles throughput', 'raises arithmetic intensity']),
 ('Usability: up to 13B with no MP (vs 1.4B for DDP), 40+ TFLOPS/GPU on 128 GPUs', R + ', Results', ['up to 13B parameters with no MP or PP at all, on 128 GPUs, at over 40 TFLOPS per GPU']),
 ('Turing-NLG 17B, largest LM at the time, SOTA "Webtext-103" perplexity 10.21, 41.4 TFLOPS/GPU', R + ', Results (benchmark name corrected to WikiText-103 from the Turing-NLG announcement)', ['Turing-NLG', '10.21', '41.4 TFLOPS per GPU', 'WikiText-103']),
 ('Memory analysis validated: measured max sizes under ZeRO-1 match theoretical bounds (Table 2)', R + ' Results and Tables tab (measured is 81 to 82% of the bound)', ['The memory analysis holds', 'of the bound at every MP degree']),
 # why it matters
 ('Launched DeepSpeed, defined the vocabulary ZeRO-1/2/3, stage 3', R + ', Why it matters', ['launched DeepSpeed', '"ZeRO-1, 2, 3" and "stage 3"']),
 ('Core insight: DP memory redundancy eliminated without giving up DP communication efficiency or model surgery; default way to train large models without or alongside TP', R + ', Why it matters', ['memory redundancy can be removed without giving up its communication efficiency or touching model code', 'alone or alongside tensor parallelism']),
 ('BLOOM, Turing-NLG, MT-NLG 530B and countless fine-tuning runs sit on it', R + ' and Then and now (corrected: BLOOM ZeRO stage 1; MT-NLG\'s report names 3D parallelism with DeepSpeed and Megatron but states no ZeRO stage, and counts 20 bytes per parameter)', ['BLOOM used ZeRO stage 1', 'MT-NLG 530B', 'its stage is not stated']),
 ('FSDP (and FSDP2 with DTensor sharding) is the direct native descendant of ZeRO-3; SHARD_GRAD_OP ~ ZeRO-2, FULL_SHARD ~ ZeRO-3', R + ' and Then and now, with the docs quoted', ['FULL_SHARD is ZeRO-3', 'SHARD_GRAD_OP shards gradients and optimizer states while keeping parameters gathered', 'shards parameters as DTensors']),
 ('ZeRO-Offload (2021): optimizer states and update to CPU', R + ' and Then and now', ['ZeRO-Offload', 'optimizer states and the update step on CPU']),
 ('ZeRO-Infinity (2021): NVMe offload, trillion-parameter fine-tuning on modest clusters', R + ' and Then and now (made precise: one DGX-2 node; 32T parameters on 512 GPUs)', ['ZeRO-Infinity', 'fine-tune trillion parameter models on a single NVIDIA DGX-2 node', '32 trillion parameters on 512 V100s']),
 ('ZeRO++ (2023): quantised weights/gradients and hierarchical partitioning cut stage-3 communication', R + ' and Then and now', ['ZeRO++', 'quantised weight all-gather', 'hierarchical weight partition', 'reduces communication volume of ZeRO by 4x']),
 ('16-bytes-per-parameter accounting remains the standard back-of-envelope', R + ', Why it matters; Then and now', ['16 bytes per parameter is still the back-of-envelope every practitioner uses to size a training run']),
 # connections
 ('Megatron-LM: baseline ZeRO measures against and composes with; P_a partitions its replicated activations', R + ', Connections; Further reading', ['the tensor-parallel baseline ZeRO measures against and composes with', 'https://app.notion.com/p/3c65c17b0d0d8133ae92fbe90a1f308e']),
 ('GPT-3: the scale regime (175B) this line made trainable', R + ', Connections', ['the scale regime (175B) this systems line made trainable', 'https://app.notion.com/p/3c65c17b0d0d8193ac92c7648cfaca12']),
 ('FlashAttention: complementary attack on activation memory at kernel level', R + ', Connections', ['at the kernel level rather than the sharding level', 'https://app.notion.com/p/3c65c17b0d0d81e4a3e8e7a2c4771381']),
 ('Switch Transformer: MoE route to parameter scale, orthogonal to state sharding', R + ', Connections', ['orthogonal to state sharding', 'https://app.notion.com/p/3c65c17b0d0d81a8b541c9babbf40c94']),
 ('Topics: llm-training-and-post-training (ZeRO, FSDP, distributed training), pytorch-ecosystem (FSDP2, DeepSpeed integration)', R + ', Connections; Further reading', ['Topic: llm-training-and-post-training', '(ZeRO, FSDP, distributed training)', 'Topic: pytorch-ecosystem', 'FSDP2, DeepSpeed integration']),
 ('Database properties (Paper, Takeaway, Topics, Year) stay in Notion; Takeaway on the card', 'headline card; Further reading footnote', ['ZeRO shards optimizer states, gradients, and parameters across data-parallel ranks', 'its properties (Paper, Takeaway, Topics, Year) live there']),
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
