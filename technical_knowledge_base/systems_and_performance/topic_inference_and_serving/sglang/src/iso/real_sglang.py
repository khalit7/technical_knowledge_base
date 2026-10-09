"""Replay a trace through SGLang's own RadixCache class (v0.5.21, python/sglang/srt/mem_cache/radix_cache.py),
one request at a time, with a KV pool of C token slots.

Per request (what the scheduler and release_kv_cache do, mem_cache/common.py L292):
  match_prefix on the prompt capped at P - 1 tokens (Req._compute_max_prefix_len, schedule_batch.py L1702)
  -> inc_lock_ref(last node) -> evict LRU leaves until the request's new slots fit
  -> insert prompt + output minus the last token (owned_kv_len), then the prompt alone (split_prompt)
  -> free the duplicate slots insert reports -> dec_lock_ref.
time.monotonic inside radix_cache is replaced by a counter so LRU order is exact and repeatable.
Run with a Python that has SGLang v0.5.21 importable. Usage: real_sglang.py <trace> <capacity|inf> <page_size>
Prints JSON: per-request hit tokens and evicted tokens.
"""
import itertools, json, math, os, sys
from array import array
import torch
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces  # noqa: E402
from sglang.srt.mem_cache import radix_cache as rc  # noqa: E402
from sglang.srt.mem_cache.radix_cache import RadixCache, RadixKey  # noqa: E402
from sglang.srt.mem_cache.base_prefix_cache import InsertParams, MatchPrefixParams, EvictParams  # noqa: E402

_clock = itertools.count(1)
rc.time.monotonic = lambda: float(next(_clock))  # radix_cache imports time; patch its monotonic


class Pool:
    """Mock token_to_kv_pool_allocator: counts free slots."""
    device = 'cpu'

    def __init__(self, cap):
        self.free = cap

    def free_segment(self, x, start_pos=0):
        self.free += len(x)


def run(name, cap, page):
    reqs = traces.get(name)
    pool = Pool(cap)
    t = RadixCache.create_simulated(mock_allocator=pool, page_size=page)
    out = []
    for q in reqs:
        P, O = q['P'], q['O']
        ids = traces.tokens(q, P + O - 1)
        key = RadixKey(array('q', ids[:P]), limit=P - 1)
        m = t.match_prefix(MatchPrefixParams(key=key))
        hit = len(m.device_indices)
        node = m.last_device_node
        t.inc_lock_ref(node)
        need = (P - hit) + (O - 1)
        ev = 0
        if pool.free < need:
            ev = t.evict(EvictParams(num_tokens=need - pool.free)).num_tokens_evicted
        if pool.free < need:
            raise RuntimeError(f'request {q["id"]} needs {need} slots, only {pool.free} free after eviction')
        pool.free -= need
        L = (P + O - 1) // page * page
        r = t.insert(InsertParams(key=RadixKey(array('q', ids[:L])), value=torch.arange(L, dtype=torch.int64)))
        Lp = P // page * page
        if 0 < Lp < L:
            t.insert(InsertParams(key=RadixKey(array('q', ids[:Lp])), value=torch.arange(Lp, dtype=torch.int64), chunked=True, priority=1))
        # slots this request holds that the tree already had (duplicates) or cannot key (partial page) go back
        pool.free += (r.prefix_len - hit) + ((P + O - 1) - L)
        t.dec_lock_ref(node)
        assert t.total_size() + pool.free == cap if cap < 10**12 else True, (t.total_size(), pool.free, cap)
        out.append([q['id'], hit, ev])
    return {'trace': name, 'cap': cap, 'page': page, 'reqs': out, 'tree_tokens': t.total_size()}


if __name__ == '__main__':
    cap = 10**15 if sys.argv[2] == 'inf' else int(sys.argv[2])
    print(json.dumps(run(sys.argv[1], cap, int(sys.argv[3]))))
