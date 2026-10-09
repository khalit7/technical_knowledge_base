"""Replay a trace through vLLM's own v1 Scheduler and KVCacheManager (v0.31.0, commit db9527a4), one request
at a time (max_num_seqs 1), with automatic prefix caching on and a pool of C/16 blocks of 16 tokens.
The fake model runner returns the trace's next token, as in the root's check/vllm_harness.py.
Needs vLLM's source tree on PYTHONPATH, VLLM_TARGET_DEVICE=cpu, VLLM_MODEL_DIR (a folder with a config.json).
Usage: real_vllm.py <trace> <capacity tokens> ; prints JSON with per-request cached tokens (prompt minus the tokens scheduled in its first step).
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces  # noqa: E402
import torch  # noqa: E402
from vllm.config import CacheConfig, ModelConfig, SchedulerConfig, VllmConfig  # noqa: E402
from vllm.sampling_params import SamplingParams  # noqa: E402
from vllm.utils.hashing import sha256  # noqa: E402
from vllm.v1.core.kv_cache_utils import get_request_block_hasher, init_none_hash  # noqa: E402
from vllm.v1.core.sched.scheduler import Scheduler  # noqa: E402
from vllm.v1.core.single_type_kv_cache_manager import register_all_kvcache_specs  # noqa: E402
from vllm.v1.kv_cache_interface import FullAttentionSpec, KVCacheConfig, KVCacheGroupSpec  # noqa: E402
from vllm.v1.outputs import ModelRunnerOutput  # noqa: E402
from vllm.v1.request import Request  # noqa: E402
from vllm.v1.structured_output import StructuredOutputManager  # noqa: E402

init_none_hash(sha256)
BS = 16


def run(name, cap):
    reqs = traces.get(name)
    max_len = max(q['P'] + q['O'] for q in reqs) + 64
    nblocks = cap // BS
    mc = ModelConfig(model=os.environ['VLLM_MODEL_DIR'], dtype='float16', seed=42, skip_tokenizer_init=True, max_model_len=max_len)
    sc = SchedulerConfig(max_num_seqs=1, max_num_batched_tokens=max_len, max_model_len=max_len,
                         enable_chunked_prefill=False, is_encoder_decoder=False, watermark=0.0, policy='fcfs')
    cc = CacheConfig(block_size=BS, gpu_memory_utilization=0.9, cache_dtype='auto', enable_prefix_caching=True)
    vc = VllmConfig(scheduler_config=sc, model_config=mc, cache_config=cc)
    spec = FullAttentionSpec(block_size=BS, num_kv_heads=1, head_size=1, dtype=torch.float32)
    kcc = KVCacheConfig(num_blocks=nblocks + 1, kv_cache_tensors=[], kv_cache_groups=[KVCacheGroupSpec(['layer'], spec)])
    cc.num_gpu_blocks = nblocks + 1   # block 0 is vLLM's null block
    register_all_kvcache_specs(vc)
    s = Scheduler(vllm_config=vc, kv_cache_config=kcc, block_size=BS, log_stats=True,
                  structured_output_manager=StructuredOutputManager(vc))
    hasher = get_request_block_hasher(BS, sha256)
    out = []
    for q in reqs:
        sp = SamplingParams(ignore_eos=True, max_tokens=q['O'])
        sp.update_from_generation_config({}, 50256)
        r = Request(request_id=str(q['id']), prompt_token_ids=traces.tokens(q), sampling_params=sp,
                    pooling_params=None, block_hasher=hasher)
        s.add_request(r)
        cached = None
        while True:
            so = s.schedule()
            if cached is None and so.num_scheduled_tokens:
                # first step: the prompt minus what was scheduled is what the prefix cache supplied
                cached = q['P'] - so.num_scheduled_tokens[r.request_id]
            ids = list(so.num_scheduled_tokens.keys())
            sampled = [[traces.tok(q, r.num_tokens)] if r.num_computed_tokens >= r.num_tokens else [] for _ in ids]
            mro = ModelRunnerOutput(req_ids=ids, req_id_to_index={k: i for i, k in enumerate(ids)},
                                    sampled_token_ids=sampled, logprobs=None, prompt_logprobs_dict={}, pooler_output=[])
            outs = s.update_from_output(so, mro)
            if any(o.finish_reason is not None for eo in outs.values() for o in eo.outputs):
                break
        out.append([q['id'], cached])
    return {'trace': name, 'cap': cap, 'block': BS, 'reqs': out}


if __name__ == '__main__':
    print(json.dumps(run(sys.argv[1], int(sys.argv[2]))))
