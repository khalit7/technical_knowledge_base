"""Adapted from the root page's src/sim/check/vllm_harness.py: run the real vLLM v1 Scheduler and KVCacheManager
(vLLM v0.31.0, commit db9527a46873454610df6dbedf79a36d6bf1a7f6) with policy="priority" on two-client traces whose
clients have different priorities, with a fake model runner that returns one token per finished prefill or decode,
and compare every step with bksched.py's 'priority' policy (and, as a control, 'fcfs' with vLLM's "fcfs").

Needs: a Python with torch and vLLM's requirements, vLLM's source tree on
PYTHONPATH (no compiled kernels are used: only the scheduler runs), and
VLLM_MODEL_DIR pointing at a local folder with a config.json (we use Qwen3-0.6B's;
only its config is read). Run: python vllm_harness.py [cases.json] > out/vllm_check.json
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import bksched as sim

import torch
from vllm.config import CacheConfig, ModelConfig, SchedulerConfig, VllmConfig
from vllm.sampling_params import SamplingParams
from vllm.utils.hashing import sha256
from vllm.v1.core.kv_cache_utils import get_request_block_hasher, init_none_hash
from vllm.v1.core.sched.scheduler import Scheduler
from vllm.v1.core.single_type_kv_cache_manager import register_all_kvcache_specs
from vllm.v1.kv_cache_interface import FullAttentionSpec, KVCacheConfig, KVCacheGroupSpec
from vllm.v1.outputs import ModelRunnerOutput
from vllm.v1.request import Request
from vllm.v1.structured_output import StructuredOutputManager

MODEL_DIR = os.environ['VLLM_MODEL_DIR']
init_none_hash(sha256)


def make_sched(c, max_len):
    mc = ModelConfig(model=MODEL_DIR, dtype='float16', seed=42, skip_tokenizer_init=True, max_model_len=max_len)
    sc = SchedulerConfig(max_num_seqs=c['maxseq'], max_num_batched_tokens=c['budget'], max_model_len=max_len,
                         enable_chunked_prefill=c['chunk'], is_encoder_decoder=False, watermark=0.0, policy=c.get('policy', 'fcfs'))
    cc = CacheConfig(block_size=c['bs'], gpu_memory_utilization=0.9, cache_dtype='auto', enable_prefix_caching=c['pc'])
    vc = VllmConfig(scheduler_config=sc, model_config=mc, cache_config=cc)
    spec = FullAttentionSpec(block_size=c['bs'], num_kv_heads=1, head_size=1, dtype=torch.float32)
    # vLLM reserves block 0 as the null block, so the simulator's n blocks are n + 1 here
    kcc = KVCacheConfig(num_blocks=c['nblocks'] + 1, kv_cache_tensors=[], kv_cache_groups=[KVCacheGroupSpec(['layer'], spec)])
    cc.num_gpu_blocks = c['nblocks'] + 1
    register_all_kvcache_specs(vc)
    return Scheduler(vllm_config=vc, kv_cache_config=kcc, block_size=c['bs'], log_stats=True,
                     structured_output_manager=StructuredOutputManager(vc))


def tok(q, pos):
    """Token id at position pos: from the shared system prompt or the conversation."""
    sid = (1 + q['g']) if (q['g'] >= 0 and pos < q['S']) else 1000 + q['conv']
    return 100 + (sid * 2654435761 + pos * 40503 + (sid * pos) % 9973) % 150000


def run_vllm(cfg):
    c = cfg['c']
    reqs = sim.make_clients(cfg['w']) if cfg['w'].get('clients') else sim.make_workload(cfg['w'])
    max_len = max(q['P'] + q['O'] for q in reqs) + 64
    max_len = max(max_len, c['budget']) if not c['chunk'] else max_len
    s = make_sched(c, max_len)
    hasher = get_request_block_hasher(c['bs'], sha256)
    by = {}
    pending = list(reqs)
    t = 0.0
    steps = []
    done = 0
    while done < len(reqs):
        if s.get_num_unfinished_requests() == 0 and pending:
            t = max(t, pending[0]['arr'])
        while pending and pending[0]['arr'] <= t:
            q = pending.pop(0)
            sp = SamplingParams(ignore_eos=True, max_tokens=q['O'])
            sp.update_from_generation_config({}, 50256)
            r = Request(request_id=str(q['id']), prompt_token_ids=[tok(q, i) for i in range(q['P'])],
                        sampling_params=sp, pooling_params=None, block_hasher=hasher, priority=q.get('pr', 0), arrival_time=q['arr'])
            by[str(q['id'])] = (q, r)
            s.add_request(r)
        so = s.schedule()
        rows = []
        ids = []
        sampled = []
        for rid, n in so.num_scheduled_tokens.items():
            q, r = by[rid]
            c0 = r.num_computed_tokens - n
            rows.append([int(rid), c0, n])
        # keep vLLM's own order: running requests first, then new and resumed ones
        order = [r.request_id for r in s.running if r.request_id in so.num_scheduled_tokens]
        rows.sort(key=lambda x: order.index(str(x[0])))
        for rid in order:
            q, r = by[rid]
            ids.append(rid)
            sampled.append([tok(q, r.num_tokens)] if r.num_computed_tokens >= r.num_tokens else [])
        dt = sim.step_time(cfg['hw'], cfg['m'], [(x[1], x[2]) for x in rows])
        t += dt
        mro = ModelRunnerOutput(req_ids=ids, req_id_to_index={k: i for i, k in enumerate(ids)},
                                sampled_token_ids=sampled, logprobs=None, prompt_logprobs_dict={}, pooler_output=[])
        outs = s.update_from_output(so, mro)
        fin = 0
        for eo in outs.values():
            for o in eo.outputs:
                if o.finish_reason is not None:
                    fin += 1
        done += fin
        steps.append({'rows': rows, 'pre': sorted(int(x) for x in (so.preempted_req_ids or []))})
        if len(steps) > 200000:
            raise RuntimeError('no progress')
    return steps


def run_sim(cfg):
    reqs, engs, log = sim.run(cfg, keep_log=True)
    return [{'rows': [[r[0], r[1], r[2]] for r in st['rows']], 'pre': sorted(st['pre'])} for st in log], sim.metrics(reqs, engs, cfg['slo'])


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1]))
    res = []
    for case in cases:
        cfg = case['cfg']
        a = run_vllm(cfg)
        b, mt = run_sim(cfg)
        first = None
        for i in range(max(len(a), len(b))):
            x = a[i] if i < len(a) else None
            y = b[i] if i < len(b) else None
            if x != y:
                first = {'step': i, 'vllm': x, 'sim': y}
                break
        npre_v = sum(len(x['pre']) for x in a)
        res.append({'name': case['name'], 'steps_vllm': len(a), 'steps_sim': len(b), 'identical': first is None,
                    'first_diff': first, 'preemptions_vllm': npre_v, 'preemptions_sim': mt['npre'],
                    'sched_tokens_vllm': sum(r[2] for x in a for r in x['rows']),
                    'sched_tokens_sim': sum(r[2] for x in b for r in x['rows'])})
        print(json.dumps(res[-1]), file=sys.stderr, flush=True)
    print(json.dumps(res, indent=1))
