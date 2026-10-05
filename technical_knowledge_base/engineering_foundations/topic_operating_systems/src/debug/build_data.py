"""Build the Debug lab's data (../parts/33_js_dbg_0data.js) from the case texts (cases_*.py) and the
recordings in raw/ (written by run_all.sh, redacted by redact.py). Every output on the page is cut
from a raw file verbatim; check_embed.py verifies that against the built page.
Usage: python3 build_data.py"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cases_a, cases_b, cases_c, cases_d  # noqa: E402

CASES = cases_a.CASES + cases_b.CASES + cases_c.CASES + cases_d.CASES
RAW = os.path.join(HERE, "raw")
EXC = os.path.join(HERE, "sources", "excerpts.txt")


def raw(name):
    if name == "@excerpts":
        return open(EXC, encoding="utf-8").read()
    return open(os.path.join(RAW, name + ".txt"), encoding="utf-8").read()


def trim(lines):
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return "\n".join(lines)


def section(name, label):
    """Return (kind, text): kind 'host' for host-side lines, 'out' for container output, 'src' for source."""
    s = raw(name)
    lines = s.split("\n")
    if name == "@excerpts":
        for i, l in enumerate(lines):
            if l.startswith(label):
                j = i + 1
                while j < len(lines) and not lines[j].startswith("## "):
                    j += 1
                return "src", trim(lines[i + 1:j])
        raise KeyError((name, label))
    if label == "host":
        assert lines[0].startswith("### host: ")
        return "host", lines[0][len("### host: "):]
    if label in ("exit", "stop"):
        key = "### host: container exit code" if label == "exit" else "### host: docker stop"
        for l in reversed(lines):
            if l.startswith(key):
                return "host", l[len("### host: "):]
        raise KeyError((name, label))
    if label.startswith("host: "):
        for l in lines:
            if l == "### " + label:
                return "host", label[len("host: "):]
        raise KeyError((name, label))
    if label in ("body", "head", "tail"):
        j = 1
        while j < len(lines) and not lines[j].startswith("### "):
            j += 1
        body = trim(lines[1:j]).split("\n")
        if label == "head":
            body = body[:6]
        if label == "tail":
            body = body[-8:]
        return "out", "\n".join(body)
    for i, l in enumerate(lines):
        if l == "### " + label:
            j = i + 1
            while j < len(lines) and not lines[j].startswith("### "):
                j += 1
            return "out", trim(lines[i + 1:j])
    raise KeyError((name, label))


PH = re.compile(r"@@([\w@]+)\|(.+?)@@", re.S)


def resolve(text, problems, cid):
    """Replace @@file|regex@@ by the regex's first group in that recording, so the prose quotes
    the numbers of the current recordings and never drifts from them."""
    def rep(m):
        mm = re.search(m.group(2), raw(m.group(1)))
        if not mm:
            problems.append(f"{cid}: placeholder found nothing: {m.group(0)}")
            return "??"
        return mm.group(1)
    return PH.sub(rep, text)


def main():
    out = []
    problems = []
    for c in CASES:
        d = {k: c[k] for k in ("id", "title", "sub", "tools", "ostep", "cause", "fix", "ml")}
        TMAP = {"cgroup/docker flags": "docker", "time": "getrusage", "timing": "getrusage", "/proc smaps": "/proc",
                "strace -c": "strace", "torch.cuda.memory_summary": "torch.cuda.memory_summary()", "psutil": "/proc"}
        d["tools"] = sorted({TMAP.get(t2, t2) for t2 in (re.sub(r" \(.*\)$", "", t) for t in c["tools"])})
        for k in ("cause", "fix", "ml"):
            d[k] = resolve(d[k], problems, c["id"])
        rn, sym = c["symptom"]
        if sym.startswith("re:"):  # a regex over the recording: the symptom is whatever it matches
            mm = re.search(sym[3:], raw(rn))
            sym = (mm.group(1) if mm.groups() else mm.group(0)) if mm else "??"
        if sym not in raw(rn):
            problems.append(f"{c['id']}: symptom not found in {rn}: {sym!r}")
        d["symptom"] = sym
        d["seen"] = c.get("seen", "")
        d["sf"] = rn
        d["rec"] = []
        for rn2, lab in c["rec"]:
            try:
                k, t = section(rn2, lab)
            except KeyError:
                problems.append(f"{c['id']}: section {lab!r} missing in {rn2}")
                continue
            d["rec"].append({"k": k, "f": rn2, "t": t})
        f = c["first"]
        d["first"] = {"opts": f["opts"], "a": f["a"], "why": f["why"]}
        if "bars" in c:
            b = c["bars"]
            vals = []
            for rn3, rx, lab in b["src"]:
                m = re.search(rx, raw(rn3))
                if not m:
                    problems.append(f"{c['id']}: bar {lab!r} regex found nothing in {rn3}")
                    continue
                vals.append({"l": lab, "v": float(m.group(1)), "g": m.group(1), "s": m.group(0).split("\n")[-1][:120], "f": rn3})
            d["bars"] = {"title": b["title"], "unit": b["unit"], "vals": vals}
        out.append(d)
    env = section("env", "body")[1]
    data = {"env": env, "envHost": section("env", "host")[1], "cases": out, "tree": TREE}
    ids = {c["id"] for c in out}
    for leaf in leaves(TREE):
        for i in leaf:
            if i not in ids:
                problems.append(f"tree points at unknown case {i}")
    js = "/* generated by src/debug/build_data.py from src/debug/raw/ and cases_*.py; do not edit */\nwindow.DBG_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js = js.replace("</", "<\\/")
    with open(os.path.join(HERE, "..", "parts", "33_js_dbg_0data.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print(f"{len(out)} cases, {len(js)} bytes")
    for p in problems:
        print("PROBLEM", p)
    return 1 if problems else 0


def leaves(node):
    if "cases" in node:
        yield node["cases"]
    for ch in node.get("kids", []):
        yield from leaves(ch)


# Decision tree from symptom to subsystem: question nodes have kids; answer nodes list cases.
def Q(q, *kids):
    return {"q": q, "kids": list(kids)}


def A(a, *rest):
    """An answer: either leads to cases (list) or to a further question (dict)."""
    node = {"a": a}
    for r in rest:
        if isinstance(r, list):
            node["cases"] = r
        elif isinstance(r, str):
            node["note"] = r
        else:
            node.update(r)
    return node


TREE = Q("What is the job doing?",
  A("It died", Q("How did it die?",
    A("Exit code 137 or \"Killed\", no Python traceback", Q("Was it being stopped (docker stop, preemption, scancel)?",
      A("Yes, and the stop took the whole grace period", ["sig_pid1", "sig_wrapper"]),
      A("No, it was running normally", ["oom_kill", "oom_score"], "Read memory.events: oom_kill counts the kills."))),
    A("Exit code 143 right after a stop request", ["sig_default"]),
    A("A Python traceback", Q("What does the message mention?",
      A("A DataLoader worker exited or was killed", ["worker_oom", "sig_workers", "shm"]),
      A("Shared memory, shm, or a bus error", ["shm"]),
      A("Too many open files", ["fd_leak", "fd_share"]),
      A("MemoryError or \"can't allocate\"", ["memerr"]),
      A("CUDA out of memory", ["cuda_oom"]),
      A("Resource temporarily unavailable (EAGAIN) at fork or thread start", ["pids"]),
      A("An odd error while saving, or a checkpoint that will not load", ["disk_full", "fsync"]))))),
  A("It is slow", Q("Where does the time go?",
    A("The main loop waits for batches", ["starve", "slowio", "pagecache"]),
    A("CPU limit hit: nr_throttled grows in cpu.stat", ["throttle", "threads"]),
    A("Many threads, many involuntary context switches", ["threads"]),
    A("High system time in top", ["systime"]),
    A("Processes in state D, CPUs idle", ["slowio"]),
    A("Major page faults climb, swap in use", ["swap"]),
    A("Only the first epoch is slow", ["pagecache"]))),
  A("It hangs", Q("Which process is stuck, and where?",
    A("A freshly forked worker, sleeping in a futex wait", ["fork_lock"]),
    A("Workers in state D", ["slowio"]),
    A("The whole container ignores docker stop", ["sig_pid1", "sig_wrapper"]))),
  A("Memory keeps growing", Q("Whose memory?",
    A("Each worker's private memory (USS), RSS flat", ["cow"]),
    A("Each worker's RSS, until one is killed", ["worker_oom"]),
    A("Over the limit but not killed, just slower", ["swap"]))),
  A("Something is left behind", Q("What is left?",
    A("Processes in state Z (defunct)", ["zombie"]),
    A("Workers still running after the main process died", ["orphan"]),
    A("A checkpoint missing or corrupt after a crash", ["fsync", "disk_full"]))))

if __name__ == "__main__":
    sys.exit(main())
