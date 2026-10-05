"""Shared helpers for the Python references of the OS simulators tab.

The page's JavaScript (parts/31_js_sim_b_core.js) implements the same algorithms; check_js.mjs runs it on the
cases in ref_out.json and requires identical results. mulberry32 is the seeded generator both use, so a
"random workload, seed 7" is the same workload in Python and in the browser.
"""

M32 = 0xFFFFFFFF


def imul(a, b):
    """32-bit integer multiply with wrap-around, like JavaScript's Math.imul (result unsigned)."""
    return (a * b) & M32


def mulberry32(seed):
    """Return a function giving floats in [0, 1), bit-identical to the JavaScript version."""
    state = [seed & M32]

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & M32
        t = state[0]
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & M32
        t &= M32
        return ((t ^ (t >> 14)) & M32) / 4294967296.0

    return nxt


def rand_jobs(seed, n=4, max_run=40, max_arrive=20, io=False):
    """A seeded random job mix: [{'id', 'arrive', 'run', 'io'}] (io = run ticks between I/Os, 0 = none)."""
    r = mulberry32(seed)
    jobs = []
    for i in range(n):
        arrive = 0 if i == 0 else int(r() * (max_arrive + 1))
        run = 2 + int(r() * (max_run - 1))
        iof = (2 + int(r() * 7)) if (io and r() < 0.5) else 0
        jobs.append({"id": i, "arrive": arrive, "run": run, "io": iof})
    return jobs


def rand_refs(seed, n=20, maxpage=9):
    r = mulberry32(seed)
    return [int(r() * (maxpage + 1)) for _ in range(n)]
