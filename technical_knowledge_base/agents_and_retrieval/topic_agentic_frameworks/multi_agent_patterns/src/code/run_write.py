"""The write task: two pieces of one feature that must fit together, three ways.

usage: python3 run_write.py <design> <rep> [model]
  design: single   one agent writes both modules
          parallel two agents at once, each in its own copy, each writing one module without seeing the other
          contract a lead call (tools off) first writes the interface; then the two parallel writers get it
The merged tree is checked by a hidden integration test that only uses what the task states.
"""
import concurrent.futures as cf, json, os, shutil, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cc import FM, claude, log

SCR = os.path.dirname(os.path.dirname(FM))  # scratchpad
TASK_REPO = os.path.join(SCR, "agents", "task_repo")

FEATURE = ("Feature: a text report. (1) textstats/report.py with build_report(text) that returns the statistics of "
           "a text: the word count, the number of distinct words, and the top 3 words with their counts (use the "
           "functions in textstats/core.py). (2) textstats/render.py with render(report) that turns the value "
           "returned by build_report into a Markdown table with one row per statistic; the top words go in one row "
           "as 'word (count)' items separated by commas.")
SINGLE = FEATURE + " Write both modules and check that render(build_report(...)) works. Do not edit the tests or core.py."
PART_A = (FEATURE + " You write part (1) only: textstats/report.py. Another engineer is writing part (2), "
          "textstats/render.py, at the same time; you cannot see their work and cannot talk to them. Do not create "
          "render.py. Do not edit the tests or core.py.")
PART_B = (FEATURE + " You write part (2) only: textstats/render.py. Another engineer is writing part (1), "
          "textstats/report.py, at the same time; you cannot see their work and cannot talk to them. Do not create "
          "report.py. Do not edit the tests or core.py.")
LEAD = ("You are the lead on this feature. Two engineers will write the two modules in parallel without talking to "
        "each other. Write only the shared contract they will both code against: the exact type and shape of the "
        "value build_report returns (key names, value types, order of the top words). Reply with a short "
        "specification, under 150 words, and no code other than one example value.")

HIDDEN = r'''
import json, sys; sys.path.insert(0, ".")
out = {}
try:
    from textstats.report import build_report
    from textstats.render import render
    md = render(build_report("b a b a c a"))
    out["ran"] = True
    out["is_table"] = md.count("|") >= 6
    out["has_count"] = "6" in md
    out["has_distinct"] = "3" in md
    out["has_top"] = all(s in md for s in ("a (3)", "b (2)", "c (1)"))
    out["top_order"] = md.find("a (3)") < md.find("b (2)") < md.find("c (1)") if out["has_top"] else False
    out["md"] = md
except Exception as e:
    out["ran"] = False
    out["error"] = type(e).__name__ + ": " + str(e)[:200]
print(json.dumps(out))
'''

TOOLS = "Read,Write,Edit,Bash,Glob,Grep"
EXTRA = ["--permission-mode", "acceptEdits"]
ALLOW = "Bash(python3:*)"


def copy(run, name):
    d = os.path.join(FM, "work", run, name)
    if os.path.exists(d):
        shutil.rmtree(d)
    shutil.copytree(TASK_REPO, d)
    # the running example's two planted bugs are fixed first, so this task is only about the new feature
    core = os.path.join(d, "textstats", "core.py")
    s = open(core).read()
    s = s.replace('r"[a-z]+"', 'r"[a-z\']+"').replace("key=lambda kv: -kv[1]", "key=lambda kv: (-kv[1], kv[0])")
    open(core, "w").write(s)
    return d


def check(d):
    p = subprocess.run(["python3", "-c", HIDDEN], cwd=d, capture_output=True, text=True, timeout=60)
    try:
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception:
        return {"ran": False, "error": (p.stderr or p.stdout)[-300:]}


def read_or_none(p):
    return open(p).read() if os.path.exists(p) else None


def run_parallel(run, model, contract_text=None):
    a, b = copy(run, "A"), copy(run, "B")
    pa, pb = PART_A, PART_B
    if contract_text:
        pa += " The lead has fixed the contract you must follow:\n" + contract_text
        pb += " The lead has fixed the contract you must follow:\n" + contract_text
    with cf.ThreadPoolExecutor(2) as ex:
        fa = ex.submit(claude, run, "writerA", pa, a, model, TOOLS, None, None, None, ALLOW, EXTRA)
        fb = ex.submit(claude, run, "writerB", pb, b, model, TOOLS, None, None, None, ALLOW, EXTRA)
        ra, rb = fa.result(), fb.result()
    m = copy(run, "merged")
    for src, rel in ((a, "textstats/report.py"), (b, "textstats/render.py")):
        if os.path.exists(os.path.join(src, rel)):
            shutil.copy(os.path.join(src, rel), os.path.join(m, rel))
    return [ra, rb], m, dict(report_py=read_or_none(os.path.join(a, "textstats/report.py")),
                             render_py=read_or_none(os.path.join(b, "textstats/render.py")))


def main():
    design, rep = sys.argv[1], sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else "haiku"
    run = f"write_{design}_{model}_{rep}"
    log(f"=== {run}")
    t0 = time.time()
    extra = {}
    if design == "single":
        d = copy(run, "S")
        r = claude(run, "agent", SINGLE, d, model, TOOLS, None, None, None, ALLOW, EXTRA)
        agents, merged = [r], d
        extra = dict(report_py=read_or_none(os.path.join(d, "textstats/report.py")),
                     render_py=read_or_none(os.path.join(d, "textstats/render.py")))
    elif design == "parallel":
        agents, merged, extra = run_parallel(run, model)
    elif design == "contract":
        empty = os.path.join(FM, "work", "empty")
        os.makedirs(empty, exist_ok=True)
        rl = claude(run, "lead", FEATURE, empty, model=model, tools="", system=LEAD)
        ct = (rl["result"] or {}).get("result", "")
        ags, merged, extra = run_parallel(run, model, ct)
        agents = [rl] + ags
        extra["contract"] = ct
    wall = round(time.time() - t0, 3)
    res = check(merged)
    summ = dict(run=run, design=design, model=model, rep=rep, wall=wall, check=res,
                cost=round(sum(((a["result"] or {}).get("total_cost_usd") or 0) for a in agents), 6),
                agents=[dict(path=os.path.relpath(a["path"], FM), wall=a["wall"], t0=a["t0"]) for a in agents], **extra)
    json.dump(summ, open(os.path.join(FM, "raw", run, "summary.json"), "w"), indent=1)
    print(json.dumps(dict(run=run, wall=wall, cost=summ["cost"], ran=res.get("ran"), error=res.get("error"),
                          ok=all(res.get(k) for k in ("ran", "is_table", "has_count", "has_distinct", "has_top", "top_order")))))


main()
