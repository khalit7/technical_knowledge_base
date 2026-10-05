"""Independent checks of the numbers the page computes in JavaScript.
1. Interleaving lab: explores every interleaving of each scenario in inputs/lab_programs.json (a separate
   implementation from the page's) and counts schedules that finish, hit a bug, or leave a thread asleep forever.
2. Event loop lab: least-squares fit of poll()'s cost against the number of watched descriptors, 100 to 3,000
   (runs/out/evloop.txt), which the lab uses to scale its counters.
Writes inputs/recompute_out.json, which check_embed.py compares with what the page shows. Usage: python3 recompute.py"""
import json, pathlib, re, sys
from functools import lru_cache

HERE = pathlib.Path(__file__).parent
SPEC = json.loads((HERE / "inputs/lab_programs.json").read_text())


def programs(sc, nthreads=None):
    names = sc["threads"][:nthreads] if nthreads else sc["threads"]
    if "prog" in sc:
        return names, [sc["prog"]] * len(names)
    progs = dict(sc["progs"])
    if progs["P"] == "same as cvif":
        progs["P"] = next(s for s in SPEC["scenarios"] if s["id"] == "cvif")["progs"]["P"]
    return names, [progs["P"] if n == "P" else progs["C"] for n in names]


def explore(sc, nthreads=None):
    names, progs = programs(sc, nthreads)
    labels = [{ins["l"]: i for i, ins in enumerate(p)} for p in progs]
    n = len(names)
    mem0 = dict(sc["mem"])
    # thread state: (pc, status, then, re) status: R runnable, B blocked, D done; re: label to go to after re-taking the mutex
    start = (tuple((0, "R", None, None) for _ in range(n)), tuple(sorted(mem0.items())), (), 0)

    def step(state, t):
        ths, mem, qs, incs = state
        ths = [list(x) for x in ths]; mem = dict(mem); qs = {k: list(v) for k, v in qs}; 
        pc, st, then, re = ths[t]
        prog, lab = progs[t], labels[t]
        def q(name):
            return qs.setdefault(name, [])
        def wake(name, k=1):
            for _ in range(k):
                if q(name):
                    u = q(name).pop(0)
                    if ths[u][1] == "B":
                        ths[u][1] = "R"
                        if ths[u][2] is not None and ths[u][3] is None:
                            ths[u][0] = labels[u][ths[u][2]]
                    else:
                        pass  # not asleep yet: the wake-up is lost
        bug = None
        if re is not None:                       # re-taking the mutex after a condition-variable wake-up
            m, lbl = re
            if mem[m] == 0:
                mem[m] = 1; ths[t] = [lab[lbl], "R", None, None]
            else:
                q(m).append(t); ths[t][1] = "B"
        else:
            ins = prog[pc]; op = ins["op"]; nxt = pc + 1
            if op == "cas":
                if mem[ins["v"]] == ins["exp"]:
                    mem[ins["v"]] = ins["new"]; nxt = lab[ins["ok"]]
            elif op == "ldbr":
                if mem[ins["v"]] == ins["eq"]:
                    nxt = lab[ins["to"]]
            elif op == "xchgbr":
                old = mem[ins["v"]]; mem[ins["v"]] = ins["val"]
                if ("eq" in ins and old == ins["eq"]) or ("le" in ins and old <= ins["le"]):
                    nxt = lab[ins["to"]]
            elif op == "fwait":
                if mem[ins["v"]] != ins["val"]:
                    nxt = lab[ins["then"]]
                else:
                    q("futex:" + ins["v"]).append(t); ths[t] = [pc, "B", ins["then"], None]; nxt = None
            elif op == "fwake":
                wake("futex:" + ins["v"], ins["n"])
            elif op == "enter":
                incs += 1
                if incs > 1:
                    bug = "two threads in the critical section"
            elif op == "leave":
                incs -= 1
            elif op == "enq":
                q(ins["q"]).append(t)
            elif op == "park":
                ths[t] = [pc, "B", ins["then"], None]; nxt = None
            elif op == "unpark":
                wake(ins["q"], 1)
            elif op == "set":
                mem[ins["v"]] = ins["val"]
            elif op == "mlock":
                if mem[ins["m"]] == 0:
                    mem[ins["m"]] = 1
                else:
                    q(ins["m"]).append(t); ths[t][1] = "B"; nxt = None   # retries lock when woken
            elif op == "munlock":
                mem[ins["m"]] = 0; wake(ins["m"], 1)
            elif op == "cwait":
                mem[ins["m"]] = 0; wake(ins["m"], 1)
                q(ins["c"]).append(t); ths[t] = [pc, "B", None, (ins["m"], ins["then"])]; nxt = None
            elif op == "csignal":
                if q(ins["c"]):
                    u = q(ins["c"]).pop(0); ths[u][1] = "R"
            elif op == "brv":
                if mem[ins["v"]] == ins["eq"]:
                    nxt = lab[ins["to"]]
            elif op == "incbr":
                mem[ins["v"]] += 1
                if mem[ins["v"]] < ins["lt"]:
                    nxt = lab[ins["to"]]
            elif op == "take":
                if mem[ins["v"]] == 0:
                    bug = "a consumer read an empty slot"
                mem[ins["v"]] = 0
            elif op == "done":
                ths[t][1] = "D"; nxt = None
            if nxt is not None:
                ths[t][0] = nxt
        new = (tuple(tuple(x) for x in ths), tuple(sorted(mem.items())), tuple(sorted((k, tuple(v)) for k, v in qs.items() if v)), incs)
        return new, bug

    sys.setrecursionlimit(100000)
    onstack = set()

    @lru_cache(maxsize=None)
    def count(state):
        ths = state[0]
        run = [i for i, x in enumerate(ths) if x[1] == "R"]
        if not run:
            if all(x[1] == "D" for x in ths):
                return (1, 0, 0)
            return (0, 0, 1)
        if state in onstack:
            raise RuntimeError("cycle in state space")
        onstack.add(state)
        tot = [0, 0, 0]
        for t in run:
            nxt, bug = step(state, t)
            if bug:
                tot[1] += 1
            else:
                r = count(nxt)
                tot = [a + b for a, b in zip(tot, r)]
        onstack.discard(state)
        return tuple(tot)

    ok, bug, stuck = count(start)
    return {"threads": len(names), "schedules": ok + bug + stuck, "finish": ok, "bug": bug, "asleep_forever": stuck,
            "states": count.cache_info().currsize}


def fit_poll():
    rows = []
    for line in (HERE / "runs/out/evloop.txt").read_text().splitlines():
        m = re.match(r"N (\d+) maxfd \d+ select_ns (\S+) poll_ns (\d+) epoll_ns (\d+)", line)
        if m:
            rows.append((int(m.group(1)), int(m.group(3)), int(m.group(4))))
    fit = [r for r in rows if 100 <= r[0] <= 3000]   # the linear range (10,000 descriptors falls out of the caches)
    xs = [r[0] for r in fit]; ys = [r[1] for r in fit]
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    a = my - b * mx
    ep = sorted(r[2] for r in rows)
    return {"poll_a_ns": round(a, 1), "poll_b_ns_per_fd": round(b, 2), "epoll_median_ns": ep[len(ep) // 2], "rows": rows}


out = {"lab": {}, "evloop": fit_poll()}
for sc in SPEC["scenarios"]:
    out["lab"][sc["id"]] = explore(sc)
    if sc["id"] == "futex":
        out["lab"]["futex2"] = explore(sc, 2)
(HERE / "inputs/recompute_out.json").write_text(json.dumps(out, indent=1))
for k, v in out["lab"].items():
    print(k, v)
print("poll fit", {k: v for k, v in out["evloop"].items() if k != "rows"})
