"""Reference model of PyTorch's CUDA caching allocator (c10/cuda/CUDACachingAllocator.cpp at v2.14.1), used to
check the page's JavaScript simulator (../parts/32_js_cache_core.js) step by step.

What it models, from the source (line numbers in that file unless named):
  round_size (3060-3072, with roundup_power2_next_division 3040-3058), get_pool (small <= kSmallSize, 3640-3667),
  get_allocation_size (3695-3703), get_free_block best fit by (size, segment order, address) (3705-3762, comparator
  1120-1131) with the max_split_size rules, should_split (3675-3693), alloc_found_block splitting the front off
  (alloc_found_block), free_block merging with free neighbours (3502-3612), the malloc retry chain (1720-1792):
  cache, then a new segment, then release_available_cached_blocks (4003-4051, only when max_split_size is set),
  then release_cached_blocks (whole, unsplit segments) and a final try; expandable segments (Note at 311-401,
  find_expandable_block 3344-3391, map_block 3393-3466, try_allocate_expandable_block 3468-3500).
Constants from c10/core/AllocatorConfig.h: kMinBlockSize 512, kSmallSize 1 MiB, kSmallBuffer 2 MiB,
  kMinLargeAlloc 10 MiB, kRoundLarge 2 MiB, large_segment_size 20 MiB.
Simplifications (said on the page): one device, one stream, no CUDA events or record_stream, no graph pools,
  no garbage_collection_threshold; cudaMalloc succeeds exactly when reserved + size <= capacity; an expandable
  segment's address range is the capacity rounded up to its page size; unmapping on release frees the whole
  pages inside each free block.
"""
import json, sys

MiB = 1 << 20
K_MIN_BLOCK = 512
K_SMALL_SIZE = 1 * MiB
K_SMALL_BUFFER = 2 * MiB
K_MIN_LARGE_ALLOC = 10 * MiB
K_ROUND_LARGE = 2 * MiB
LARGE_SEGMENT = 20 * MiB
INF = float("inf")


def pow2_floor(x):
    return 1 << (x.bit_length() - 1)


def roundup_power2_next_division(size, divisions):
    if size & (size - 1) == 0:
        return size
    p2f = pow2_floor(size)
    div = p2f >> (divisions.bit_length() - 1)
    if div == 0:
        return p2f << 1
    floor = size & ~(div - 1)
    return size if floor == size else floor + div


def round_size(size, divisions):
    if size < K_MIN_BLOCK:
        return K_MIN_BLOCK
    if divisions > 1 and size > K_MIN_BLOCK * divisions:
        return roundup_power2_next_division(size, divisions)
    return K_MIN_BLOCK * ((size + K_MIN_BLOCK - 1) // K_MIN_BLOCK)


def allocation_size(size):
    if size <= K_SMALL_SIZE:
        return K_SMALL_BUFFER
    if size < K_MIN_LARGE_ALLOC:
        return LARGE_SEGMENT
    return K_ROUND_LARGE * ((size + K_ROUND_LARGE - 1) // K_ROUND_LARGE)


class Block:
    __slots__ = ("ptr", "size", "small", "seg", "allocated", "mapped", "prev", "next", "tag")

    def __init__(self, ptr, size, small, seg, mapped=True):
        self.ptr, self.size, self.small, self.seg = ptr, size, small, seg
        self.allocated, self.mapped, self.prev, self.next, self.tag = False, mapped, None, None, None

    def is_split(self):
        return self.prev is not None or self.next is not None


class Seg:
    def __init__(self, sid, base, size, small, expandable, page):
        self.id, self.base, self.size, self.small, self.expandable, self.page = sid, base, size, small, expandable, page


class Allocator:
    def __init__(self, capacity, max_split=INF, expandable=False, divisions=0, max_nonsplit_rounding=LARGE_SEGMENT):
        self.cap, self.max_split, self.exp, self.div = capacity, max_split, expandable, divisions
        self.max_nonsplit_rounding = max_nonsplit_rounding
        self.blocks = []            # every live Block object (free, allocated, unmapped)
        self.segs = []
        self.next_base = 0
        self.reserved = 0
        self.live = {}              # tag -> Block
        self.n_malloc = self.n_free = self.n_retry = self.n_oom = self.n_map = self.n_unmap = 0
        self.log = []

    # ---- helpers
    def free_blocks(self, small):
        bs = [b for b in self.blocks if b.small == small and b.mapped and not b.allocated]
        return sorted(bs, key=lambda b: (b.size, b.seg.id, b.ptr))

    def unmapped_blocks(self, small):
        bs = [b for b in self.blocks if b.small == small and not b.mapped]
        return sorted(bs, key=lambda b: (b.size, b.seg.id, b.ptr))

    def new_seg(self, size, small, expandable, page):
        s = Seg(len(self.segs), self.next_base, size, small, expandable, page)
        self.next_base += size + 64 * MiB      # gaps between segments, for drawing only
        self.segs.append(s)
        return s

    def merge(self, dst, src):
        if src is None or src.allocated or dst.mapped != src.mapped:
            return 0
        if dst.prev is src:
            dst.ptr = src.ptr
            dst.prev = src.prev
            if dst.prev:
                dst.prev.next = dst
        else:
            dst.next = src.next
            if dst.next:
                dst.next.prev = dst
        dst.size += src.size
        self.blocks.remove(src)
        return src.size

    # ---- get_free_block
    def get_free_block(self, small, size):
        cands = [b for b in self.free_blocks(small) if b.size >= size]
        if not cands:
            return None
        i = 0
        b = cands[0]
        if b.seg.expandable:
            if self.exp:
                def esize(x):
                    return x.size + (x.next.size if x.next is not None and not x.next.mapped else 0)
                while cands[i].seg.expandable and i + 1 < len(cands) and esize(cands[i + 1]) < esize(cands[i]):
                    i += 1
            else:
                while i < len(cands) and cands[i].seg.expandable:
                    i += 1
                if i == len(cands):
                    return None
        b = cands[i]
        if size < self.max_split and b.size >= self.max_split:
            return None
        if size >= self.max_split and b.size >= size + self.max_nonsplit_rounding:
            return None
        return b

    # ---- new memory
    def alloc_block(self, small, size, alloc_size):
        if self.exp:
            return self.try_alloc_expandable(small, size)
        if self.reserved + alloc_size > self.cap:
            return None
        s = self.new_seg(alloc_size, small, False, alloc_size)
        b = Block(s.base, alloc_size, small, s)
        self.blocks.append(b)
        self.reserved += alloc_size
        self.n_malloc += 1
        self.log.append(("cudaMalloc", alloc_size))
        return b

    def find_expandable(self, small, size):
        def allocatable(x):
            return x is not None and not x.allocated
        for c in self.unmapped_blocks(small):
            if allocatable(c.prev):
                c = c.prev
            got, x = 0, c
            while got < size and allocatable(x):
                got += x.size
                x = x.next
            if got >= size:
                return c
        page = K_SMALL_BUFFER if small else LARGE_SEGMENT
        span = ((self.cap + page - 1) // page) * page
        s = self.new_seg(span, small, True, page)
        b = Block(s.base, span, small, s, mapped=False)
        self.blocks.append(b)
        return b

    def map_block(self, b, size):
        page = b.seg.page
        want = ((size + page - 1) // page) * page
        want = min(want, b.size)
        if self.reserved + want > self.cap:
            return False
        if want < b.size:
            rest = Block(b.ptr + want, b.size - want, b.small, b.seg, mapped=False)
            rest.prev, rest.next = b, b.next
            if b.next:
                b.next.prev = rest
            b.next = rest
            self.blocks.append(rest)
            b.size = want
        b.mapped = True
        self.reserved += want
        self.n_map += 1
        self.log.append(("map", want))
        self.merge(b, b.prev)
        self.merge(b, b.next)
        return True

    def try_alloc_expandable(self, small, size):
        c = self.find_expandable(small, size)
        if not c.mapped and not self.map_block(c, min(c.size, size)):
            return None
        while c.size < size:
            nb = c.next
            if not self.map_block(nb, min(size - c.size, nb.size)):
                return None
            c = nb
        return c

    # ---- releasing cached memory
    def release_block(self, b):
        self.blocks.remove(b)
        self.reserved -= b.size
        self.n_free += 1
        self.log.append(("cudaFree", b.size))

    def unmap_free(self, b):
        base = b.seg.base
        page = b.seg.page
        lo = base + ((b.ptr - base + page - 1) // page) * page
        hi = base + ((b.ptr + b.size - base) // page) * page
        if hi <= lo:
            return 0
        pieces = []
        if lo > b.ptr:
            pieces.append((b.ptr, lo - b.ptr, True))
        pieces.append((lo, hi - lo, False))
        if b.ptr + b.size > hi:
            pieces.append((hi, b.ptr + b.size - hi, True))
        prev, nxt = b.prev, b.next
        self.blocks.remove(b)
        made = []
        for ptr, sz, mapped in pieces:
            nb = Block(ptr, sz, b.small, b.seg, mapped=mapped)
            self.blocks.append(nb)
            made.append(nb)
        for i, nb in enumerate(made):
            nb.prev = made[i - 1] if i > 0 else prev
            nb.next = made[i + 1] if i + 1 < len(made) else nxt
        if prev:
            prev.next = made[0]
        if nxt:
            nxt.prev = made[-1]
        self.reserved -= hi - lo
        self.n_unmap += 1
        self.log.append(("unmap", hi - lo))
        um = [x for x in made if not x.mapped][0]
        self.merge(um, um.prev)
        self.merge(um, um.next)
        return hi - lo

    def release_available(self, small, size):
        if self.max_split == INF:
            return False
        key = max(size, self.max_split)
        fb = [b for b in self.free_blocks(small) if not b.seg.expandable]
        big = [b for b in fb if b.size >= key]
        if big:
            self.release_block(big[0])
            return True
        total = 0
        for b in reversed(fb):
            if total >= key or b.size < self.max_split:
                break
            if not b.is_split():
                total += b.size
                self.release_block(b)
        return total >= key

    def release_cached(self):
        for small in (False, True):
            for b in list(self.free_blocks(small)):
                if b not in self.blocks:
                    continue
                if b.seg.expandable:
                    self.unmap_free(b)
                elif not b.is_split():
                    self.release_block(b)
        return True

    # ---- public
    def malloc(self, tag, orig):
        size = round_size(orig, self.div)
        small = size <= K_SMALL_SIZE
        asz = allocation_size(size)
        b = self.get_free_block(small, size)
        if b is None:
            b = self.alloc_block(small, size, asz)
            if b is None:
                b = (self.release_available(small, size) and self.alloc_block(small, size, asz)) or None
                if b is None:
                    self.n_retry += 1
                    self.release_cached()
                    b = self.alloc_block(small, size, asz)
        if b is None:
            self.n_oom += 1
            self.log.append(("OOM", size))
            return False
        exp = b.seg.expandable
        rem = b.size - size
        split = (rem >= K_MIN_BLOCK) if (small or exp) else (size < self.max_split and rem > K_SMALL_SIZE)
        if split:
            nb = Block(b.ptr, size, small, b.seg)
            nb.prev, nb.next = b.prev, b
            if b.prev:
                b.prev.next = nb
            b.prev = nb
            b.ptr += size
            b.size -= size
            self.blocks.append(nb)
            b = nb
        b.allocated = True
        b.tag = tag
        self.live[tag] = b
        return True

    def free(self, tag):
        b = self.live.pop(tag)
        b.allocated = False
        b.tag = None
        self.merge(b, b.prev)
        self.merge(b, b.next)

    def stats(self):
        alloc = sum(b.size for b in self.blocks if b.allocated)
        free_mapped = [b.size for b in self.blocks if b.mapped and not b.allocated]
        return dict(allocated=alloc, reserved=self.reserved, largest_free=max(free_mapped, default=0),
                    cached=self.reserved - alloc, segments=len({b.seg.id for b in self.blocks if b.mapped}),
                    cudaMalloc=self.n_malloc, cudaFree=self.n_free, maps=self.n_map, unmaps=self.n_unmap,
                    retries=self.n_retry, ooms=self.n_oom)

    def layout(self):
        out = []
        for b in sorted(self.blocks, key=lambda x: (x.seg.id, x.ptr)):
            st = "A" if b.allocated else ("F" if b.mapped else "U")
            out.append([b.seg.id, b.ptr - b.seg.base, b.size, st, b.tag])
        return out


def run(ops, **cfg):
    a = Allocator(**cfg)
    steps = []
    for op in ops:
        if op[0] == "+":
            ok = a.malloc(op[1], op[2])
        else:
            a.free(op[1]) if op[1] in a.live else None
            ok = True
        steps.append(dict(ok=ok, stats=a.stats(), layout=a.layout()))
        if not ok:                 # the program would raise torch.OutOfMemoryError here: stop
            break
    return steps


if __name__ == "__main__":
    spec = json.load(open(sys.argv[1]))
    out = {}
    for name, case in spec.items():
        cfg = case["cfg"]
        cfg = {k: (INF if v == "inf" else v) for k, v in cfg.items()}
        out[name] = run([tuple(o) for o in case["ops"]], **cfg)
    json.dump(out, sys.stdout)
