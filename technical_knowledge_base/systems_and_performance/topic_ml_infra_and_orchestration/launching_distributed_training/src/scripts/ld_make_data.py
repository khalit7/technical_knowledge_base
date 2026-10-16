"""ld_make_data.py: turn this page's recorded runs into the data the page embeds.
usage: python3 ld_make_data.py <evidence dir>      (the scratch evidence; scrubbed copies go to ../runs/)
writes ../out/data.json and ../parts/22_js_ld_data.js (window.LD = ...).
Evidence layout: rz/<scenario>/{events.txt, agent_A.out, agent_B.out[, agent_C.out], logs/rank<r>.jsonl},
hang/<case>_<OFF|DETAIL>/{events.txt, out.txt, pyspy_<pid>.txt, dump/stacks_<r>.txt}, detail/*.txt, net/*.
"""
import json, os, re, shutil, statistics as st, sys

EV = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
RUNS = os.path.join(SRC, "runs")
IPS = {}
NAMES = {}  # docker bridge and veth ids -> br-a, br-b, veth1, ... (stable within one run of this script)


def scrub(s):
    def ip(m):
        a = m.group(0)
        if a.startswith("127."):
            return a
        IPS.setdefault(a, f"<ip-{len(IPS) + 1}>")
        return IPS[a]
    s = re.sub(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", ip, s)
    s = re.sub(r"br-[0-9a-f]{12}", lambda m: NAMES.setdefault(m.group(0), "br-" + "abcdefghij"[sum(k.startswith("br-") for k in NAMES)]), s)
    s = re.sub(r"veth[0-9a-f]{7}", lambda m: NAMES.setdefault(m.group(0), "veth" + str(sum(k.startswith("veth") for k in NAMES) + 1)), s)
    s = re.sub(r"/(Users|private)/[^\s:'\"]*", "<path>", s)
    return s


def events(path):
    out = {}
    for l in open(path):
        w = l.split()
        out["_".join(w[:-1])] = float(w[-1])
    return out


def objs(text):
    """every JSON object printed as {"ev": ...}, even when two ranks' lines interleave on one line"""
    dec, r, i = json.JSONDecoder(), [], 0
    while True:
        i = text.find('{"ev"', i)
        if i < 0:
            return r
        try:
            o, j = dec.raw_decode(text, i); r.append(o); i = j
        except ValueError:
            i += 1


def jl(path):
    return objs(open(path, errors="replace").read()) if os.path.exists(path) else []


# ---------- rendezvous scenarios ----------
NODE = re.compile(r"'?127\.0\.0\.1_(\d+)_0'?")
AGENT_LINE = re.compile(r"^[IWE]\d{4} (\d\d):(\d\d):(\d\d\.\d+) \d+ \S+\] (.*)$")


def utc_of(ev_start, hh, mm, ss):
    """agent log lines carry UTC wall time of day; rebuild unix time from the run's start (same day)."""
    day = ev_start - (ev_start % 86400)
    t = day + int(hh) * 3600 + int(mm) * 60 + float(ss)
    if t < ev_start - 43200:
        t += 86400
    return t


def rz(scn, agents):
    d = os.path.join(EV, "rz", scn)
    E = events(os.path.join(d, "events.txt"))
    t0 = E["start"]
    out = []
    seen = set()
    for a in agents:
        f = os.path.join(d, f"agent_{a}.out")
        for line in open(f, errors="replace"):
            line = line.rstrip("\n")
            m = re.match(r"^(\d+\.\d+) LD(EV|DBG) (.*)$", line)
            if m:
                t = float(m.group(1))
                if m.group(2) == "EV":
                    rec = json.loads(m.group(3)); msg = rec["message"]
                else:
                    msg = m.group(3)
                key = (round(t, 2), msg)
                if key in seen:
                    continue
                seen.add(key)
                out.append({"t": t, "who": a, "src": "rdzv", "msg": msg})
                continue
            m = re.match(r"^\[[WE]\d{4} (\d\d):(\d\d):(\d\d\.\d+) (?:\d+ )?\S+\] (.*)$", line)
            if m and ("timed out after" in m.group(4) and "waitForInput: socket" in m.group(4) or "connectFullMesh failed" in m.group(4)):
                out.append({"t": utc_of(t0, *m.groups()[:3]), "who": a, "src": "agent", "msg": m.group(4)[:300]})
                continue
            m = AGENT_LINE.match(line)
            if m:
                msg = m.group(4)
                if any(k in msg for k in ("Detected", "Worker group FAILED", "Rendezvous complete for workers",
                                          "group_world_size=", "Rendezvous'ing worker group", "master_port=",
                                          "group_rank=", "worker group successfully finished")):
                    out.append({"t": utc_of(t0, *m.groups()[:3]), "who": a, "src": "agent", "msg": msg})
            elif ("Error" in line and ("DistStoreError" in line or "RuntimeError" in line or "RendezvousTimeoutError" in line
                                        or "DistNetworkError" in line)) and not line.startswith("[rank"):
                out.append({"t": None, "who": a, "src": "error", "msg": line.strip()[:400]})
    # node descriptors -> agent letters, from "The node '127.0.0.1_<pid>_0' attempts to join"
    names = {}
    for e in out:
        m = re.match(r"The node '127\.0\.0\.1_(\d+)_0' attempts to join", e["msg"])
        if m:
            names[m.group(1)] = e["who"]
    for e in out:
        e["msg"] = NODE.sub(lambda m: names.get(m.group(1), "?"), e["msg"]).replace("the node(s) ", "node(s) ")
    # training steps (rank 0 log, plus other ranks' start events)
    logs = []
    for r in range(3):
        for rec in jl(os.path.join(d, "logs", f"rank{r}.jsonl")):
            if rec["ev"] in ("start", "resume", "end", "crash") or (rec["ev"] == "step" and r == 0):
                logs.append({"t": rec["ts"], "rank": r, "ev": rec["ev"], "world": rec["world"], "step": rec.get("step", rec.get("start_step")),
                             "gloss": rec.get("gloss")})
    evs = sorted([e for e in out if e["t"] is not None], key=lambda e: e["t"])
    errs = [scrub(e["msg"]) for e in out if e["t"] is None]
    for e in evs:
        e["t"] = round(e["t"] - t0, 3); e["msg"] = scrub(e["msg"])
    for l in logs:
        l["t"] = round(l["t"] - t0, 3)
    marks = {k: round(v - t0, 3) for k, v in E.items()}
    return {"events": evs, "logs": sorted(logs, key=lambda x: x["t"]), "marks": marks, "errors": errs[:12]}


def keep(e):
    m = e["msg"]
    if e["src"] == "agent":
        return not m.startswith("  ") or "group_world_size=" in m or "master_port=" in m or "group_rank=" in m
    drop = ("successfully synced", "updated its keep-alive", "has sent a keep-alive", "stale state")
    return not any(x in m for x in drop)


def compress(evs):
    """drop heartbeat chatter; keep only the first of each run of identical 'can't complete' lines per node"""
    r, last = [], {}
    for e in evs:
        if not keep(e):
            continue
        k = (e["who"], e["msg"])
        if "can't complete rendezvous" in e["msg"]:
            if last.get(e["who"]) == e["msg"]:
                continue
        last[e["who"]] = e["msg"]
        if r and r[-1]["who"] == e["who"] and r[-1]["msg"] == e["msg"]:
            continue
        r.append(e)
    return r


SC = {"elastic": ("ABC"), "elastic_share": ("ABC"), "static": ("ABC"), "share_a": ("AB"), "share_b": ("AB"), "noshare": ("AB")}
RZ = {}
for s, ag in SC.items():
    x = rz(s, ag)
    x["events"] = compress(x["events"])
    RZ[s] = x


# probes in the store scenarios
def probes(s):
    d = os.path.join(EV, "rz", s); r = []
    for a in "AB":
        for line in open(os.path.join(d, f"agent_{a}.out"), errors="replace"):
            if '"ev": "ld_probe"' in line:
                p = json.loads(line[line.index("{"):])
                r.append({k: p.get(k) for k in ("rank", "restart", "master_port", "use_agent_store", "num_keys", "gloo_keys_present", "probe_error")})
    return r


for s in ("share_a", "share_b", "noshare"):
    RZ[s]["probes"] = probes(s)

data = {"rz": RZ}


KINDS = [("store_host", r"hosts the TCP store"), ("join", r"attempts to join the next round"),
         ("add_part", r"added itself to the participants of round (\d+)"), ("add_wait", r"added itself to the wait list of round (\d+)"),
         ("rm_part", r"removed itself from the participants of round (\d+)"), ("roundup", r"No participants left"),
         ("wait_min", r"not enough participants"), ("wait_last", r"deadline reached"), ("quorum", r"quorum established"),
         ("complete", r"marked round (\d+) of the rendezvous .* as complete"), ("joined", r"has joined round (\d+) .* as rank (\d+) in a world of size (\d+)"),
         ("dead", r"Detected dead node (\w)"), ("noheartbeat", r"since they had no heartbeat"), ("closed_mark", r"as closed"),
         ("closed", r"has closed the rendezvous"), ("a_rdzv", r"Rendezvous'ing worker group"), ("a_done", r"Rendezvous complete for workers"),
         ("a_new", r"Detected (\d+) new nodes"), ("a_failed", r"Worker group FAILED\. (\d+)/(\d+) attempts left"),
         ("a_world", r"group_world_size=(\d+)"), ("a_port", r"master_port=(\d+)"), ("a_grank", r"group_rank=(\d+)"),
         ("a_finish", r"worker group successfully finished"), ("err_store", r"timed out after (\d+)ms"),
         ("err_mesh", r"connectFullMesh failed")]


def classify(evs, mn, mx):
    st = {"round": 0, "part": [], "wait": [], "complete": False, "deadline": None}
    out = []
    for e in evs:
        k, g = "other", ()
        for name, pat in KINDS:
            m = re.search(pat, e["msg"])
            if m:
                k, g = name, m.groups(); break
        n = e["who"]
        if k == "add_part":
            st["round"] = int(g[0])
            if n not in st["part"]: st["part"].append(n)
            if n in st["wait"]: st["wait"].remove(n)
            if len(st["part"]) == mn and mn != mx: st["deadline"] = round(e["t"] + 30, 3)
        elif k == "add_wait":
            if n not in st["wait"]: st["wait"].append(n)
        elif k == "rm_part":
            if n in st["part"]: st["part"].remove(n)
        elif k == "roundup":
            st["complete"] = False; st["round"] += 1
        elif k == "complete":
            st["complete"] = True; st["deadline"] = None
        elif k == "dead":
            d = g[0]
            for L in ("part", "wait"):
                if d in st[L]: st[L].remove(d)
        e2 = dict(e, k=k, g=list(g), state={"round": st["round"], "part": sorted(st["part"]), "wait": sorted(st["wait"]),
                                             "complete": st["complete"], "deadline": st["deadline"]})
        out.append(e2)
    return out


for s_, (mn, mx) in {"elastic": (2, 3), "elastic_share": (2, 3), "share_a": (2, 2), "share_b": (2, 2), "noshare": (2, 2)}.items():
    RZ[s_]["events"] = classify(RZ[s_]["events"], mn, mx)
RZ["static"]["events"] = classify(RZ["static"]["events"], 3, 3)


# ---------- hang cases ----------
def clean_stack(txt):
    lines = []
    for l in txt.splitlines():
        if l.startswith("Process ") or l.startswith("Python v") or not l.strip():
            continue
        lines.append(scrub(l.rstrip()))
    return lines


HANG = {}
for case in ("ok", "rank0_extra", "shape", "uneven", "stuck"):
    for dbg in ("OFF", "DETAIL"):
        d = os.path.join(EV, "hang", f"{case}_{dbg}")
        E = events(os.path.join(d, "events.txt"))
        t0 = E["start"]
        ex = [k for k in E if k.startswith("exit")]
        txt = open(os.path.join(d, "out.txt"), errors="replace").read()
        recs = [r for r in jl(os.path.join(d, "out.txt"))]
        init = [r for r in recs if r["ev"] == "init"]
        t_init = min(r["ts"] for r in init) if init else t0
        errs = {}
        for r in recs:
            if r["ev"] == "error" and r["rank"] not in errs:
                errs[r["rank"]] = {"t": round(r["ts"] - t_init, 1), "type": r["type"], "msg": scrub(r["msg"])}
        bugs = [{"rank": r["rank"], "t": round(r["ts"] - t_init, 2), "what": r["what"]} for r in recs if r["ev"] == "bug"]
        last = {}
        for r in recs:
            if r["ev"] == "step":
                last[r["rank"]] = r["step"]
        ends = sorted({r["rank"] for r in recs if r["ev"] == "end"})
        enforce = [scrub(l.strip()) for l in txt.splitlines() if "enforce fail" in l or "Fatal Python error" in l][:2]
        exitcodes = sorted(set(re.findall(r"exitcode\s*:\s*(-?\d+)", txt)))
        stacks = {}
        for f in sorted(os.listdir(d)):
            if f.startswith("pyspy_"):
                t = open(os.path.join(d, f)).read()
                m = re.search(r"^RANK=(\d+)", t, re.M)
                if m:
                    stacks[int(m.group(1))] = [l for l in clean_stack(t) if not l.startswith("RANK=")]
        wd = {}
        dd = os.path.join(d, "dump")
        if os.path.isdir(dd):
            for f in sorted(os.listdir(dd)):
                m = re.match(r"stacks_(\d)\.txt", f)
                if m:
                    wd[int(m.group(1))] = clean_stack(open(os.path.join(dd, f)).read())
        HANG[f"{case}_{dbg}"] = {"wall": round(E[ex[0]] - t0, 1) if ex else None, "exit": int(ex[0][5:]) if ex else None,
                                 "bugs": bugs, "errors": errs, "last_step": last, "ended": ends, "enforce": enforce,
                                 "exitcodes": exitcodes, "pyspy": stacks, "watchdog": wd,
                                 "pyspy_at": round(E["pyspy"] - t0, 1) if "pyspy" in E else None}
# flight recorder of the stuck case
import pickle
FR = {"ranks": {}}
dd = os.path.join(EV, "hang", "stuck_OFF", "dump")
for r in range(4):
    p = pickle.load(open(os.path.join(dd, f"fr_{r}"), "rb"))
    es = p["entries"]
    FR["ranks"][r] = {"n": len(es), "last_seq": es[-1]["collective_seq_id"], "last_name": es[-1]["profiling_name"],
                      "last_sizes": es[-1]["input_sizes"], "state": es[-1]["state"], "timeout_ms": es[-1]["timeout_ms"],
                      "pg_status": p["pg_status"]}
    FR["pg_config"] = p["pg_config"]
FR["raw"] = [scrub(l) for l in open(os.path.join(EV, "hang", "stuck_OFF", "frtrace_raw.txt")).read().splitlines() if l.strip()][-3:]
FR["patched"] = [scrub(l) for l in open(os.path.join(EV, "hang", "stuck_OFF", "frtrace_patched.txt")).read().splitlines() if l.strip() and "tabulate" not in l]
data["hang"] = HANG
data["fr"] = FR

# ---------- DETAIL isolation ----------
DET = {}
for f in sorted(os.listdir(os.path.join(EV, "detail"))):
    t = open(os.path.join(EV, "detail", f), errors="replace").read()
    evs = objs(t)
    DET[f[:-4]] = {"events": sorted({e["ev"] for e in evs}), "segv": "Segmentation fault" in t,
                   "exitcodes": sorted(set(re.findall(r"exitcode\s*:\s*(-?\d+)", t))),
                   "mismatch": next((scrub(e["msg"]) for e in evs if e["ev"] == "error"), None),
                   "where": sorted(set(re.findall(r"distributed\.py\", line (\d+) in (\w+)", t)))}
data["detail"] = DET

# ---------- network and shared memory ----------
def ifl(f):
    raw = json.load(open(os.path.join(EV, "net", f)))
    return [{"name": scrub(x["name"]), "fam": x["fam"], "running": x["running"], "loopback": x["loopback"]} for x in raw]


data["net"] = {"bridge": ifl("if_bridge.json"), "host": ifl("if_host.json"),
               "shm_docker": open(os.path.join(EV, "net", "shm.txt")).read().splitlines(),
               "shm_kind": open(os.path.join(EV, "net", "kind_shm.txt")).read().splitlines()}

# ---------- launch stage medians (the parent's Launch lab, reused) ----------
LT = json.load(open(os.path.join(SRC, "..", "..", "src", "launch", "out", "launch_times.json")))["systems"]
CH = {}
for sname, v in LT.items():
    runs = v["runs"]
    names = [x["stage"] for x in runs[0]["stages"]]
    CH[sname] = {"total": round(st.median([r["total_s"] for r in runs]), 2), "n": len(runs),
                 "stages": [[n, round(st.median([r["stages"][i]["s"] for r in runs]), 3)] for i, n in enumerate(names)]}
data["stages"] = CH
data["lines"] = {k: {"f": v["file"].split("/")[-1], "l": v["line"], "u": v["url"]} for k, v in
                 json.load(open(os.path.join(SRC, "out", "lines.json"))).items()}
data["meta"] = {"measured": "Apple M1 Pro, Docker Desktop VM (5 CPUs, 9.7 GiB), shared machine; torch 2.14.1+cpu in mi-train:1",
                "date": "16 October 2026"}

json.dump(data, open(os.path.join(SRC, "out", "data.json"), "w"), indent=1)
open(os.path.join(SRC, "parts", "22_js_ld_data.js"), "w").write(
    "// generated by scripts/ld_make_data.py from the recorded runs (src/runs/); do not edit\nwindow.LD=" +
    json.dumps(data, separators=(",", ":")) + ";\n")
print("data.json", os.path.getsize(os.path.join(SRC, "out", "data.json")), "bytes; ips scrubbed", len(IPS))

# recorded launch environments (the parent's Launch lab probes), only the variables this page's matrix shows
VARS = ["RANK", "LOCAL_RANK", "WORLD_SIZE", "LOCAL_WORLD_SIZE", "GROUP_RANK", "GROUP_WORLD_SIZE", "NODE_RANK", "MASTER_ADDR", "MASTER_PORT",
        "TORCHELASTIC_RESTART_COUNT", "TORCHELASTIC_MAX_RESTARTS", "TORCHELASTIC_USE_AGENT_STORE", "TORCHELASTIC_RUN_ID",
        "TORCH_NCCL_ASYNC_ERROR_HANDLING", "SLURM_PROCID", "SLURM_LOCALID", "SLURM_NODEID", "SLURM_NTASKS", "SLURM_NNODES",
        "SLURM_JOB_NODELIST", "SLURM_GPUS_ON_NODE", "CUDA_VISIBLE_DEVICES", "JOB_COMPLETION_INDEX", "OMP_NUM_THREADS"]
ENVR = json.load(open(os.path.join(SRC, "..", "..", "src", "launch", "out", "env.json")))
data["envrec"] = {sy: {str(r["rank"]): {k: scrub(str(r["vars"][k])) for k in VARS if k in r["vars"]} for r in rows} for sy, rows in ENVR.items()}

# sidecar py-spy dump of the hung rank 0 (shared-store run 1)
sc = open(os.path.join(EV, "rz", "share_a", "share_hang_pyspy.txt")).read().split("===native")[0]
data["sidecar"] = [scrub(l.rstrip()) for l in sc.splitlines() if l.strip() and not l.startswith("Process ") and not l.startswith("Python v")]
json.dump(data, open(os.path.join(SRC, "out", "data.json"), "w"), indent=1)
open(os.path.join(SRC, "parts", "22_js_ld_data.js"), "w").write(
    "// generated by scripts/ld_make_data.py from the recorded runs (src/runs/); do not edit\nwindow.LD=" +
    json.dumps(data, separators=(",", ":")) + ";\n")

# scrubbed copy of the evidence into ../runs/ (text files scrubbed; flight-recorder pickles copied as they are)
if os.path.isdir(RUNS):
    shutil.rmtree(RUNS)
for root, _, files in os.walk(EV):
    for fn in files:
        a = os.path.join(root, fn); rel = os.path.relpath(a, EV); b = os.path.join(RUNS, rel)
        os.makedirs(os.path.dirname(b), exist_ok=True)
        if fn.startswith("fr_"):
            shutil.copy(a, b)
        else:
            open(b, "w").write(scrub(open(a, errors="replace").read()))
print("runs copied", sum(len(f) for _, _, f in os.walk(RUNS)), "files")
