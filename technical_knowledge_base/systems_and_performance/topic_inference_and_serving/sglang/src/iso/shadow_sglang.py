"""Shadow for sched.py --check: SGLang's own RadixCache receives the same operations as the ref tree, and SGLang's
own SchedulePolicy.calc_priority orders the same waiting queue; the two orders must be identical.
Requests are stand-ins carrying exactly the fields calc_priority and match_prefix_for_req read."""
import itertools, random
from array import array
from types import SimpleNamespace
import torch
from sglang.srt.mem_cache import radix_cache as rc
from sglang.srt.mem_cache.radix_cache import RadixCache, RadixKey
from sglang.srt.mem_cache.base_prefix_cache import InsertParams, EvictParams
from sglang.srt.managers.schedule_policy import SchedulePolicy
import traces

_clock = itertools.count(1)
rc.time.monotonic = lambda: float(next(_clock))


class _Pool:
    device = 'cpu'

    def __init__(self, cap):
        self.free = cap

    def free_segment(self, x, start_pos=0):
        self.free += len(x)


class Shadow:
    def __init__(self, cap):
        self.cap = cap
        self.checked = 0
        self.bad = 0
        self.reset()

    def reset(self):
        self.pool = _Pool(self.cap)
        self.tree = RadixCache.create_simulated(mock_allocator=self.pool)
        self.pols = {}

    def _req(self, q):
        ids = traces.tokens(q, q['P'])
        r = SimpleNamespace(rid=str(q['id']), origin_input_ids=array('q', ids), output_ids=array('q'), extra_key=None,
                            cache_salt=None, priority=None, kv=SimpleNamespace(cache_protected_len=0))
        r._compute_max_prefix_len = lambda n: max(n - 1, 0)
        return r

    def check(self, policy, W, Wo, m):
        if policy in ('fcfs', 'random') or (policy == 'lpm' and len(W) > 128):
            # the ref model matches every waiting request; do the same so both trees age identically
            for q in W:
                mr = self.tree.match_prefix(rc.MatchPrefixParams(key=RadixKey(array('q', traces.tokens(q, q['P'])), limit=q['P'] - 1)))
                if len(mr.device_indices) != m[q['id']]:
                    self.bad += 1
            if policy == 'random':      # a seeded shuffle has no SGLang order to compare
                self.checked += 1
                return
            if policy == 'lpm':          # SGLang's own order must still be the arrival order
                if policy not in self.pols:
                    self.pols[policy] = SchedulePolicy(policy, self.tree, False, False, False)
                reqs = [self._req(q) for q in W]
                self.pols[policy].calc_priority(reqs)
                self.checked += 1
                if [int(r.rid) for r in reqs] != [q['id'] for q in Wo]:
                    self.bad += 1
                return
        if policy not in self.pols:
            self.pols[policy] = SchedulePolicy(policy, self.tree, False, False, False)
        reqs = [self._req(q) for q in W]
        self.pols[policy].calc_priority(reqs)
        real = [int(r.rid) for r in reqs]
        mine = [q['id'] for q in Wo]
        hits_ok = all(r.num_matched_prefix_tokens == m[int(r.rid)] for r in reqs) if policy != 'fcfs' else True
        self.checked += 1
        if real != mine or not hits_ok:
            self.bad += 1

    def apply(self, adm, locked, ids_of):
        # same operations as the ref round: lock, evict, insert, unlock
        nodes = []
        for q, h, _ in locked:
            ids = traces.tokens(q, q['P'])
            mr = self.tree.match_prefix(rc.MatchPrefixParams(key=RadixKey(array('q', ids), limit=q['P'] - 1)))
            assert len(mr.device_indices) == h, (len(mr.device_indices), h)
            self.tree.inc_lock_ref(mr.last_device_node)
            nodes.append(mr.last_device_node)
        need = sum((q['P'] - h) + (q['O'] - 1) for q, h, _ in locked)
        if self.pool.free < need:
            self.tree.evict(EvictParams(num_tokens=need - self.pool.free))
        self.pool.free -= need
        for q, h, _ in locked:
            ids = ids_of(q)
            L = q['P'] + q['O'] - 1
            r = self.tree.insert(InsertParams(key=RadixKey(array('q', ids[:L])), value=torch.arange(L)))
            self.tree.insert(InsertParams(key=RadixKey(array('q', ids[:q['P']])), value=torch.arange(q['P']), chunked=True, priority=1))
            self.pool.free += r.prefix_len - h
        for n in nodes:
            self.tree.dec_lock_ref(n)
