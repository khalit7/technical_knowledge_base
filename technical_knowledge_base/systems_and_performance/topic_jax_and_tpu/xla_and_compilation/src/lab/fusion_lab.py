"""Fusion, measured: what XLA:CPU fused in the train step, why it refused the rest, and small programs that break fusion.

Parts (each run in a fresh process because XLA_FLAGS and the C++ log level are read at start-up):
  catalog   every fusion of the optimised train step: kind, operations inside, root, phase (forward, backward,
            optimiser) and the model function it came from (from the stack frames XLA keeps in metadata)
  decisions the fusion pass's own log (TF_CPP_VMODULE=cpu_instruction_fusion=2,instruction_fusion=3) on the train
            step and on each small program: every accept or refuse with XLA's reason string, counted
  breakers  small programs under three settings: default; YNNPACK library fusion off
            (--xla_cpu_experimental_ynn_fusion_type=-individual_dot,-individual_convolution,-reduce); fusion pass off
            (--xla_disable_hlo_passes=fusion)
  stepflags the train step under the same three settings: kernels, bytes accessed, temp memory
Outputs: lab/out/fusion_lab.json (merged from the parts)
"""
import collections
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

C = X.C
SETTINGS = {
    "default": "",
    "no_library": "--xla_cpu_experimental_ynn_fusion_type=-individual_dot,-individual_convolution,-reduce",
    "no_fusion": "--xla_disable_hlo_passes=fusion",
}
PART = os.path.join(X.big("fusion", "x").rsplit("/", 1)[0])
WORK = {"parameter", "constant", "tuple", "get-tuple-element", "bitcast"}

# ------------------------------------------------------------------ small programs that keep or break fusion
BREAKERS = [
    ("chain", "An elementwise chain", "def f(x):\n    return jnp.tanh(x * 2.0 + 1.0) * 3.0", "x"),
    ("softmax", "Softmax over the last axis", "def f(x):\n    return jax.nn.softmax(x, axis=-1)", "x"),
    ("layernorm", "LayerNorm (two reductions)", "def f(x):\n    mu = x.mean(-1, keepdims=True)\n    var = ((x - mu) ** 2).mean(-1, keepdims=True)\n    return (x - mu) / jnp.sqrt(var + 1e-5)", "x"),
    ("matmul_gelu", "Matmul, bias, GELU", "def f(x, w, b):\n    return jax.nn.gelu(x @ w + b, approximate=False)", "xwb"),
    ("exp_two_users", "An expensive value with two users", "def f(x):\n    e = jnp.exp(x)\n    return (e + 1.0).sum(-1), (e * 2.0).max(-1)", "x"),
    ("mul_two_users", "A cheap value with two users", "def f(x):\n    e = x * 2.0\n    return (e + 1.0).sum(-1), (e * 3.0).max(-1)", "x"),
    ("debug_print", "jax.debug.print in the middle", "def f(x):\n    y = x * 2.0\n    jax.debug.print('{}', y[0, 0])\n    return jnp.tanh(y) + 1.0", "x"),
    ("barrier", "An optimization barrier in the middle", "def f(x):\n    y = jax.lax.optimization_barrier(x * 2.0)\n    return jnp.tanh(y) + 1.0", "x"),
    ("loop", "A fori_loop", "def f(x):\n    return jax.lax.fori_loop(0, 4, lambda i, h: jnp.tanh(h) * 0.5 + 1.0, x)", "x"),
    ("sort", "A sort in the middle", "def f(x):\n    return jnp.sort(x * 2.0, axis=-1) + 1.0", "x"),
    ("concat", "Concatenating 10 pieces", "def f(x):\n    return jnp.concatenate([x * i for i in range(10)], axis=0) + 1.0", "x"),
    ("const_array", "Adding a large constant array", "def f(x):\n    return x + np.arange(x.size, dtype=np.float32).reshape(x.shape)", "x"),
    ("gather", "Embedding lookup then scale", "def f(e, i):\n    return e[i] * 2.0 + 1.0", "ei"),
]


def arrays(kind):
    import jax
    import jax.numpy as jnp
    k = jax.random.key(0)
    if kind == "x":
        return (jax.random.normal(k, (256, 512), jnp.float32),)
    if kind == "xwb":
        return (jax.random.normal(k, (256, 128), jnp.float32), jax.random.normal(k, (128, 512), jnp.float32),
                jnp.zeros((512,), jnp.float32))
    if kind == "ei":
        return (jax.random.normal(k, (65, 128), jnp.float32), jnp.zeros((32, 128), jnp.int32))
    raise ValueError(kind)


def kernels_of(txt):
    comps = X.HT.parse_hlo(txt)
    entry = [c for c in comps if c["entry"]][0]
    called = {}
    for c in comps:
        called[c["name"]] = c
    out = []
    for i in entry["instrs"]:
        if i["opcode"] in WORK:
            continue
        rec = {"op": i["opcode"]}
        if i["opcode"] == "fusion":
            body = called.get((i.get("calls") or "").lstrip("%"))
            ops = [j["opcode"] for j in body["instrs"] if j["opcode"] not in ("parameter",)] if body else []
            rec.update(kind=i.get("kind"), ops=ops, name=i["name"])
        out.append(rec)
    return out


def marker(s):
    sys.stderr.write("\n@@XP@@ %s\n" % s)
    sys.stderr.flush()


def run_breakers(setting):
    import jax
    import jax.numpy as jnp  # noqa: F401
    import numpy as np  # noqa: F401
    res = {}
    for key, title, code, kind in BREAKERS:
        ns = {"jax": jax, "jnp": jnp, "np": np}
        exec(code, ns)
        args = arrays(kind)
        marker("begin " + key)
        co = jax.jit(ns["f"]).lower(*args).compile()
        marker("end " + key)
        txt = co.as_text()
        ks = kernels_of(txt)
        ca = co.cost_analysis() or {}
        res[key] = {"kernels": len(ks), "list": ks, "bytes_accessed": ca.get("bytes accessed"),
                    "hlo": X.scrub(X.hlo_no_tables(txt)) if setting == "default" else None}
    return res


def phase_and_fn(txt):
    """op_name and model function per instruction name, via the stack-frame tables of the optimised HLO."""
    def table(name, nxt):
        if name not in txt:
            return ""
        return txt.split("\n" + name + "\n", 1)[1].split("\n\n", 1)[0]
    fnames = dict(re.findall(r'^(\d+) "([^"]*)"$', table("FunctionNames", "FileLocations"), re.M))
    floc = {m.group(1): fnames.get(m.group(2), "?") for m in
            re.finditer(r"^(\d+) \{file_name_id=\d+ function_name_id=(\d+)", table("FileLocations", ""), re.M)}
    frames = {m.group(1): (m.group(2), m.group(3)) for m in
              re.finditer(r"^(\d+) \{file_location_id=(\d+) parent_frame_id=(\d+)", table("StackFrames", ""), re.M)}
    model_fns = ["attention", "mlp", "layer_norm", "linear", "apply", "loss_fn", "train_step"]

    def fn_of(fid):
        chain = []
        seen = set()
        while fid in frames and fid not in seen:
            seen.add(fid)
            loc, parent = frames[fid]
            chain.append(floc.get(loc, "?"))
            fid = parent
        for c in chain:                      # innermost model function first
            if c in model_fns[:4]:
                return c
        for c in chain:
            if c not in ("<module>", "train_step", "?", "f"):
                return c
        return chain[0] if chain else "?"
    out = {}
    for m in re.finditer(r"^\s*(?:ROOT\s+)?%?([\w.\-]+) = .*?metadata=\{([^{}]*)\}", txt, re.M):
        meta = m.group(2)
        op = re.search(r'op_name="([^"]*)"', meta)
        sf = re.search(r"stack_frame_id=(\d+)", meta)
        opn = op.group(1) if op else ""
        ph = "backward" if "transpose(" in opn else ("forward" if "jvp(" in opn else "optimiser")
        out[m.group(1)] = {"op_name": opn, "phase": ph, "fn": fn_of(sf.group(1)) if sf else "?"}
    return out


def run_step(setting):
    import jax  # noqa: F401
    import model_jax as MJ
    cfg = C.CFG
    params, tx, opt, xb, yb = X.setup_state()
    step = MJ.make_train_step(cfg, tx)
    marker("begin step")
    co = step.lower(params, opt, xb, yb).compile()
    marker("end step")
    txt = co.as_text()
    ks = kernels_of(txt)
    ca = co.cost_analysis() or {}
    ma = co.memory_analysis()
    rec = {"kernels": len(ks), "fusions": sum(1 for k in ks if k["op"] == "fusion"),
           "kinds": dict(collections.Counter(k.get("kind") for k in ks if k["op"] == "fusion")),
           "non_fusion": dict(collections.Counter(k["op"] for k in ks if k["op"] != "fusion")),
           "bytes_accessed": ca.get("bytes accessed"), "flops": ca.get("flops"),
           "temp_bytes": ma.temp_size_in_bytes, "total_allocation_bytes": ma.total_allocation_bytes}
    if setting == "default":
        info = phase_and_fn(txt)
        cat = []
        for k in ks:
            if k["op"] != "fusion":
                continue
            inf = info.get(k["name"], {})
            ops = k["ops"]
            root = ops[-1] if ops else ""
            cat.append([k["name"], k.get("kind"), len(ops), root, inf.get("phase", "?"), inf.get("fn", "?"),
                        " ".join(o for o, _ in collections.Counter(ops).most_common(5))])
        rec["catalog"] = cat
        # full text of a few representative fusions, picked by rule (largest of each kind and phase)
        comps = {c["name"]: c for c in X.HT.parse_hlo(txt)}
        bodies = {}
        lines = X.hlo_no_tables(txt).splitlines()
        for name in pick_examples(cat):
            body_name = None
            for l in lines:
                if re.match(r"\s*(ROOT\s+)?%" + re.escape(name) + r" = ", l):
                    mm = re.search(r"calls=%([\w.\-]+)", l)
                    body_name = mm.group(1) if mm else None
                    head = X.strip_meta(l.strip())
                    break
            if not body_name:
                continue
            blk, on = [], False
            for l in lines:
                if l.startswith("%" + body_name + " ") or l.startswith(body_name + " "):
                    on = True
                if on:
                    blk.append(X.strip_meta(l))
                    if l.startswith("}"):
                        break
            bodies[name] = {"call": X.scrub(head)[:400], "body": [X.scrub(b)[:200] for b in blk[:40]],
                            "truncated": max(0, len(blk) - 40)}
        rec["examples"] = bodies
    return rec


def pick_examples(cat):
    picks = []
    groups = collections.defaultdict(list)
    for r in cat:
        groups[(r[1], r[4])].append(r)
    for key, rs in sorted(groups.items()):
        rs.sort(key=lambda r: -r[2])
        picks += [r[0] for r in rs[:2]]
    for r in cat:                              # one LayerNorm-backward and one Adam update if present
        if r[5] == "layer_norm" and r[4] == "backward" and r[0] not in picks:
            picks.append(r[0])
            break
    return picks[:16]


def child(part, setting):
    out = {}
    if part in ("breakers",):
        out = run_breakers(setting)
    elif part == "step":
        out = run_step(setting)
    with open(os.path.join(PART, "%s_%s.json" % (part, setting)), "w") as f:
        json.dump(out, f)


DEC_RX = re.compile(r"\] (Fusion rejected: [^']*'|Fusing: [^\n]*|Fusion OK: [^\n]*|Fusing small matrix-vector product)")


def parse_log(log):
    """Segment the C++ log by our markers; count accept/refuse reasons inside each segment."""
    segs = collections.defaultdict(collections.Counter)
    examples = collections.defaultdict(dict)
    cur = None
    pending = None
    for line in log.splitlines():
        if line.startswith("@@XP@@ begin "):
            cur = line.split()[-1]
            continue
        if line.startswith("@@XP@@ end "):
            cur = None
            continue
        if cur is None:
            continue
        if "Considering for fusion:" in line:
            pending = re.sub(r",? metadata=\{[^{}]*\}", "", line.split("Considering for fusion: ", 1)[1])[:200]
            continue
        m = re.search(r"\] (Fusing: .*|Fusion OK: .*|Fusing small matrix-vector product\.)$", line)
        if m:
            r = "accept: " + m.group(1)
            segs[cur][r] += 1
            examples[cur].setdefault(r, pending)
            continue
        m = re.search(r"\] not fusing operand (.*?) because (.*)$", line)
        if m:
            r = "refuse: " + m.group(2).strip()
            segs[cur][r] += 1
            examples[cur].setdefault(r, re.sub(r",? metadata=\{[^{}]*\}", "", m.group(1))[:200] + "  INTO  " + (pending or "")[:160])
            continue
        m = re.search(r"\] Operand \((.*)\) is not fusible$", line)
        if m:
            op = re.search(r"\s([a-z][a-z0-9\-_]*)\(", m.group(1))
            r = "not fusible: " + (op.group(1) if op else "?")
            segs[cur][r] += 1
            examples[cur].setdefault(r, re.sub(r",? metadata=\{[^{}]*\}", "", m.group(1))[:200])
            continue
        m = re.search(r"Fusion rejected: (.*)$", line)
        if m:
            r = "refuse: " + re.sub(r"'[^']*'", "X", m.group(1))
            segs[cur][r] += 1
            examples[cur].setdefault(r, pending)
    return segs, examples


def parent():
    os.makedirs(PART, exist_ok=True)
    res = {"versions": X.versions(), "settings": SETTINGS, "load1": X.load1()}
    logs = {}
    for setting, flags in SETTINGS.items():
        for part in ("breakers", "step"):
            env = dict(os.environ)
            env["XLA_FLAGS"] = flags
            vlog = setting == "default"
            if vlog:
                env["TF_CPP_MIN_LOG_LEVEL"] = "0"
                env["TF_CPP_VMODULE"] = "cpu_instruction_fusion=2,instruction_fusion=3"
            p = subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), "_child", part, setting],
                               env=env, capture_output=True, text=True)
            if p.returncode:
                print(p.stderr[-3000:])
                raise SystemExit("child failed: %s %s" % (part, setting))
            if vlog:
                logs[part] = p.stderr
            print("done", part, setting)
    res["breakers"] = {}
    res["step"] = {}
    for setting in SETTINGS:
        res["breakers"][setting] = json.load(open(os.path.join(PART, "breakers_%s.json" % setting)))
        res["step"][setting] = json.load(open(os.path.join(PART, "step_%s.json" % setting)))
    dec = {}
    exs = {}
    for part, log in logs.items():
        with open(os.path.join(PART, "vlog_%s.txt" % part), "w") as f:
            f.write(log)
        s, e = parse_log(log)
        for k, v in s.items():
            dec[k] = dict(v.most_common())
            exs[k] = {r: X.scrub(t or "") for r, t in e[k].items()}
    res["decisions"] = dec
    res["decision_examples"] = exs
    res["breaker_meta"] = [{"key": k, "title": t, "code": c} for k, t, c, _ in BREAKERS]
    X.save("fusion_lab.json", res)
    for k in [b[0] for b in BREAKERS]:
        print("%-14s" % k, {s: res["breakers"][s][k]["kernels"] for s in SETTINGS}, dict(list(dec.get(k, {}).items())[:4]))
    for s in SETTINGS:
        st = res["step"][s]
        print("step", s, st["kernels"], st["fusions"], st["kinds"], st["bytes_accessed"], st["temp_bytes"])
    print("step decisions:", dec.get("step"))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "_child":
        child(sys.argv[2], sys.argv[3])
    else:
        parent()
