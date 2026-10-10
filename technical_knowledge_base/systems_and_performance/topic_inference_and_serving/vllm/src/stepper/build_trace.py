"""Turn the raw step recordings of vLLM v0.31.0's scheduler (inputs/trace_*.json, made by record.py inside
the CPU image) into the compact data the Scheduler stepper tab draws, with the events of each step derived
by diffing vLLM's own block pool and request state before schedule(), after schedule() and after
update_from_output(). Also checks invariants on the recording itself.

usage: python3 -I build_trace.py   (from src/stepper; writes out/stepper_data.json and ../parts/31_js_step_0data.js)
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = [  # file key, label, description
    ("pc_off", "Prefix caching off",
     "Every request computes its whole prompt, including the system prompt they all share."),
    ("pc_on", "Prefix caching on",
     "The same requests at the same steps with vLLM's default: full blocks are hashed and reused."),
    ("tight", "Tight memory, preemption",
     "Prefix caching on, a pool of 11 blocks, and answers forced to 48 tokens (ignore_eos) so that the running requests outgrow the pool: watch D and then C get preempted and come back."),
    ("nochunk", "Big budget (no chunking)",
     "Prefix caching on, budget 2,048 tokens: every prompt is prefilled in one step."),
]


def canon(rid, names):
    """Internal request ids may carry a suffix; map them back to the names given at add_request."""
    if rid in names:
        return rid
    for n in sorted(names, key=len, reverse=True):
        if rid.startswith(n + "-") or rid.startswith(n + "_"):
            return n
    return rid


def convert(raw):
    names = list(raw["requests"].keys())
    bs = raw["config"]["block_size"]
    steps = []
    last_owner = {}
    problems = []
    for k, st in enumerate(raw["steps"]):
        C = lambda r: canon(r, names)
        pre, sch, post = st["pre"], st["sched"], st["post"]
        tok = {C(r): n for r, n in st["tokens"].items()}
        budget = raw["config"]["max_num_batched_tokens"]
        if sum(tok.values()) > budget:
            problems.append(f"step {k}: {sum(tok.values())} tokens > budget {budget}")
        # owners after schedule and after the step
        own = {}
        for r, q in post["reqs"].items():
            for b in q["blk"]:
                own.setdefault(b, []).append(C(r))
        own_s = {}
        for r, q in sch["reqs"].items():
            for b in q["blk"]:
                own_s.setdefault(b, []).append(C(r))
        for b, o in own.items():
            last_owner[b] = o[0]
        for b, o in own_s.items():
            last_owner.setdefault(b, o[0])
        bpre = {b[0]: b for b in pre["blocks"]}
        bsch = {b[0]: b for b in sch["blocks"]}
        bpost = {b[0]: b for b in post["blocks"]}
        # check: ref_cnt equals number of request block tables holding it
        for bid, rc, h in post["blocks"]:
            if rc != len(own.get(bid, [])):
                problems.append(f"step {k}: block {bid} ref_cnt {rc} != holders {own.get(bid)}")
        ev = []
        preempted = [C(r) for r in st["preempted"]]
        for r in preempted:
            ev.append(["preempt", r])
        for r, nc in st["new"]:
            r = C(r)
            q = sch["reqs"].get(next(x for x in sch["reqs"] if C(x) == r))
            ev.append(["admit", r, nc, q["np"] if q else None, (q or {}).get("npre", 0)])
        newids = {C(r) for r, _ in st["new"]}
        for r, q in sch["reqs"].items():
            pq = pre["reqs"].get(r)
            if pq and pq["st"] == "PREEMPTED" and q["st"] == "RUNNING" and C(r) not in newids:
                n = st["tokens"].get(r, 0)
                ev.append(["admit", C(r), q["nc"] - n, q["np"], q["npre"]])
        evicted = [b for b in bsch if bpre[b][2] is not None and bsch[b][2] != bpre[b][2]]
        if evicted:
            ev.append(["evict", evicted])
        hits = [b for b in bsch if bpre[b][1] == 0 and bsch[b][1] > 0 and bpre[b][2] is not None and bsch[b][2] == bpre[b][2]]
        if hits:
            ev.append(["hit", hits])
        alloc = [b for b in bsch if bpre[b][1] == 0 and bsch[b][1] > 0 and b not in hits]
        if alloc:
            ev.append(["alloc", alloc])
        cached = [b for b in bpost if bsch[b][2] is None and bpost[b][2] is not None]
        cached += [b for b in bsch if bpre[b][2] is None and bsch[b][2] is not None and bpre[b][1] > 0]
        if cached:
            ev.append(["cache", sorted(set(cached))])
        fin = [C(r) for r in st.get("finished", [])]
        freed = [b for b in bpost if bsch[b][1] > 0 and bpost[b][1] == 0]
        for r in fin:
            ev.append(["finish", r])
        if freed:
            ev.append(["free", freed, [b for b in freed if bpost[b][2] is not None]])
        # tokens kind per request: prefill chunk or decode
        kind = {}
        for r, n in tok.items():
            q = next(v for x, v in sch["reqs"].items() if C(x) == r)
            kind[r] = "decode" if (q["nc"] - n) >= q["np"] else "prefill"
        reqs = {}
        for r, q in post["reqs"].items():
            reqs[C(r)] = [q["st"][0:4], q["nc"], q["nt"], q["np"], q["nout"], q["blk"], q["npre"]]
        steps.append({
            "tok": tok, "kind": kind, "ev": ev,
            "run": [C(r) for r in sch["running"]], "wait": [C(r) for r in sch["waiting"]],
            "blocks": [[b[0], b[1], b[2], (own.get(b[0]) or [last_owner.get(b[0])])[0]] for b in post["blocks"]],  # compacted below
            "free": post["free"], "usage": post["usage"], "reqs": reqs,
        })
    req = {}
    for n, r in raw["requests"].items():
        req[n] = {"np": r["n_prompt"], "pieces": r["pieces"], "at": r["added_at_step"], "answer": r["answer"]}
    # compact: blocks in id order as [ref_cnt, hash index or -1, owner index or -1]; hashes in a table
    H = []
    hidx = {}
    for st in steps:
        ids = [b[0] for b in st["blocks"]]
        assert ids == list(range(1, len(ids) + 1)), ids
        cb = []
        for _, rc, h, o in st["blocks"]:
            if h is not None and h not in hidx:
                hidx[h] = len(H); H.append(h)
            cb.append([rc, hidx[h] if h is not None else -1, names.index(o) if o in names else -1])
        st["blocks"] = cb
    return {"cfg": raw["config"], "steps": steps, "req": req, "bs": bs, "H": H, "names": names}, problems


def summary(d):
    tot = sum(sum(s["tok"].values()) for s in d["steps"])
    pre = sum(1 for s in d["steps"] for e in s["ev"] if e[0] == "preempt")
    hit = sum(e[2] for s in d["steps"] for e in s["ev"] if e[0] == "admit")
    ev = sum(len(e[1]) for s in d["steps"] for e in s["ev"] if e[0] == "evict")
    prompt = sum(r["np"] for r in d["req"].values())
    return {"steps": len(d["steps"]), "tokens_computed": tot, "preemptions": pre, "hit_tokens": hit,
            "evicted_blocks": ev, "prompt_tokens": prompt}


if __name__ == "__main__":
    out = {"runs": [], "system": None}
    allprob = []
    for key, label, desc in RUNS:
        p = os.path.join(HERE, "inputs", f"trace_{key}.json")
        if not os.path.exists(p):
            print("missing", p, file=sys.stderr)
            continue
        raw = json.load(open(p))
        d, prob = convert(raw)
        allprob += [f"{key}: {x}" for x in prob]
        d.update({"key": key, "label": label, "desc": desc, "sum": summary(d)})
        out["runs"].append(d)
        out["system"] = raw["system"]
        out["users"] = raw["users"]
        out["follow"] = raw["follow"]
    # share identical token texts between runs, and write blocks as "rc.h.o" strings
    texts = {}
    for r in out["runs"]:
        for q in r["req"].values():
            key = json.dumps(q["pieces"])
            if key not in texts:
                texts[key] = len(texts)
            q["t"] = texts[key]
            del q["pieces"]
        for st in r["steps"]:
            st["blocks"] = ",".join("%d.%d.%d" % tuple(b) for b in st["blocks"])
    out["texts"] = [json.loads(k) for k in texts]
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, "out", "stepper_data.json"), "w"), separators=(",", ":"))
    with open(os.path.join(HERE, "..", "parts", "200_js_vl_stepdata.js"), "w") as f:
        f.write("// generated by src/stepper/build_trace.py from inputs/trace_*.json (vLLM v0.31.0 recordings)\n")
        f.write("window.VL_STEP=" + json.dumps(out, separators=(",", ":")) + ";\n")
    for r in out["runs"]:
        print(r["key"], r["sum"])
    print("invariant problems:", len(allprob))
    for x in allprob[:20]:
        print("  ", x)
