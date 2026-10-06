"""The breadth task: audit 48 modules for docstring/code mismatches, four ways.

usage: python3 run_audit.py <design> <rep> [model]
  design: single | multi | fanout | board
Each run works in a fresh copy of fmulti/audit_repo under fmulti/work/<run>/ ; the answer key
(fmulti/audit_truth.json) is never inside the copy.
"""
import concurrent.futures as cf, glob, json, os, shutil, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cc import FM, claude, final_json_array, log

TASK = ("Audit the Python package in fleetops/. Every public function (a name that does not start with _) "
        "states a contract in its docstring: a default value, a unit, an ordering, a bound, what happens for a "
        "missing key, a number of attempts, a scale, or case handling. Find every public function whose code does "
        "not do what its own docstring says. Check all 48 modules (fleetops/_runtime.py and fleetops/__init__.py "
        "have no contracts). Do not modify any file. End your answer with a JSON array of objects "
        '{"file": "fleetops/<module>.py", "function": "<name>", "why": "<one short sentence>"} and nothing after it; '
        "use [] if you find none.")

WORKER = ("You audit Python modules of the fleetops package. Every public function (a name that does not start "
          "with _) states a contract in its docstring: a default value, a unit, an ordering, a bound, what happens "
          "for a missing key, a number of attempts, a scale, or case handling. Read every module you are given in "
          "full and report every public function whose code does not do what its own docstring says. Do not modify "
          "any file. End your answer with a JSON array of objects "
          '{"file": "fleetops/<module>.py", "function": "<name>", "why": "<one short sentence>"} and nothing after it; '
          "use [] if you find none.")

LEAD = ("You lead an audit team. Do not read the modules yourself. Use Glob to list fleetops/*.py, split the 48 "
        "modules with contracts into 6 groups of 8, and launch 6 'auditor' subagents in a single message so they run "
        "in parallel, giving each its 8 file paths. When all have reported, merge their JSON arrays (drop duplicates) "
        "and give the final answer.")

N_GROUPS = 6


def modules(d):
    return sorted(p for p in glob.glob(os.path.join(d, "fleetops", "*.py")) if not os.path.basename(p).startswith("_"))


def fresh(run):
    d = os.path.join(FM, "work", run)
    if os.path.exists(d):
        shutil.rmtree(d)
    shutil.copytree(os.path.join(FM, "audit_repo"), d)
    return d


def score(found):
    truth = json.load(open(os.path.join(FM, "audit_truth.json")))["mismatches"]
    key = {(t["file"], t["function"]) for t in truth}
    got = set()
    for f in found or []:
        if isinstance(f, dict) and "file" in f and "function" in f:
            fn = f["file"].strip()
            fn = fn if fn.startswith("fleetops/") else "fleetops/" + os.path.basename(fn)
            got.add((fn, f["function"].strip()))
    tp = len(got & key)
    return dict(found=len(got), true_pos=tp, false_pos=len(got - key), missed=sorted(f"{a}:{b}" for a, b in key - got),
                wrong=sorted(f"{a}:{b}" for a, b in got - key), truth=len(key))


def single(run, model):
    d = fresh(run)
    r = claude(run, "agent", TASK, d, model=model, tools="Read,Grep,Glob")
    return dict(wall=r["wall"], agents=[r], answer=final_json_array((r["result"] or {}).get("result", "")))


def multi(run, model):
    d = fresh(run)
    agents = {"auditor": {"description": "Audits a given list of fleetops modules for functions whose code disagrees "
                                         "with their docstring, and reports a JSON array.",
                          "prompt": WORKER, "tools": ["Read", "Grep", "Glob"], "model": model}}
    r = claude(run, "lead", TASK, d, model=model, tools="Read,Grep,Glob,Agent", append=LEAD, agents=agents)
    return dict(wall=r["wall"], agents=[r], answer=final_json_array((r["result"] or {}).get("result", "")))


def fanout(run, model):
    """A workflow: code splits the files, 6 model calls with the files inline and no tools, code merges."""
    d = fresh(run)
    mods = modules(d)
    groups = [mods[i::N_GROUPS] for i in range(N_GROUPS)]
    t0 = time.time()

    def one(i):
        body = "\n\n".join(f"===== fleetops/{os.path.basename(p)} =====\n" + open(p).read() for p in groups[i])
        prompt = "Audit these modules.\n\n" + body
        return claude(run, f"worker{i + 1}", prompt, os.path.join(FM, "work", "empty"), model=model, tools="",
                      system=WORKER)

    os.makedirs(os.path.join(FM, "work", "empty"), exist_ok=True)
    with cf.ThreadPoolExecutor(N_GROUPS) as ex:
        rs = list(ex.map(one, range(N_GROUPS)))
    ans = []
    for r in rs:
        ans += final_json_array((r["result"] or {}).get("result", "")) or []
    return dict(wall=round(time.time() - t0, 3), agents=rs, answer=ans,
                groups=[[os.path.basename(p) for p in g] for g in groups])


BOARD = r'''"""Shared board for the audit: claims are atomic (os.open with O_EXCL), findings are appended.
python3 board.py claim WORKER   -> prints the next unclaimed module path, or DONE
python3 board.py post WORKER FILE FUNCTION WHY...
python3 board.py show           -> every finding posted so far
"""
import glob, json, os, sys, time
B = ".board"
os.makedirs(os.path.join(B, "claims"), exist_ok=True)
cmd = sys.argv[1]
if cmd == "claim":
    for p in sorted(glob.glob("fleetops/*.py")):
        if os.path.basename(p).startswith("_"):
            continue
        try:
            fd = os.open(os.path.join(B, "claims", os.path.basename(p)), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, json.dumps({"worker": sys.argv[2], "t": time.time()}).encode()); os.close(fd)
            print(p); break
        except FileExistsError:
            continue
    else:
        print("DONE")
elif cmd == "post":
    with open(os.path.join(B, "findings.jsonl"), "a") as f:
        f.write(json.dumps({"worker": sys.argv[2], "file": sys.argv[3], "function": sys.argv[4],
                            "why": " ".join(sys.argv[5:]), "t": time.time()}) + "\n")
    print("posted")
elif cmd == "vclaim":
    # claim the next finding to verify that this worker did not post itself
    p = os.path.join(B, "findings.jsonl")
    rows = [json.loads(l) for l in open(p)] if os.path.exists(p) else []
    os.makedirs(os.path.join(B, "vclaims"), exist_ok=True)
    for i, r in enumerate(rows):
        if r["worker"] == sys.argv[2]:
            continue
        try:
            fd = os.open(os.path.join(B, "vclaims", str(i)), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, json.dumps({"worker": sys.argv[2], "t": time.time()}).encode()); os.close(fd)
            item = {"id": i, "file": r["file"], "function": r["function"]}
            if os.environ.get("BOARD_BLIND") != "1":
                item["claim"] = r["why"]
            print(json.dumps(item)); break
        except FileExistsError:
            continue
    else:
        print("DONE")
elif cmd == "verdict":
    with open(os.path.join(B, "verdicts.jsonl"), "a") as f:
        f.write(json.dumps({"worker": sys.argv[2], "id": int(sys.argv[3]), "verdict": sys.argv[4],
                            "why": " ".join(sys.argv[5:]), "t": time.time()}) + "\n")
    print("recorded")
elif cmd == "show":
    p = os.path.join(B, "findings.jsonl")
    print(open(p).read() if os.path.exists(p) else "(no findings yet)")
'''

BOARD_SYS = ("You are one of 6 auditors working at the same time on a shared board; there is no lead. Loop: run "
             "`python3 board.py claim {w}` to get the next unclaimed module (it prints a path, or DONE); read that "
             "module in full with Read; for every public function whose code does not do what its own docstring says, "
             "run `python3 board.py post {w} <file> <function> <one short reason>`; then claim the next module. Stop "
             "when claim prints DONE. Use no other commands and do not modify any file. Finally reply with one line: "
             "the number of modules you audited.")


def board(run, model):
    d = fresh(run)
    with open(os.path.join(d, "board.py"), "w") as f:
        f.write(BOARD)
    t0 = time.time()

    def one(i):
        w = f"w{i + 1}"
        return claude(run, w, TASK.split(" End your answer")[0] + " Work through the shared board as described in "
                      "your instructions.", d, model=model, tools="Read,Bash", append=BOARD_SYS.format(w=w),
                      allowed="Bash(python3 board.py:*)")

    with cf.ThreadPoolExecutor(N_GROUPS) as ex:
        rs = list(ex.map(one, range(N_GROUPS)))
    ans, claims = [], {}
    fp = os.path.join(d, ".board", "findings.jsonl")
    if os.path.exists(fp):
        ans = [json.loads(l) for l in open(fp) if l.strip()]
    for c in glob.glob(os.path.join(d, ".board", "claims", "*.py")):
        v = json.load(open(c))
        claims[os.path.basename(c)] = dict(worker=v["worker"], t=round(v["t"] - t0, 3))
    return dict(wall=round(time.time() - t0, 3), agents=rs, answer=ans, claims=claims)


VERIFY_SYS = ("You are one of 6 checkers working at the same time on a shared board of findings posted by auditors; "
              "there is no lead. Loop: run `python3 board.py vclaim {w}` to get the next unchecked finding (JSON with id, "
              "file, function and the auditor's claim; or DONE); read that function in the file with Read; decide whether "
              "the code really does not do what its own docstring says; record it with `python3 board.py verdict {w} <id> "
              "yes|no <one short reason>` (yes = a real mismatch); then claim the next. Stop when vclaim prints DONE. Use no "
              "other commands and do not modify any file. Finally reply with one line: the number of findings you checked.")


VERIFY_BLIND = ("You are one of 6 checkers working at the same time on a shared board; there is no lead. Loop: run "
                "`python3 board.py vclaim {w}` to get the next function to check (JSON with id, file and function; or "
                "DONE); read that function and its docstring with Read; decide independently whether the code does what "
                "its own docstring promises; record it with `python3 board.py verdict {w} <id> mismatch|ok <one short "
                "reason>`; then claim the next. Stop when vclaim prints DONE. Use no other commands and do not modify any "
                "file. Finally reply with one line: the number of functions you checked.")


def check_only(run, model, blind):
    """Only the check round, on the findings that the blackboard run audit_board_haiku_2 posted (fixed input)."""
    d = fresh(run)
    with open(os.path.join(d, "board.py"), "w") as f:
        f.write(BOARD)
    src = os.path.join(FM, "work", "audit_board_haiku_2", ".board")
    os.makedirs(os.path.join(d, ".board"), exist_ok=True)
    shutil.copy(os.path.join(src, "findings.jsonl"), os.path.join(d, ".board", "findings.jsonl"))
    posted = [json.loads(l) for l in open(os.path.join(d, ".board", "findings.jsonl")) if l.strip()]
    t0 = time.time()

    def one(i):
        w = f"w{i + 1}"
        return claude(run, "v" + w, "Check the findings on the shared board as described in your instructions.", d,
                      model=model, tools="Read,Bash", append=(VERIFY_BLIND if blind else VERIFY_SYS).format(w=w),
                      allowed="Bash(python3 board.py:*)", env={"BOARD_BLIND": "1" if blind else "0"})

    with cf.ThreadPoolExecutor(N_GROUPS) as ex:
        rs = list(ex.map(one, range(N_GROUPS)))
    vp = os.path.join(d, ".board", "verdicts.jsonl")
    verdicts = [json.loads(l) for l in open(vp)] if os.path.exists(vp) else []
    yes = {v["id"] for v in verdicts if v["verdict"].lower().startswith(("y", "mismatch"))}
    return dict(wall=round(time.time() - t0, 3), agents=rs, answer=[r for i, r in enumerate(posted) if i in yes],
                posted=posted, verdicts=verdicts)


def checkblind(run, model):
    os.environ["BOARD_BLIND"] = "1"
    return check_only(run, model, True)


def checkshown(run, model):
    os.environ["BOARD_BLIND"] = "0"
    return check_only(run, model, False)


def boardb(run, model):
    """Like boardv, but the checker is not shown the auditor's claim (blind re-check)."""
    os.environ["BOARD_BLIND"] = "1"
    return boardv(run, model, blind=True)


def boardv(run, model, blind=False):
    """The board, then a second round in which every posted finding is checked by a different agent."""
    out = board(run, model)
    d = os.path.join(FM, "work", run)
    t0 = time.time() - out["wall"]

    def one(i):
        w = f"w{i + 1}"
        return claude(run, "v" + w, "Check the findings on the shared board as described in your instructions.", d,
                      model=model, tools="Read,Bash", append=(VERIFY_BLIND if blind else VERIFY_SYS).format(w=w),
                      allowed="Bash(python3 board.py:*)", env={"BOARD_BLIND": "1" if blind else "0"})

    with cf.ThreadPoolExecutor(N_GROUPS) as ex:
        rs = list(ex.map(one, range(N_GROUPS)))
    vp = os.path.join(d, ".board", "verdicts.jsonl")
    verdicts = [json.loads(l) for l in open(vp)] if os.path.exists(vp) else []
    yes = {v["id"] for v in verdicts if v["verdict"].lower().startswith(("y", "mismatch"))}
    posted = out["answer"]
    out["posted"] = posted
    out["verdicts"] = verdicts
    out["answer"] = [r for i, r in enumerate(posted) if i in yes]
    out["agents"] = out["agents"] + rs
    out["wall"] = round(time.time() - t0, 3)
    return out


SHARP = (" Only these eight kinds count: a default value, a unit, an ordering, a bound (inclusive or exclusive), "
         "missing-key behaviour, a number of attempts, a scale (fraction or percentage), case handling. Do not report "
         "missing input validation, exceptions the code does not raise, thread safety, or results that are wrong only "
         "for impossible inputs (for example hits greater than total).")


def main():
    global TASK, WORKER, BOARD_SYS
    design, rep = sys.argv[1], sys.argv[2]
    if design.endswith("sharp"):
        TASK = TASK.replace(" Check all 48 modules", SHARP + " Check all 48 modules")
        WORKER = WORKER.replace(" Do not modify", SHARP + " Do not modify")
        BOARD_SYS = BOARD_SYS.replace(" Use no other commands", SHARP.replace("{", "{{").replace("}", "}}") + " Use no other commands")
        globals()[design] = globals()[design[:-5]]
    model = sys.argv[3] if len(sys.argv) > 3 else "haiku"
    run = f"audit_{design}_{model}_{rep}"
    log(f"=== {run}")
    out = globals()[design](run, model)
    s = score(out["answer"])
    summ = dict(run=run, design=design, model=model, rep=rep, wall=out["wall"], score=s,
                cost=round(sum(((a["result"] or {}).get("total_cost_usd") or 0) for a in out["agents"]), 6),
                agents=[dict(path=os.path.relpath(a["path"], FM), wall=a["wall"], t0=a["t0"]) for a in out["agents"]],
                answer=out["answer"], extra={k: v for k, v in out.items() if k in ("groups", "claims", "posted", "verdicts")})
    json.dump(summ, open(os.path.join(FM, "raw", run, "summary.json"), "w"), indent=1)
    print(json.dumps(dict(run=run, wall=summ["wall"], cost=summ["cost"], **{k: s[k] for k in ("found", "true_pos", "false_pos")})))


main()
