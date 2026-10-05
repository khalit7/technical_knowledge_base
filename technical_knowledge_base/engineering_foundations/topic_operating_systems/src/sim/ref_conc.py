"""Concurrency reference (OSTEP chapters 26, 28 and 32).

run_x86: an interpreter for the subset of OSTEP's x86.py assembly used by looping-race-nolock.s and
test-and-set.s, with x86.py's scheduling: switch to the next thread every `interval` instructions, and at a
halt. One extension, labelled on the page: 'fetchadd $1, VAR', one indivisible read-modify-write (what C's
__atomic_fetch_add compiles to), which x86.py does not have.
deadlock_count: every interleaving of two threads taking two locks, counting those that deadlock.
"""
from ref_common import mulberry32

NOLOCK = """
.main
.top
mov 2000, %ax
add $1, %ax
mov %ax, 2000
sub  $1, %bx
test $0, %bx
jgt .top
halt
"""

TAS = """
.var mutex
.var count
.main
.top
.acquire
mov  $1, %ax
xchg %ax, mutex
test $0, %ax
jne  .acquire
mov  count, %ax
add  $1, %ax
mov  %ax, count
mov  $0, mutex
sub  $1, %bx
test $0, %bx
jgt .top
halt
"""

ATOMIC = """
.var count
.main
.top
fetchadd $1, count
sub  $1, %bx
test $0, %bx
jgt .top
halt
"""


def parse(src):
    prog, labels, varaddr, nxt = [], {}, {}, 1000
    for line in src.strip().splitlines():
        line = line.split("#")[0].strip()
        if not line:
            continue
        if line.startswith(".var"):
            varaddr[line.split()[1]] = nxt
            nxt += 4
            continue
        if line.startswith("."):
            labels[line] = len(prog)
            continue
        op, rest = (line.split(None, 1) + [""])[:2]
        args = [a.strip() for a in rest.split(",")] if rest else []
        prog.append((op, args))
    return prog, labels, varaddr


def run_x86(src, loops, interval=1, nthreads=2, rand_seed=None, max_steps=100000):
    prog, labels, varaddr = parse(src)
    mem = {}

    def addr(a):
        return varaddr[a] if a in varaddr else int(a)

    def val(a, regs):
        if a.startswith("$"):
            return int(a[1:])
        if a.startswith("%"):
            return regs[a[1:]]
        return mem.get(addr(a), 0)

    T = [{"pc": 0, "regs": {"ax": 0, "bx": loops}, "gt": False, "ne": False, "done": False} for _ in range(nthreads)]
    r = mulberry32(rand_seed) if rand_seed is not None else None
    setint = (lambda: int(r() * interval) + 1) if r else (lambda: interval)
    cur, intr, trace, steps = 0, setint(), [], 0
    while steps < max_steps:
        th = T[cur]
        op, a = prog[th["pc"]]
        pc0 = th["pc"]
        th["pc"] += 1
        regs = th["regs"]
        if op == "mov":
            v = val(a[0], regs)
            if a[1].startswith("%"):
                regs[a[1][1:]] = v
            else:
                mem[addr(a[1])] = v
        elif op == "add":
            regs[a[1][1:]] += val(a[0], regs)
        elif op == "sub":
            regs[a[1][1:]] -= val(a[0], regs)
        elif op == "test":
            d, s = val(a[1], regs), val(a[0], regs)
            th["gt"], th["ne"] = d > s, d != s
        elif op == "jgt":
            if th["gt"]:
                th["pc"] = labels[a[0]]
        elif op == "jne":
            if th["ne"]:
                th["pc"] = labels[a[0]]
        elif op == "xchg":
            m = addr(a[1])
            old = mem.get(m, 0)
            mem[m] = regs[a[0][1:]]
            regs[a[0][1:]] = old
        elif op == "fetchadd":
            m = addr(a[1])
            mem[m] = mem.get(m, 0) + val(a[0], regs)
        elif op == "halt":
            th["done"] = True
        else:
            raise ValueError(op)
        steps += 1
        trace.append([cur, pc0])
        if all(t["done"] for t in T):
            break
        if th["done"]:
            cur = nextthread(T, cur)
        intr -= 1
        if intr == 0:
            intr = setint()
            cur = nextthread(T, cur)
    cnt = mem.get(varaddr.get("count", 2000), 0)
    return {"count": cnt, "expected": loops * nthreads, "steps": steps, "trace": trace}


def nextthread(T, cur):
    n = len(T)
    for i in list(range(cur + 1, n)) + list(range(0, cur + 1)):
        if not T[i]["done"]:
            return i
    return cur


def deadlock_count(ordered):
    """Each thread: lock X, lock Y, work, unlock Y, unlock X. Thread 1 takes A then B; thread 2 takes B then A,
    or A then B when ordered. Explore every interleaving; a state where no thread can move is a deadlock."""
    progs = [["L:A", "L:B", "W", "U:B", "U:A"], (["L:A", "L:B", "W", "U:B", "U:A"] if ordered
                                                 else ["L:B", "L:A", "W", "U:A", "U:B"])]
    res = {"complete": 0, "deadlock": 0}

    def can(t, pcs, held):
        if pcs[t] >= 5:
            return False
        op, x = progs[t][pcs[t]][0], progs[t][pcs[t]][2:] if ":" in progs[t][pcs[t]] else None
        return not (op == "L" and held.get(x) is not None)

    def dfs(pcs, held):
        if pcs[0] == 5 and pcs[1] == 5:
            res["complete"] += 1
            return
        moved = False
        for t in (0, 1):
            if can(t, pcs, held):
                moved = True
                s = progs[t][pcs[t]]
                h = dict(held)
                if s.startswith("L:"):
                    h[s[2:]] = t
                elif s.startswith("U:"):
                    h[s[2:]] = None
                p = list(pcs)
                p[t] += 1
                dfs(p, h)
        if not moved:
            res["deadlock"] += 1

    dfs([0, 0], {})
    return res
