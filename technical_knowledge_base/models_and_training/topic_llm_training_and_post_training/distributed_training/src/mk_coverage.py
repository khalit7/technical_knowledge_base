#!/usr/bin/env python3
"""Write coverage.json: every fact in live.md with where index.html carries it (a phrase that must appear), or why dropped. Run from src/."""
import json, re, html
s = open('../index.html').read()
t = html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)))
t = re.sub(r'\s+', ' ', t)
C = [
 # (fact from live.md, where, phrase that must be in the page text)
 ("Best resource: Ultra-Scale Playbook, ~8h, DP to EP and combining, 4000+ runs", "Further reading, Best resources", "about 8h"),
 ("Playbook 4000+ benchmark runs (now: over 4,100 on up to 512 GPUs)", "Reading, Composing; Further reading", "4,100"),
 ("Best resource: PyTorch FSDP2 docs ~30 min", "Further reading", "PyTorch FSDP2 docs"),
 ("Best resource: torchtitan paper 45 min", "Further reading", "TorchTitan paper"),
 ("Best resource: framework survey FSDP2 vs Megatron-Core vs DeepSpeed vs torchtitan ~25 min, 2026", "Further reading; Reading, ZeRO and Frameworks", "Framework survey"),
 ("Papers: ZeRO, Megatron-LM, Switch Transformers", "Further reading, Paper pages; inline", "Switch Transformers (2021)"),
 ("Resource time total +9h 40m", "Header", "+9h 40m resources"),
 ("DP: replicate model, each replica different micro-batch, all-reduce averages gradients before optimizer", "Reading, Data parallelism", "averages the gradients"),
 ("DP step 1: copy model to X GPUs", "Reading, Data parallelism", "copy the model to each of the"),
 ("DP step 2: shard the batch", "Reading, Data parallelism", "shard the batch"),
 ("DP steps 3-4: parallel forward, parallel backward", "Reading, Data parallelism", "backward in parallel"),
 ("DP step 5: all-reduce gradients, overlapped with backward, bucketed", "Reading, Data parallelism (25 MiB buckets, sourced)", "25 MiB"),
 ("DP step 6: identical optimizer step everywhere", "Reading, Data parallelism", "the same optimizer step everywhere"),
 ("Old DataParallel single-process single-node", "Reading, Data parallelism", "DataParallel"),
 ("DDP one process per GPU, multi-node, the baseline", "Reading, Data parallelism", "one process per GPU"),
 ("DDP pros: simple, near linear scaling", "Reading, Data parallelism", "scales nearly linearly"),
 ("DDP cons: full model + grads + optimizer on every GPU; the ceiling ZeRO/FSDP remove", "Reading, Data parallelism; animation DP step 1", "That ceiling is what ZeRO and FSDP remove"),
 ("16 bytes per parameter: 2 bf16 weights + 2 bf16 grads + 12 fp32 master, momentum, variance, before activations", "Reading, In one screen", "16 bytes per parameter"),
 ("ZeRO shards these across the DP group instead of replicating", "Reading, ZeRO and FSDP", "shards them across the data-parallel group"),
 ("ZeRO-1 shards optimizer states", "Reading, ZeRO and FSDP; table; animation", "ZeRO-1 shards the optimizer state"),
 ("ZeRO-2 + shards gradients", "Reading, ZeRO and FSDP", "ZeRO-2 also shards the gradients"),
 ("ZeRO-3 + shards parameters; all-gather each layer just in time in forward/backward, then free", "Reading, ZeRO and FSDP; animation ZeRO-3", "all-gathered just in time"),
 ("ZeRO-3 communication ~1.5x DDP", "Reading, ZeRO; table; animation counters", "1.5 times"),
 ("ZeRO-3 memory scales as 1/N", "Reading, ZeRO and FSDP", "falls as 1/"),
 ("ZeRO-Offload / ZeRO-Infinity push shards to CPU RAM / NVMe", "Reading, ZeRO and FSDP", "ZeRO-Infinity adds NVMe"),
 ("FSDP is the PyTorch-native equivalent of ZeRO-3 (refined: default full sharding = ZeRO-3, also a ZeRO-2-like mode)", "Reading, ZeRO and FSDP", "its default full sharding is ZeRO-3"),
 ("FSDP2 fully_shard replaced FlatParameter with per-parameter DTensor dim-0 sharding", "Reading, ZeRO and FSDP (quoted from the torchtitan paper)", "FlatParameter"),
 ("FSDP2: composability with TP/PP/EP via device meshes", "Reading, ZeRO and FSDP", "composes with TP, PP and EP on a device mesh"),
 ("FSDP2: sane state_dict handling through DCP", "Reading, ZeRO and FSDP", "Distributed Checkpoint (DCP)"),
 ("FSDP2: partial freezing works (LoRA-friendly)", "Reading, ZeRO and FSDP", "partial freezing works"),
 ("FSDP2: ~7% lower memory, slightly better throughput than FSDP1", "Reading, ZeRO and FSDP (7% and 1.5%, reported)", "7% lower GPU memory"),
 ("2026 default: FSDP2 over DeepSpeed on PyTorch unless NVMe offload; math identical, composition cleaner", "Reading, ZeRO and FSDP", "The arithmetic is the same; the composition is cleaner"),
 ("HSDP: 2D mesh, FSDP-shard within a node, DDP-replicate across groups", "Reading, ZeRO and FSDP; animation HSDP", "replica groups on one dimension"),
 ("HSDP keeps all-gather on NVLink, only gradient all-reduce crosses nodes", "Reading, ZeRO and FSDP; animation HSDP (8.0 against 36.1 GB)", "only the gradient all-reduce crosses servers"),
 ("HSDP bounds the blast radius of a failing node", "Reading, ZeRO and FSDP (torchft cited)", "blast radius"),
 ("HSDP when the model fits in one node's aggregate memory", "Reading, ZeRO and FSDP", "fits in one server's (or group's) aggregate memory"),
 ("PP splits the model vertically into stages of consecutive layers, one stage per GPU or group", "Reading, Pipeline", "stages"),
 ("Naive PP idles GPUs: the bubble", "Reading, Pipeline", "the bubble"),
 ("Micro-batching plus a schedule hides most of it: GPipe, 1F1B, interleaved 1F1B, ZB-H1, DualPipe", "Reading, Pipeline (each schedule; bubble table)", "Interleaved 1F1B"),
 ("Bubble fraction ~ (stages-1)/microbatches", "Reading, Pipeline; bubble table; animation PP", "Bubble time fraction"),
 ("PP cheap on bandwidth, only activations cross stage boundaries; preferred cross-node split", "Reading, Pipeline", "preferred way to split a model across servers"),
 ("TP splits weight matrices horizontally (Megatron-LM)", "Reading, Tensor parallelism", "horizontally"),
 ("TP column-parallel then row-parallel pairs in MLP and attention heads", "Reading, Tensor; animation TP", "column-parallel"),
 ("TP all-reduces inside every layer", "Reading, Tensor; animation TP", "inside every layer"),
 ("TP needs NVLink-class bandwidth; keep within a node; TP <= 8 typically", "Reading, Tensor; table", "NVLink-class bandwidth"),
 ("Sequence parallelism (Megatron-style) shards LayerNorm/dropout activations along sequence, removing duplicated activation memory", "Reading, Tensor parallelism and sequence parallelism", "duplicated activation memory disappears"),
 ("EP: distribute MoE experts across GPUs; tokens routed via all-to-all", "Reading, Expert parallelism; animation EP", "all-to-all dispatch"),
 ("EP: attention/dense parts replicated or sharded by other means", "Reading, Expert parallelism", "stay replicated (data parallel) or are split another way"),
 ("EP origin: Switch Transformers (corrected: GShard 2020 first; Switch simplified routing and studied the combinations)", "Reading, Expert parallelism, Lineage", "GShard"),
 ("EP modern practice: DeepSeek-V3, fine-grained experts, node-limited routing to cap all-to-all cost", "Reading, Expert parallelism", "at most 4 nodes"),
 ("EP modern practice: Qwen3-MoE", "Reading, Expert parallelism (config sourced; pretraining layout unconfirmed)", "Qwen3-235B-A22B"),
 ("CP shards the sequence dimension of activations for long-context training; attention memory grows with sequence length", "Reading, Context parallelism", "sequence dimension"),
 ("CP family: Ring Attention, KV blocks around a ring, overlapping compute and comms", "Reading, Context parallelism", "Ring Attention"),
 ("CP family: DeepSpeed Ulysses, all-to-all so each GPU holds full sequence for a subset of heads", "Reading, Context parallelism", "full sequence for a subset of heads"),
 ("Llama 3 used CP for its 128k-context phase", "Reading, Context; Composing table; calculator preset", "CP = 16 for its 128K-context phase"),
 ("torchtitan ships both (corrected: Ring Attention with all-gather rotation; Ulysses is DeepSpeed's)", "Reading, Context parallelism correction box", "Ulysses is DeepSpeed's"),
 ("Composing: DP (FSDP/HSDP) x PP x CP x TP(+SP), outermost to innermost, EP orthogonal", "Reading, Composing", "DP (FSDP or HSDP) × PP × CP × TP (+SP)"),
 ("Rule: fit the model first: FSDP alone up to tens of B; add TP when a layer no longer fits or FSDP comms dominate; PP across nodes for 100B+ (corrected to the Playbook's own thresholds)", "Reading, Composing rules and correction box", "Under 10B parameters one technique is enough"),
 ("Rule: add CP only for long sequences; EP for MoE", "Reading, Composing", "Add CP across nodes for very long sequences"),
 ("Rule: keep TP and EP dispatch inside NVLink domains; PP and DP gradient sync across InfiniBand", "Reading, Composing", "Keep the bandwidth-hungry axes"),
 ("Rule: then scale batch via DP and gradient accumulation to hit the target global batch", "Reading, Composing; Data parallelism", "Then reach the target global batch"),
 ("Activation checkpointing trades ~30% compute (corrected: full 30-40%, selective about 2.7%)", "Reading, Activation checkpointing and correction box", "30 to 40%"),
 ("Selective checkpointing (attention only) is the usual sweet spot with FlashAttention", "Reading, Activation checkpointing", "pairs naturally with it"),
 ("torchtitan: PyTorch-native pretraining reference; FSDP2 + TP + PP + CP", "Reading, Frameworks", "PyTorch's native reference for pretraining"),
 ("torchtitan: torch.compile, fp8 (now MXFP8 and NVFP4), DCP checkpointing, torchft fault tolerance", "Reading, Frameworks", "torchft fault tolerance"),
 ("Megatron-Core / NeMo: NVIDIA's production stack; most mature TP/PP kernels", "Reading, Frameworks", "most mature TP and PP kernels"),
 ("DeepSpeed: still relevant for ZeRO-Offload/Infinity and HF Trainer integration", "Reading, Frameworks", "Hugging Face Trainer integration"),
 ("nanotron: HF's lightweight pretraining lib, Playbook companion", "Reading, Frameworks", "lightweight pretraining library"),
 ("FSDP2 + HSDP covers most fine-tuning and sub-70B pretraining; full 4D only at frontier scale", "Reading, Frameworks", "full 4D parallelism is needed only at frontier scale"),
 ("Mention: FlashAttention page", "Reading, Activation checkpointing; Further reading", "FlashAttention (2022)"),
]
out = []
miss = 0
for fact, where, phrase in C:
    ok = phrase in t
    miss += not ok
    out.append({'fact': fact, 'where': where, 'phrase': phrase, 'found': ok})
links = re.findall(r'\]\((https?://[^)]+)\)', open('live.md').read()) + re.findall(r'url="(https://app.notion.com/p/[0-9a-f]+)"', open('live.md').read())
lk = []
for u in sorted(set(links)):
    key = u.replace('https://app.notion.com/p/', '')
    ok = key in s or u in s
    miss += not ok
    lk.append({'link': u, 'found': ok})
json.dump({'source': 'live.md', 'facts': out, 'links': lk, 'dropped': [], 'missing': miss}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(len(out), 'facts,', len(lk), 'links,', miss, 'missing')
for o in out:
    if not o['found']: print('MISSING', o['phrase'])
for o in lk:
    if not o['found']: print('MISSING LINK', o['link'])
