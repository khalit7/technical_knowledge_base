"""Virtual memory reference (OSTEP chapters 18 to 22).

translate_linear: a linear page table (chapter 18), PTE = valid bit 31 | PFN, as in OSTEP's paging-linear-translate.py.
walk_two_level: OSTEP's multi-level homework format (chapter 20): 15-bit virtual address, 32-byte pages,
  5-bit page-directory index, 5-bit page-table index, 5-bit offset; a PDE or PTE byte = valid bit 7 | 7-bit PFN.
tlb_trace: a fully associative TLB with LRU replacement over a trace of virtual addresses (chapter 19).
array_trace: the addresses touched when walking a rows x cols array of 4-byte ints, row-major or column-major.
replace: page replacement over a reference string (chapter 22): FIFO, LRU, OPT (ties as paging-policy.py) and
  CLOCK as the chapter describes it (a hand sweeping use bits); OSTEP's paging-policy.py CLOCK instead picks
  random pages to inspect, so CLOCK is checked against this reference only.
"""


def translate_linear(va, page_size, pt):
    vpn, off = va // page_size, va % page_size
    if vpn >= len(pt) or not (pt[vpn] >> 31) & 1:
        return {"vpn": vpn, "off": off, "valid": False}
    pfn = pt[vpn] & 0x7FFFFFFF
    return {"vpn": vpn, "off": off, "valid": True, "pfn": pfn, "pa": pfn * page_size + off}


def walk_two_level(va, pdbr, mem):
    """mem: list of pages, each a list of 32 byte values. Returns the walk, step by step."""
    pdi, pti, off = (va >> 10) & 0x1F, (va >> 5) & 0x1F, va & 0x1F
    pde = mem[pdbr][pdi]
    out = {"pdi": pdi, "pti": pti, "off": off, "pde": pde, "pde_valid": pde >> 7, "pt_pfn": pde & 0x7F}
    if not pde >> 7:
        out["fault"] = "pde"
        return out
    pte = mem[pde & 0x7F][pti]
    out.update({"pte": pte, "pte_valid": pte >> 7, "pfn": pte & 0x7F})
    if not pte >> 7:
        out["fault"] = "pte"
        return out
    pa = ((pte & 0x7F) << 5) | off
    out.update({"pa": pa, "value": mem[pa >> 5][pa & 0x1F]})
    return out


def array_trace(rows, cols, order, base=0, elem=4):
    if order == "row":
        return [base + (r * cols + c) * elem for r in range(rows) for c in range(cols)]
    return [base + (r * cols + c) * elem for c in range(cols) for r in range(rows)]


def tlb_trace(addrs, page_size, entries):
    tlb, res = [], []  # tlb: VPNs, least recently used first
    for a in addrs:
        vpn = a // page_size
        if vpn in tlb:
            tlb.remove(vpn)
            tlb.append(vpn)
            res.append(1)
        else:
            if len(tlb) == entries:
                tlb.pop(0)
            tlb.append(vpn)
            res.append(0)
    return {"hits": sum(res), "misses": len(res) - sum(res), "seq": res}


def replace(refs, frames, policy):
    mem, use, hand, seq = [], {}, 0, []
    for i, p in enumerate(refs):
        if p in mem:
            if policy == "LRU":
                mem.remove(p)
                mem.append(p)
            use[p] = 1
            seq.append({"hit": True, "mem": list(mem), "evict": None})
            continue
        victim = None
        if len(mem) == frames:
            if policy in ("FIFO", "LRU"):
                victim = mem.pop(0)
            elif policy == "OPT":
                best, bi = -1, -1
                for k, q in enumerate(mem):
                    nxt = len(refs)
                    for f in range(i + 1, len(refs)):
                        if refs[f] == q:
                            nxt = f
                            break
                    if nxt >= best:
                        best, bi = nxt, k
                victim = mem.pop(bi)
            elif policy == "CLOCK":
                # frames are slots; the hand sweeps, clearing use bits, until it finds a 0
                while use[mem[hand]]:
                    use[mem[hand]] = 0
                    hand = (hand + 1) % frames
                victim = mem[hand]
                del use[victim]
                mem[hand] = p
                use[p] = 1
                hand = (hand + 1) % frames
                seq.append({"hit": False, "mem": list(mem), "evict": victim, "hand": hand})
                continue
        if policy == "CLOCK":
            mem.append(p)
            use[p] = 1
            hand = len(mem) % frames
            seq.append({"hit": False, "mem": list(mem), "evict": victim, "hand": hand})
            continue
        mem.append(p)
        seq.append({"hit": False, "mem": list(mem), "evict": victim})
    hits = sum(1 for s in seq if s["hit"])
    return {"hits": hits, "misses": len(refs) - hits, "seq": seq}
