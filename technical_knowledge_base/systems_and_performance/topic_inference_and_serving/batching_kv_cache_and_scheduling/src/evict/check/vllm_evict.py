"""vLLM v0.31.0's real KVCacheManager (commit db9527a46873454610df6dbedf79a36d6bf1a7f6, Python only, no model) replays
Mooncake trace requests with prefix caching on and a block size of 512 tokens (the trace's hash block size): for each
request, get_computed_blocks (the prefix-cache lookup), allocate_slots for the rest of the prompt, then free (as if it
finished). Prompt token ids are synthesised from the trace's hash ids, so equal hash ids give equal blocks and vLLM's
own chained sha256 block hashes decide the hits. Compared with evict.replay_vllm_exact (this page's re-implementation
of vLLM's rules) and evict.replay(..., 'lru') (the lab's LRU, which also caches partial last blocks).
usage: VLLM_TARGET_DEVICE=cpu PYTHONPATH=<vllm src> VLLM_MODEL_DIR=<folder with a config.json> python vllm_evict.py <trace.jsonl> <n> <caps...>"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import evict
import torch
from vllm.config import CacheConfig, ModelConfig, SchedulerConfig, VllmConfig
from vllm.sampling_params import SamplingParams
from vllm.utils.hashing import sha256
from vllm.v1.core.kv_cache_utils import get_request_block_hasher, init_none_hash
from vllm.v1.core.sched.scheduler import Scheduler
from vllm.v1.core.single_type_kv_cache_manager import register_all_kvcache_specs
from vllm.v1.kv_cache_interface import FullAttentionSpec, KVCacheConfig, KVCacheGroupSpec
from vllm.v1.request import Request
from vllm.v1.structured_output import StructuredOutputManager

BS = 512
init_none_hash(sha256)


def make_mgr(nblocks, max_len):
    mc = ModelConfig(model=os.environ['VLLM_MODEL_DIR'], dtype='float16', seed=42, skip_tokenizer_init=True, max_model_len=max_len)
    sc = SchedulerConfig(max_num_seqs=16, max_num_batched_tokens=max_len, max_model_len=max_len, enable_chunked_prefill=True,
                         is_encoder_decoder=False, watermark=0.0, policy='fcfs')
    cc = CacheConfig(block_size=BS, gpu_memory_utilization=0.9, cache_dtype='auto', enable_prefix_caching=True)
    vc = VllmConfig(scheduler_config=sc, model_config=mc, cache_config=cc)
    spec = FullAttentionSpec(block_size=BS, num_kv_heads=1, head_size=1, dtype=torch.float32)
    kcc = KVCacheConfig(num_blocks=nblocks + 1, kv_cache_tensors=[], kv_cache_groups=[KVCacheGroupSpec(['layer'], spec)])
    cc.num_gpu_blocks = nblocks + 1
    register_all_kvcache_specs(vc)
    s = Scheduler(vllm_config=vc, kv_cache_config=kcc, block_size=BS, log_stats=False,
                  structured_output_manager=StructuredOutputManager(vc))
    return s.kv_cache_manager


def toks(r):
    out = []
    for j, h in enumerate(r['hash_ids']):
        n = min(BS, r['input_length'] - j * BS)
        base = (h * 2654435761) % 1000003
        out.extend(100 + (base * 31 + i * 7919) % 150000 for i in range(n))
    return out


def run(reqs, cap):
    max_len = max(r['input_length'] for r in reqs) + 16
    mgr = make_mgr(cap, max_len)
    hasher = get_request_block_hasher(BS, sha256)
    hit = 0
    skipped = 0
    for k, r in enumerate(reqs):
        sp = SamplingParams(max_tokens=1)
        sp.update_from_generation_config({}, 50256)
        rq = Request(request_id=str(k), prompt_token_ids=toks(r), sampling_params=sp, pooling_params=None, block_hasher=hasher)
        blocks, ncomp, _ = mgr.get_computed_blocks(rq)
        got = mgr.allocate_slots(rq, r['input_length'] - ncomp, ncomp, blocks)
        if got is None:
            skipped += 1
            continue
        hit += ncomp // BS
        mgr.free(rq)
    return hit, skipped


if __name__ == '__main__':
    reqs = evict.load(sys.argv[1])[:int(sys.argv[2])]
    total = sum(len(r['hash_ids']) for r in reqs)
    res = []
    for cap in [int(x) for x in sys.argv[3:]]:
        hv, sk = run(reqs, cap)
        he = evict.replay_vllm_exact(reqs, cap)
        lab = evict.replay(reqs, 'lru', cap)['hit_blocks']
        res.append({'cap': cap, 'vllm_hit_blocks': hv, 'exact_hit_blocks': he, 'lab_lru_hit_blocks': lab, 'blocks': total,
                    'skipped_vllm': sk, 'identical': hv == he})
        print(json.dumps(res[-1]), file=sys.stderr, flush=True)
    print(json.dumps({'trace': os.path.basename(sys.argv[1]), 'n': len(reqs), 'vllm_commit': 'db9527a46873454610df6dbedf79a36d6bf1a7f6', 'rows': res}, indent=1))
