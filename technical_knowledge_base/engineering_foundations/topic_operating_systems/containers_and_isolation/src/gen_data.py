"""Parse raw/ into parts/22_js_data.js (window.CT_DATA). Every number the page draws comes from here."""
import json, re, pathlib, statistics
R = pathlib.Path("raw"); D = {}
txt = lambda n: (R / n).read_text()

def sections(s):
    """Split '### title' sections into [(title, body)]."""
    out = []
    for part in re.split(r"^### ", s, flags=re.M)[1:]:
        head, _, body = part.partition("\n")
        out.append((head.strip(), body.rstrip("\n")))
    return out

D["env_txt"] = txt("env.txt").strip()

# The hand-built container: one view per step
steps = []
for head, body in sections(txt("minictr.txt")):
    m = re.match(r"S(\d+) (.*)", head)
    if not m: continue
    kv, tries, rest = {}, [], []
    for line in body.splitlines():
        t = re.match(r"try (.*?): (.*)$", line)
        if t: tries.append([t[1], t[2]]); continue
        k = re.match(r"^([A-Za-z_]+): (.*)$", line)
        if k and int(m[1]) < 9: kv[k[1]] = k[2]
        else: rest.append(line)
    steps.append(dict(n=int(m[1]), title=m[2], kv=kv, tries=tries, out="\n".join(rest).strip()))
D["mini"] = steps
mt = txt("minictr.txt")
D["mini_upper"] = mt[mt.index("### after:"):].split("\n", 1)[1].strip()

# Namespace creation cost
c = txt("cost.txt"); ns = []
for line in c.splitlines():
    m = re.match(r"^(none|uts|ipc|pid|mnt|cgroup|time|user|net|all but user)\s+([\d.]+)\s+([\d.]+)\s+(\d+)$", line)
    if m: ns.append(dict(k=m[1], med=float(m[2]), p90=float(m[3]), fails=int(m[4])))
D["nscost"] = ns
D["cmdcost"] = [dict(med=float(m[1]), mn=float(m[2]), cmd=m[3]) for m in re.finditer(r"median_ms ([\d.]+) min_ms ([\d.]+)  (.*)", c)]

# cgroup experiments
cg = txt("cgroup.txt"); S = dict(sections(cg)); D["cg_deleg"] = S["delegation: the container's cgroup namespace root"]
mem = {}
for head, body in sections(cg):
    m = re.match(r"memory (max|high|highswap): (.*?); allocate", head)
    if not m: continue
    pts = [list(map(int, l.split())) for l in body.splitlines() if re.match(r"^\d+ \d+ \d+$", l)]
    ev = dict(re.findall(r"(\w+) (\d+)", re.search(r"memory.events: (.*)", body)[1]))
    st = dict(re.findall(r"(\w+) (\d+)", body.splitlines()[-1]))
    mem[m[1]] = dict(cfg=m[2], pts=pts, exit=int(re.search(r"exit status (\d+)", body)[1]),
                     done="done" in body.split(), ev={k: int(v) for k, v in ev.items()}, stat={k: int(v) for k, v in st.items()},
                     txt=f"### {head}\n{body}")
D["mem"] = mem
oomg = []
for head, body in sections(cg):
    m = re.match(r"memory.oom.group=(\d)", head)
    if m: oomg.append(dict(g=int(m[1]), worker=int(re.search(r"worker exit status (\d+)", body)[1]),
                           main="killed too" in body, txt=f"### {head}\n{body}"))
D["oomg"] = oomg
io = [b for h, b in sections(cg) if h.startswith("io.max")][0]
D["io_txt"] = io
D["io"] = [dict(s=float(m[1]), rate=m[2]) for m in re.finditer(r"copied, ([\d.]+) s, ([\d.]+ [GM]B/s)", io)]
fz = [b for h, b in sections(cg) if h.startswith("cgroup.freeze")][0]
D["fz_txt"] = fz
D["fz"] = [[float(a), int(b)] for a, b in re.findall(r"^([\d.]+) (\d+)$", fz, re.M)]

# docker stop matrix
stop = []
for head, body in sections(txt("stop_matrix.txt")):
    m = re.match(r"(\w+): docker run (.*)", head)
    if not m: D["dash_pid"] = int(body.strip()); continue
    s = re.search(r"stop_to_exit_s ([\d.]+) exit_code (\d+)", body)
    log = [l.strip() for l in body.splitlines() if re.match(r"^\s+[+-][\d.]+ s", l)]
    stop.append(dict(id=m[1], cmd="docker run " + m[2], s=float(s[1]), code=int(s[2]),
                     ckpt=re.search(r"checkpoint file: (.*)", body)[1], log=log,
                     term=any("SIGTERM received" in l for l in log), saved=any("checkpoint saved" in l for l in log)))
D["stop"] = stop

# seccomp
sc = txt("seccomp.txt"); probes = {}; cost = {"unconfined": {}, "default": {}}
for head, body in sections(sc):
    if head.startswith("probe:"):
        key = "none" if "unconfined" in head else "d25" if "25.0.0" in head else "d20"
        rows = []
        for line in body.splitlines()[1:]:
            if line.startswith("  child: "): rows.append(["ptrace(PTRACE_TRACEME) in a child", line[9:]]); continue
            m2 = re.match(r"^(\S.*?)\s{2,}(\S.*)$", line)
            if m2: rows.append([m2[1], m2[2]])
        probes[key] = dict(head=head[7:], seccomp=re.search(r"Seccomp:\s+(\d)", body)[1], rows=rows)
    elif head.startswith("cost"):
        key = "unconfined" if "unconfined" in head else "default"
        for k, v in re.findall(r"added_filters (\d+) ns_per_getppid ([\d.]+)", body):
            cost[key].setdefault(k, []).append(float(v))
D["sc_probe"] = probes
D["sc_cost"] = {k: {n: round(statistics.median(v), 1) for n, v in d.items()} for k, d in cost.items()}
D["sc_cost_runs"] = cost

# io_uring per UID
D["uring"] = [dict(head=h, uid=int(m[1]), lim=int(m[2]), rings=int(m[4]), why=m[5]) for h, b in sections(txt("uring.txt"))
              for m in [re.search(r"uid (\d+) memlock_limit_kib (\d+) page_kib (\d+) rings_created (\d+) then: (.*)", b)] if m]
D["uring_txt"] = txt("uring.txt").strip()

# capabilities
caps = []
for head, body in sections(txt("caps.txt")):
    if head.startswith("why"): D["port_sysctl"] = body.strip(); continue
    ce = re.search(r"CapEff (\w+)", body)[1]
    ops = [[a.strip(), b.strip()] for a, b in re.findall(r"^(.*\))\s+(\S.*)$", body, re.M)]
    caps.append(dict(head=head, capeff=ce, ops=ops))
D["caps"] = caps
D["userns_txt"] = txt("userns.txt").strip()
D["image_txt"] = txt("image.txt").strip()
D["runtime_txt"] = txt("runtime.txt").strip()
it = D["image_txt"]
D["copyup"] = [float(x) for x in re.findall(r"write \d: ([\d.]+) ms", it)]
D["starts"] = [float(x) for x in re.findall(r"^(\d+\.\d+)$", D["runtime_txt"], re.M)]

out = "window.CT_DATA=" + json.dumps(D, separators=(",", ":")) + ";\n"
pathlib.Path("parts/22_js_data.js").write_text(out)
print("wrote parts/22_js_data.js", len(out), "bytes")
