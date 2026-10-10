"""Apply the page's example patch (a prefix-cache eviction counter) to a vLLM v0.31.0 checkout.
usage: python3 -I apply_patch.py <vllm checkout>   then `git diff > eviction_metric.diff` there."""
import sys, os
root = sys.argv[1]
def edit(rel, a, b):
    p = os.path.join(root, rel); s = open(p).read()
    assert s.count(a) == 1, (rel, a[:60]); open(p, "w").write(s.replace(a, b))

edit("vllm/v1/core/block_pool.py", "        self.metrics_collector = metrics_collector\n",
     "        self.metrics_collector = metrics_collector\n"
     "        # Cached (hashed) blocks evicted to make room for new allocations since\n"
     "        # the last call to take_num_evicted_cached_blocks().\n"
     "        self.num_evicted_cached_blocks = 0\n")
edit("vllm/v1/core/block_pool.py",
     "            for block in ret:\n                self._maybe_evict_cached_block(block)\n                assert block.ref_cnt == 0",
     "            for block in ret:\n                if self._maybe_evict_cached_block(block):\n"
     "                    self.num_evicted_cached_blocks += 1\n                assert block.ref_cnt == 0")
edit("vllm/v1/core/block_pool.py", "    def _notify_reuse(self, blocks: Iterable[KVCacheBlock]) -> None:",
     "    def take_num_evicted_cached_blocks(self) -> int:\n"
     "        \"\"\"Return (and reset) the number of cached blocks evicted to make room\n"
     "        for new allocations since the last call.\"\"\"\n"
     "        n, self.num_evicted_cached_blocks = self.num_evicted_cached_blocks, 0\n"
     "        return n\n\n"
     "    def _notify_reuse(self, blocks: Iterable[KVCacheBlock]) -> None:")
edit("vllm/v1/metrics/stats.py",
     "    preempted_hits: int = 0\n    \"\"\"The `hits` number for preempted requests.\"\"\"\n",
     "    preempted_hits: int = 0\n    \"\"\"The `hits` number for preempted requests.\"\"\"\n\n"
     "    evicted_blocks: int = 0\n    \"\"\"The number of cached blocks evicted to make room in this update.\"\"\"\n")
edit("vllm/v1/core/kv_cache_manager.py",
     "        stats = self.prefix_cache_stats\n        self.prefix_cache_stats = PrefixCacheStats()\n        return stats",
     "        stats = self.prefix_cache_stats\n"
     "        stats.evicted_blocks = self.block_pool.take_num_evicted_cached_blocks()\n"
     "        self.prefix_cache_stats = PrefixCacheStats()\n        return stats")
edit("vllm/v1/metrics/loggers.py",
     "        self.counter_prefix_cache_hits = create_metric_per_engine(\n            counter_prefix_cache_hits, per_engine_labelvalues\n        )\n",
     "        self.counter_prefix_cache_hits = create_metric_per_engine(\n            counter_prefix_cache_hits, per_engine_labelvalues\n        )\n\n"
     "        counter_prefix_cache_evicted_blocks = self._counter_cls(\n"
     "            name=\"vllm:prefix_cache_evicted_blocks\",\n"
     "            documentation=(\n                \"Cached KV blocks evicted to make room for new allocations.\"\n            ),\n"
     "            labelnames=labelnames,\n        )\n"
     "        self.counter_prefix_cache_evicted_blocks = create_metric_per_engine(\n"
     "            counter_prefix_cache_evicted_blocks, per_engine_labelvalues\n        )\n")
edit("vllm/v1/metrics/loggers.py",
     "            self.counter_prefix_cache_hits[engine_idx].inc(\n                scheduler_stats.prefix_cache_stats.hits\n            )\n",
     "            self.counter_prefix_cache_hits[engine_idx].inc(\n                scheduler_stats.prefix_cache_stats.hits\n            )\n"
     "            self.counter_prefix_cache_evicted_blocks[engine_idx].inc(\n"
     "                scheduler_stats.prefix_cache_stats.evicted_blocks\n            )\n")
edit("tests/v1/core/test_prefix_caching.py", "def test_hash_block_correct_reuse():", '''def test_prefix_cache_stats_count_evicted_blocks():
    """Cached blocks reused for new allocations are counted as evictions."""
    block_size = 16
    manager = make_kv_cache_manager(
        make_kv_cache_config(block_size, 11),
        max_model_len=8192,
        enable_caching=True,
        hash_block_size=block_size,
        log_stats=True,
    )
    # req0: 5 full blocks (hashed) + 1 partial block, then freed.
    req0 = make_request("0", list(range(5 * 16 + 7)), block_size, sha256)
    computed_blocks, _, _ = manager.get_computed_blocks(req0)
    assert manager.allocate_slots(req0, 5 * 16 + 7, 0, computed_blocks) is not None
    manager.free(req0)
    assert manager.make_prefix_cache_stats().evicted_blocks == 0

    # req1 needs 8 new blocks with different tokens: the 5 never-hashed free
    # blocks go first, then 3 of req0's cached blocks are evicted (LRU).
    req1 = make_request("1", list(range(1000, 1000 + 8 * 16)), block_size, sha256)
    computed_blocks, num_computed_tokens, _ = manager.get_computed_blocks(req1)
    assert num_computed_tokens == 0
    assert manager.allocate_slots(req1, 8 * 16, 0, computed_blocks) is not None
    assert manager.make_prefix_cache_stats().evicted_blocks == 3
    # The count is reset after each report.
    assert manager.make_prefix_cache_stats().evicted_blocks == 0


def test_hash_block_correct_reuse():''')
print("patched")
