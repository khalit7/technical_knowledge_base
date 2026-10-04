"""The router used by this page's sharding demo: consistent hashing with virtual nodes.
hash = 32-bit FNV-1a followed by MurmurHash3's 32-bit finalizer (the same function as the SWE topic's Distributed systems
fundamentals widget). A user key is 'user:<id>'; shard m's points are the hashes of 'node-m-vn-v'. src/recompute.py and the
page's JavaScript use the same function."""
import bisect
def h32(s):
    x = 0x811c9dc5
    for b in s.encode():
        x ^= b; x = (x * 0x01000193) & 0xffffffff
    x ^= x >> 16; x = (x * 0x85ebca6b) & 0xffffffff
    x ^= x >> 13; x = (x * 0xc2b2ae35) & 0xffffffff
    x ^= x >> 16
    return x
class Ring:
    def __init__(self, shards, vnodes=64):
        pts = sorted((h32(f'node-{m}-vn-{v}'), m) for m in shards for v in range(vnodes))
        self.keys = [p for p, _ in pts]; self.own = [m for _, m in pts]
    def shard(self, key):
        i = bisect.bisect_right(self.keys, h32(key))
        return self.own[i % len(self.keys)]
def user_key(uid): return f'user:{uid}'
