"""Replay a trace through SGLang v0.5.21's default prefix cache, UnifiedRadixCache (registry.py
default_radix_cache_factory returns create_unified_radix_cache), with its Python TreeCore, a real
TokenToKVPoolAllocator and a tiny MHATokenToKVPool on the CPU (the set-up of SGLang's own unit test
test/registered/unit/mem_cache/test_session_unified_radix_cache.py). One request at a time, as real_sglang.py.
Usage: real_unified.py <trace> <capacity> ; prints JSON with per-request hit and evicted tokens."""
import json, os, sys
os.environ.setdefault('SGLANG_UNIFIED_RADIX_TREE_CORE_BACKEND', 'python')
from array import array
import torch
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces  # noqa: E402
from sglang.srt.mem_cache.allocator import TokenToKVPoolAllocator  # noqa: E402
from sglang.srt.mem_cache.base_prefix_cache import EvictParams, InsertParams, MatchPrefixParams, DecLockRefParams  # noqa: E402
from sglang.srt.mem_cache.cache_init_params import CacheInitParams  # noqa: E402
from sglang.srt.mem_cache.memory_pool import MHATokenToKVPool, ReqToTokenPool  # noqa: E402
from sglang.srt.mem_cache.radix_cache import RadixKey  # noqa: E402
from sglang.srt.mem_cache.unified_cache.components import ComponentType  # noqa: E402
from sglang.srt.mem_cache.unified_radix_cache import UnifiedRadixCache  # noqa: E402


def make(cap):
    kv = MHATokenToKVPool(size=cap, page_size=1, dtype=torch.float16, head_num=1, head_dim=1, layer_num=1,
                          device='cpu', enable_memory_saver=False)
    al = TokenToKVPoolAllocator(size=cap, dtype=torch.float16, device='cpu', kvcache=kv, need_sort=False)
    rq = ReqToTokenPool(size=4, max_context_len=8192, device='cpu', enable_memory_saver=False)
    return UnifiedRadixCache(CacheInitParams(disable=False, req_to_token_pool=rq, token_to_kv_pool_allocator=al, page_size=1,
                                             eviction_policy='lru', tree_components=(ComponentType.FULL,)))


def run(name, cap):
    reqs = traces.get(name)
    c = make(cap)
    al = c.token_to_kv_pool_allocator
    out = []
    for q in reqs:
        P, O = q['P'], q['O']
        ids = traces.tokens(q, P + O - 1)
        m = c.match_prefix(MatchPrefixParams(key=RadixKey(array('q', ids[:P]), limit=P - 1)))
        hit = len(m.device_indices)
        prefix = m.device_indices.to(torch.int64)
        rc = c.inc_lock_ref(m.last_device_node)
        need = (P - hit) + (O - 1)
        ev = 0
        if al.available_size() < need:
            ev = c.evict(EvictParams(num_tokens=need - al.available_size())).num_tokens_evicted
        new = al.alloc(need)
        assert new is not None, ('alloc failed', q['id'])
        val = torch.cat([prefix, new.to(torch.int64)])
        L = P + O - 1
        # as UnifiedRadixCache.insert_req (L1006): prev_prefix_len marks the matched, tree-owned indices so only
        # newly computed duplicates are freed; then the prompt alone, split at the prompt boundary
        c.insert(InsertParams(key=RadixKey(array('q', ids[:L])), value=val[:L].clone(), prev_prefix_len=hit))
        if 0 < P < L:
            c.insert(InsertParams(key=RadixKey(array('q', ids[:P])), value=val[:P].clone(), prev_prefix_len=P, priority=1))
        # unlike the legacy RadixCache, UnifiedRadixCache.insert frees the duplicate slots itself (its cache actions)
        c.dec_lock_ref(m.last_device_node, DecLockRefParams(node_id=rc.node_id, skipped_lock_components=rc.skipped_lock_components,
                                                            component_lock_uuids=getattr(rc, 'component_lock_uuids', {}) or {}))
        tot = c.total_size()[0]
        if tot + al.available_size() != cap:
            print('invariant', q['id'], tot, al.available_size(), cap, file=sys.stderr)
        out.append([q['id'], hit, ev])
    return {'trace': name, 'cap': cap, 'reqs': out}


if __name__ == '__main__':
    print(json.dumps(run(sys.argv[1], int(sys.argv[2]))))
