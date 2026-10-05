"""Anthropic's five workflow patterns plus a free agent, on one input: fix textstats.
Usage: python3 patterns.py <chain|route|parallel|orch|evalopt|agent>
Workflow patterns: the model (claude -p, tools disabled) only returns text; this code
reads files, runs tests and writes files. The agent: Claude Code with its own tools."""
import sys, json, os, subprocess, time
from concurrent.futures import ThreadPoolExecutor
import lib

TASK_PROMPT = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
SYS = "You are a careful Python engineer. Follow the requested output format exactly."


def context(d):
    ok, out = lib.run_tests(d)
    return (f"{TASK_PROMPT}\n\n--- textstats/core.py ---\n{lib.read(d, 'textstats/core.py')}\n"
            f"--- tests/test_core.py ---\n{lib.read(d, 'tests/test_core.py')}\n"
            f"--- output of `python3 tests/test_core.py` ---\n{out}\n"), out


def finish(run, clock, d, extra=None):
    t0 = clock.now()
    ok, out = lib.run_tests(d)
    hid = lib.hidden_checks(d)
    lib.code_event(clock, "test", "run tests + hidden checks", t0, dict(passed=ok, output=out, hidden=hid))
    return lib.save_summary(run, clock, dict(passed=ok, test_output=out, hidden=hid,
                                             final_core=lib.read(d, "textstats/core.py"), **(extra or {})))


def failing_tests(out):
    return [l.split()[1] for l in out.splitlines() if l.startswith("FAIL")]


def test_source(d, name):
    src = lib.read(d, "tests/test_core.py")
    i = src.find(f"def {name}")
    j = src.find("\n\n", i)
    return src[i:j]


# 1. Prompt chaining: diagnose -> gate -> fix -> test
def chain():
    run, clock = "chain", lib.Clock()
    d = lib.fresh_copy(run)
    ctx, out = context(d)
    diag, _ = lib.call_model(run, "1_diagnose", SYS, ctx + "\nStep 1 of 2. Do not write code yet. List each root cause as a numbered line: the function, what it does wrong, and the failing test it explains.", clock, node="diagnose")
    t0 = clock.now()
    fails = failing_tests(out)
    covered = [f for f in fails if f in diag]
    gate_ok = len(covered) == len(fails)
    lib.code_event(clock, "gate", "gate: does the diagnosis name every failing test?", t0, dict(failing=fails, named=covered, ok=gate_ok))
    fix, _ = lib.call_model(run, "2_fix", SYS, ctx + "\nA colleague diagnosed the failures:\n" + diag +
                            "\n\nStep 2 of 2. Return the complete corrected textstats/core.py in one ```python block and nothing else.", clock, node="fix")
    t0 = clock.now()
    code = lib.code_block(fix)
    if code:
        lib.write(d, "textstats/core.py", code)
    lib.code_event(clock, "apply", "write core.py", t0, dict(applied=bool(code)))
    return finish(run, clock, d, dict(gate_ok=gate_ok))


# 2. Routing: classify each failure, send it to a specialist prompt
ROUTES = {
    "text_parsing": "You are a specialist in text parsing and regular expressions in Python. You fix tokenizers so they match their documented behaviour on contractions, case and punctuation.",
    "ordering": "You are a specialist in sorting and ranking in Python. You fix sort keys so ties and orderings match the documented behaviour exactly.",
    "other": "You are a careful Python engineer.",
}


def route():
    run, clock = "route", lib.Clock()
    d = lib.fresh_copy(run)
    ctx, out = context(d)
    fails = failing_tests(out)
    r, _ = lib.call_model(run, "1_router", SYS, ctx + "\nClassify each failing test into exactly one category: text_parsing, ordering, other. Also name the function in core.py to change. Reply with JSON only: [{\"test\": ..., \"category\": ..., \"function\": ...}]", clock, node="router")
    t0 = clock.now()
    try:
        routes = lib.json_block(r)
    except Exception:
        routes = [dict(test=f, category="other", function="") for f in fails]
    lib.code_event(clock, "dispatch", "dispatch by category", t0, dict(routes=routes))
    src = lib.read(d, "textstats/core.py")
    for k, item in enumerate(routes):
        cat = item.get("category", "other")
        sysp = ROUTES.get(cat, ROUTES["other"])
        fn = item.get("function", "")
        ans, _ = lib.call_model(run, f"{2+k}_{cat}", sysp + " Follow the requested output format exactly.",
                                f"--- textstats/core.py ---\n{src}\n--- failing test ---\n{test_source(d, item.get('test',''))}\n\n"
                                f"Fix the function `{fn}` so this test passes and its docstring holds. Return only the corrected `def {fn}` in one ```python block.", clock, node="h_" + cat)
        t0 = clock.now()
        code = lib.code_block(ans)
        rep = []
        if code:
            src, rep = lib.merge_functions(src, code)
        lib.code_event(clock, "merge", f"merge {rep}", t0, dict(replaced=rep))
    lib.write(d, "textstats/core.py", src)
    return finish(run, clock, d, dict(routes=routes))


# 3. Parallelisation (sectioning): one call per failing test, at the same time
def parallel():
    run, clock = "parallel", lib.Clock()
    d = lib.fresh_copy(run)
    ctx, out = context(d)
    fails = failing_tests(out)
    src = lib.read(d, "textstats/core.py")

    def one(k, name):
        return lib.call_model(run, f"1_{name}", SYS,
                              f"--- textstats/core.py ---\n{src}\n--- failing test ---\n{test_source(d, name)}\n\n"
                              "Fix only the function responsible for this failure, keeping its docstring true. Return only that corrected function definition in one ```python block.", clock, node=f"w{k}")[0]
    with ThreadPoolExecutor(len(fails)) as ex:
        answers = list(ex.map(lambda a: one(*a), enumerate(fails)))
    t0 = clock.now()
    reps = []
    for a in answers:
        c = lib.code_block(a)
        if c:
            src, rep = lib.merge_functions(src, c)
            reps += rep
    lib.write(d, "textstats/core.py", src)
    lib.code_event(clock, "merge", "merge sections", t0, dict(replaced=reps))
    return finish(run, clock, d, dict(sections=fails))


# 4. Orchestrator-workers: the model decides the subtasks, workers do them, orchestrator checks
def orch():
    run, clock = "orch", lib.Clock()
    d = lib.fresh_copy(run)
    ctx, out = context(d)
    plan_txt, _ = lib.call_model(run, "1_plan", SYS, ctx + "\nYou are the orchestrator. Break the work into independent subtasks, one per function that must change, for worker engineers who will see only core.py and your instruction. Reply with JSON only: [{\"function\": ..., \"instruction\": ...}]", clock, node="orchestrator")
    t0 = clock.now()
    plan = lib.json_block(plan_txt)
    lib.code_event(clock, "plan", f"{len(plan)} subtasks", t0, dict(plan=plan))
    src = lib.read(d, "textstats/core.py")

    def work(k, st):
        return lib.call_model(run, f"2_worker{k}", SYS, f"--- textstats/core.py ---\n{src}\n\nTask: {st['instruction']}\nReturn only the corrected `def {st['function']}` in one ```python block.", clock, node=f"w{k}")[0]
    with ThreadPoolExecutor(max(1, len(plan))) as ex:
        answers = list(ex.map(lambda a: work(*a), enumerate(plan)))
    t0 = clock.now()
    for a in answers:
        c = lib.code_block(a)
        if c:
            src, _ = lib.merge_functions(src, c)
    lib.write(d, "textstats/core.py", src)
    ok, out2 = lib.run_tests(d)
    lib.code_event(clock, "merge", "merge + run tests", t0, dict(passed=ok, output=out2))
    syn, _ = lib.call_model(run, "3_synthesize", SYS, f"You are the orchestrator. Your workers' changes are merged.\n--- textstats/core.py ---\n{src}\n--- test output ---\n{out2}\n\nIf the file is correct and complete, reply exactly OK. Otherwise return the complete corrected file in one ```python block.", clock, node="synth")
    t0 = clock.now()
    c = lib.code_block(syn)
    if c and syn.strip() != "OK":
        lib.write(d, "textstats/core.py", c)
    lib.code_event(clock, "apply", "apply synthesis", t0, dict(changed=bool(c)))
    return finish(run, clock, d, dict(plan=plan))


# 5. Evaluator-optimizer: generate, evaluate (tests + reviewer), feed back, repeat
def evalopt():
    run, clock = "evalopt", lib.Clock()
    d = lib.fresh_copy(run)
    ctx, out = context(d)
    feedback, rounds = "", []
    for k in range(3):
        g, _ = lib.call_model(run, f"{k+1}a_generate", SYS, ctx + (f"\nYour previous attempt was reviewed:\n{feedback}\n" if feedback else "") +
                              "\nReturn the complete corrected textstats/core.py in one ```python block and nothing else.", clock, node="generator")
        t0 = clock.now()
        code = lib.code_block(g) or lib.read(d, "textstats/core.py")
        lib.write(d, "textstats/core.py", code)
        ok, tout = lib.run_tests(d)
        lib.code_event(clock, "tests", "evaluator 1: run tests", t0, dict(passed=ok, output=tout))
        if not ok:
            feedback = "Tests still fail:\n" + tout
            rounds.append(dict(round=k + 1, tests=ok, review="(not reached)"))
            continue
        e, _ = lib.call_model(run, f"{k+1}b_review", "You are a strict code reviewer.",
                              f"--- textstats/core.py ---\n{code}\n\nThe visible tests pass. Check each function against its docstring for inputs the tests do not cover (for example capitalised contractions, possessives, quotes around words, ties beyond the first two, empty text). Reply with the single word PASS if it is correct, otherwise list concrete failing inputs with expected outputs.", clock, node="evaluator")
        rounds.append(dict(round=k + 1, tests=ok, review=e.strip()[:600]))
        if e.strip().upper().startswith("PASS"):
            break
        feedback = e
        t0 = clock.now()
        lib.code_event(clock, "loop", "feedback to generator", t0, {})
    return finish(run, clock, d, dict(rounds=rounds))


# 6. A free agent: Claude Code with Read, Edit, Bash in the repo copy; it chooses every step
def agent(model="haiku", run="agent", extra_sys=""):
    clock = lib.Clock()
    d = lib.fresh_copy(run)
    os.makedirs(os.path.join(lib.REC, run), exist_ok=True)
    tools = "Read,Edit,Write,Bash,Grep,Glob" + (",Agent" if "subagent" in extra_sys else "")
    cmd = ["claude", "-p", TASK_PROMPT, "--output-format", "stream-json", "--verbose", "--no-session-persistence",
           "--setting-sources", "project", "--strict-mcp-config", "--model", model, "--tools", tools,
           "--permission-mode", "acceptEdits", "--allowedTools", "Bash(python3:*)", "Bash(python:*)",
           "--append-system-prompt", "Never use the em-dash character." + extra_sys, "--max-turns", "30"]
    lib.bump(run)
    t0 = clock.now()
    p = subprocess.run(cmd, cwd=d, capture_output=True, text=True, timeout=900)
    t1 = clock.now()
    with open(os.path.join(lib.REC, run, "agent.jsonl"), "w") as f:
        f.write(p.stdout)
    res = [json.loads(l) for l in p.stdout.splitlines() if l.startswith("{") and '"type":"result"' in l.replace(" ", "")]
    res = res[-1] if res else {}
    u = res.get("usage", {})
    clock.events.append(dict(node="agent", kind="agent", label="claude -p with tools", model=model, t0=t0, t1=t1,
                             input=u.get("input_tokens", 0), cache_write=u.get("cache_creation_input_tokens", 0),
                             cache_read=u.get("cache_read_input_tokens", 0), output=u.get("output_tokens", 0),
                             cost=res.get("total_cost_usd", 0), num_turns=res.get("num_turns"), modelUsage=res.get("modelUsage"),
                             subagent_stats=res.get("subagent_stats")))
    return finish(run, clock, d)


if __name__ == "__main__":
    name = sys.argv[1]
    if name == "multi":
        s = agent("haiku", "multi", " For this task you must delegate: first run the tests yourself, then launch one subagent with the Task tool per failing test (all of them in a single message so they run in parallel); each subagent investigates its failure and reports the root cause and the exact fix. Do not read textstats/core.py yourself before they report. Then apply their fixes yourself and run the tests again.")
    else:
        s = globals()[name]()
    print(json.dumps(dict(run=s["run"], wall=s["wall"], passed=s["passed"], hidden=sum(h[1] for h in s["hidden"]),
                          calls=sum(1 for e in s["events"] if e["kind"] != "code"),
                          cost=round(sum(e.get("cost", 0) for e in s["events"]), 5))))
