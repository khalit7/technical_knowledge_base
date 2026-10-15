"""Counting helpers for jaxprs, StableHLO and HLO text (Compiler lab). Pure text parsing, no JAX state."""
import collections
import re


def jaxpr_counts(closed):
    """Primitive counts of a ClosedJaxpr: top level, and recursive with nested jaxprs inlined.
    Wrappers that only hold a sub-jaxpr (pjit/jit, custom_jvp_call, custom_vjp_call, closed_call) are not counted
    themselves when inlining; their bodies are."""
    import jax.core as jc  # noqa: F401
    wrappers = {"pjit", "jit", "custom_jvp_call", "custom_vjp_call", "custom_vjp_call_jaxpr", "closed_call",
                "core_call", "remat", "checkpoint"}
    top = collections.Counter(e.primitive.name for e in closed.jaxpr.eqns)
    flat = collections.Counter()

    def subjaxprs(eqn):
        for v in eqn.params.values():
            vs = v if isinstance(v, (tuple, list)) else [v]
            for u in vs:
                j = getattr(u, "jaxpr", None)
                if j is not None and hasattr(j, "eqns"):
                    yield j
                elif hasattr(u, "eqns"):
                    yield u

    def walk(j):
        for e in j.eqns:
            subs = list(subjaxprs(e))
            if e.primitive.name in wrappers and subs:
                for s in subs:
                    walk(s)
            else:
                flat[e.primitive.name] += 1
                for s in subs:     # scan / cond / while bodies: count the body once (it is one program region)
                    walk(s)
    walk(closed.jaxpr)
    return {"top_eqns": sum(top.values()), "top_by_prim": dict(top.most_common()),
            "flat_eqns": sum(flat.values()), "flat_by_prim": dict(flat.most_common()),
            "n_invars": len(closed.jaxpr.invars), "n_outvars": len(closed.jaxpr.outvars)}


STABLEHLO_OP = re.compile(r"\b(stablehlo|chlo|func|mhlo|sdy|shardy)\.([a-z_0-9]+)")


def stablehlo_counts(txt):
    ops = collections.Counter()
    funcs = 0
    for line in txt.splitlines():
        s = line.strip()
        if s.startswith("func.func"):
            funcs += 1
            continue
        if s.startswith("module") or s.startswith("}") or s.startswith("//") or not s:
            continue
        m = STABLEHLO_OP.search(s)
        if m:
            ops[m.group(1) + "." + m.group(2)] += 1
    return {"ops": sum(v for k, v in ops.items() if k not in ("func.return", "stablehlo.return")),
            "ops_incl_return": sum(ops.values()), "by_op": dict(ops.most_common()), "funcs": funcs,
            "lines": len(txt.splitlines()), "bytes": len(txt.encode())}


HLO_INSTR = re.compile(r"^\s*(ROOT\s+)?(%?[\w.\-]+)\s*=\s*(.+?)\s+([a-z][a-z0-9\-_]*)\(")


def parse_hlo(txt):
    """-> list of computations: {name, entry, fused, instrs: [{name, opcode, kind, calls, meta_op, src}]}"""
    comps = []
    cur = None
    for line in txt.splitlines():
        if not line.strip():
            continue
        if not line.startswith(" ") and line.rstrip().endswith("{") and not line.startswith("HloModule"):
            head = line.strip()
            entry = head.startswith("ENTRY")
            name = head.split()[1] if entry else head.split()[0]
            cur = {"name": name.lstrip("%"), "entry": entry, "instrs": []}
            comps.append(cur)
            continue
        if line.startswith("}"):
            cur = None
            continue
        if cur is None:
            continue
        m = HLO_INSTR.match(line)
        if not m:
            continue
        ins = {"name": m.group(2).lstrip("%"), "opcode": m.group(4), "root": bool(m.group(1))}
        k = re.search(r"kind=(k\w+)", line)
        if k:
            ins["kind"] = k.group(1)
        c = re.search(r"calls=%?([\w.\-]+)", line)
        if c:
            ins["calls"] = c.group(1)
        mo = re.search(r'op_name="([^"]*)"', line)
        if mo:
            ins["meta_op"] = mo.group(1)
        sf = re.search(r'source_file="([^"]*)"\s+source_line=(\d+)', line)
        if sf:
            ins["src"] = sf.group(1).split("/")[-1] + ":" + sf.group(2)
        cur["instrs"].append(ins)
    called = {i.get("calls") for c in comps for i in c["instrs"] if i["opcode"] == "fusion"}
    # reduction combiners (add or max of two parameters, reached through to_apply= from reduce, scatter, sort or
    # all-reduce) are bodies applied inside their caller's kernel, not kernels of their own
    applied = set(re.findall(r"to_apply=%?([\w.\-]+)", txt))
    for c in comps:
        c["fused"] = c["name"] in called
        c["applied"] = c["name"] in applied and not c["fused"]
    return comps


TRIVIAL = {"parameter", "constant", "get-tuple-element", "tuple", "bitcast", "copy-start", "copy-done"}


def hlo_counts(txt):
    comps = parse_hlo(txt)
    entry = [c for c in comps if c["entry"]]
    entry = entry[0] if entry else {"instrs": []}
    allins = [i for c in comps for i in c["instrs"]]
    ent_ops = collections.Counter(i["opcode"] for i in entry["instrs"])
    fusions = [i for i in entry["instrs"] if i["opcode"] == "fusion"]
    # fusions can also sit inside while bodies (scan): count every fusion instruction outside fused computations
    nonfused = [c for c in comps if not c.get("fused")]
    all_fusions = [i for c in nonfused for i in c["instrs"] if i["opcode"] == "fusion"]
    kinds = collections.Counter(i.get("kind", "?") for i in all_fusions)
    by_name = {c["name"]: c for c in comps}
    cats = collections.Counter()
    merged = 0
    for f in all_fusions:
        body = by_name.get(f.get("calls"), {"instrs": []})["instrs"]
        n = sum(1 for i in body if i["opcode"] not in TRIVIAL)
        f["n_ops"] = n
        if "ynn" in f["name"]:
            cats["library (YNNPACK) fusion"] += 1
        elif n <= 1:
            cats["single op"] += 1
        else:
            cats["multi-op loop fusion"] += 1
        merged += n
    toplevel = [c for c in nonfused if not c.get("applied")]
    work = [i for c in toplevel for i in c["instrs"] if i["opcode"] not in TRIVIAL]
    reducer_ops = [i for c in nonfused if c.get("applied") for i in c["instrs"] if i["opcode"] not in TRIVIAL]
    return {"computations": len(comps), "fused_computations": sum(1 for c in comps if c.get("fused")),
            "instructions_total": len(allins),
            "entry_instructions": len(entry["instrs"]),
            "entry_by_op": dict(ent_ops.most_common()),
            "fusions_entry": len(fusions), "fusions_all": len(all_fusions), "fusion_kinds": dict(kinds.most_common()),
            "fusion_categories": dict(cats.most_common()), "ops_inside_fusions": merged,
            "fusions_multi": sum(1 for f in all_fusions if f.get("n_ops", 0) >= 2),
            "kernels": len(work),   # instructions that run as their own kernel: fusions, dots, custom calls, etc.
            "reducer_bodies": len(reducer_ops),   # combiner instructions behind to_apply=, not kernels (before 2026-10-15 counted in "kernels")
            "kernels_by_op": dict(collections.Counter(i["opcode"] for i in work).most_common()),
            "lines": len(txt.splitlines()), "bytes": len(txt.encode())}
