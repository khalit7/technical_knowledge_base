"""Build parts/30_js_data.js (window.HT) from src/recordings/, src/code/gym/ and src/inputs/.
Everything the page shows about the rollouts comes from here; check.py recomputes it and compares.
Statistics: success rates by model and harness; paired task-level differences between harnesses with a
bootstrap over tasks (10,000 resamples, fixed seed); GRPO-style group advantages (reward minus the group mean,
divided by the group standard deviation; groups with zero spread give zero advantage)."""
import glob, json, os, random, statistics as st, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
GYM = os.path.join(HERE, "code", "gym")
sys.path.insert(0, GYM)
from tasks import TASKS, BUGS  # noqa: E402

MODEL = {"local": "Qwen3-4B-Instruct-2507 (4-bit, local)", "haiku": "Claude Haiku 4.5"}
HARN = {"bash": "bash only", "tools": "file tools", "plain": "file tools, no line numbers", "ccfull": "Claude Code"}


def load(path):
    return [json.loads(l) for l in open(path)]


def model_of(rid):
    return "local" if rid.startswith("local") else "haiku"


def summarise(ev):
    meta, end = ev[0], ev[-1]
    calls = [e for e in ev if e["ev"] == "call"]
    obs = [e for e in ev if e["ev"] == "obs"]
    r = end["reward"]
    tools_used = {}
    for c in calls:
        for t in c["tools"]:
            tools_used[t["name"]] = tools_used.get(t["name"], 0) + 1
    dropped = sum(1 for c in calls if c.get("finish") == "tool_calls" and not c["tools"])
    edit_err = sum(1 for o in obs if o["out"].startswith("error: old text found"))
    return {"id": meta["id"], "m": model_of(meta["id"]), "h": meta["harness"], "t": meta["task"], "r": meta["rollout"],
            "bin": r.get("binary", 0), "part": r.get("partial", 0), "vis": r.get("visible_all_pass", 0),
            "ho": r.get("heldout_fail", []), "tu": r.get("tests_untouched", 1), "f2p": [r.get("f2p_pass"), r.get("f2p_total")],
            "p2p": [r.get("p2p_pass"), r.get("p2p_total")], "calls": len(calls),
            "inp": sum(c["inp"] or 0 for c in calls), "first": calls[0]["inp"] if calls else 0,
            "out": (sum(c["out"] or 0 for c in calls) if meta["id"].startswith("local") else (end.get("usage") or {}).get("out")),
            "cost": end.get("cost_usd"), "wall": end.get("wall_s"), "stop": end.get("stop"),
            "think": sum(1 for c in calls if c.get("thinking")), "edit_err": edit_err, "dropped": dropped,
            "nf": end.get("new_files", []), "diff": end.get("diff", ""),
            "res": "".join("1" if v else "0" for v in (r.get("results") or {}).values())}


def boot_diff(by_task_a, by_task_b, n=10000, seed=7):
    """Paired over tasks: mean over tasks of (success rate A minus success rate B), 95% bootstrap interval."""
    tasks = sorted(set(by_task_a) & set(by_task_b))
    d = [st.mean(by_task_a[t]) - st.mean(by_task_b[t]) for t in tasks]
    rnd = random.Random(seed)
    bs = sorted(st.mean(rnd.choice(d) for _ in d) for _ in range(n))
    return {"diff": round(st.mean(d), 4), "lo": round(bs[int(0.025 * n)], 4), "hi": round(bs[int(0.975 * n) - 1], 4), "tasks": len(tasks)}


def pc(x):
    return f"{round(100 * x)}%"


def facts(D):
    """Every number the prose quotes, as display strings (check.py re-derives them)."""
    R = [r for r in D["runs"] if r["stop"] != "infra_error"]
    T = {(x["m"], x["h"]): x for x in D["table"]}
    f = {"n_runs": str(len(R))}
    hk = [T[k]["bin"] for k in T if k[0] == "haiku"]
    f["hk_min"], f["hk_max"] = pc(min(hk)), pc(max(hk))
    for h in ("bash", "tools", "plain"):
        if ("local", h) in T:
            f["loc_" + h] = pc(T[("local", h)]["bin"])
            f["loc_" + h + "_editerr"] = str(T[("local", h)]["edit_err"])
        if ("haiku", h) in T:
            f["hk_" + h] = pc(T[("haiku", h)]["bin"])
    if ("haiku", "ccfull") in T:
        f["hk_ccfull"] = pc(T[("haiku", "ccfull")]["bin"])
    hi = [T[k]["inp"] for k in T if k[0] == "haiku"]
    f["hk_inp_ratio"] = f"{max(hi) / min(hi):.1f}"
    vnh = [r for r in R if r["vis"] and not r["bin"]]
    f["vis_not_hidden"] = str(len(vnh))
    f["apos_loose"] = str(sum(1 for r in vnh if "h_apos_quotes" in r["ho"]))
    f["tests_edited"] = str(sum(1 for r in R if not r["tu"]))
    f["capped"] = str(sum(1 for r in R if r["stop"] in ("max_calls", "error_max_turns")))
    f["sft_vis"] = str(sum(1 for r in R if r["vis"]))
    f["sft_hid"] = str(sum(1 for r in R if r["bin"]))
    for z in D["zero"]:
        k = "zero_" + ("loc" if z["m"] == "local" else "hk") + ("" if z["key"] == "bin" else "_part")
        f[k] = f"{z['zero']} of {z['groups']}"
    M = [m for m in D["mask_full"] if "counts" in m]
    if M:
        tot = sum(m["total"] for m in M)
        cnt = lambda c: sum(m["counts"].get(c, 0) for m in M)
        f["mask_n"] = str(len(M))
        for c in ("gen", "sys", "user", "obs"):
            f[c + "_share"] = pc(cnt(c) / tot)
        ch = [c for m in M for c in m["checks"]]
        f["mask_prompt_ok"] = f"{sum(1 for c in ch if c['rendered_prompt'] == c['server_prompt'])} of {len(ch)}"
        f["mask_gen_ok"] = f"{sum(1 for c in ch if c['gen_tokens'] == c['server_reply'])} of {len(ch)}"
        f["ins_total"] = str(cnt("ins"))
    def pr(m, a, b):
        for p in D["pairs"]:
            if p["m"] == m and p["key"] == "bin" and {p["a"], p["b"]} == {a, b}:
                sg = 1 if p["a"] == a else -1
                lo, hi = sorted((sg * p["lo"], sg * p["hi"]))
                return f"{sg * p['diff'] * 100:+.0f}", f"{lo * 100:+.0f} to {hi * 100:+.0f}"
        return None, None
    f["pair_loc_bash_tools"], f["pair_loc_bash_tools_ci"] = pr("local", "tools", "bash")
    f["pair_loc_plain_tools"], f["pair_loc_plain_tools_ci"] = pr("local", "plain", "tools")
    LB = [r for r in R if r["m"] == "local" and r["h"] == "bash"]
    nochange = [r for r in LB if not D["diffs"][r["d"]]]
    f["loc_bash_nochange"] = f"{len(nochange)} of {len(LB)}"
    f["loc_bash_why"] = (f"in {len(nochange)} of its {len(LB)} bash rollouts the code was never changed at all. "
                         "The model typically found the bug, then either described the fix in prose and stopped calling tools "
                         "(which ends the episode), or spent its calls on shell commands that failed on quoting.")
    for h in ("ccfull", "plain"):
        t = T.get(("haiku", h))
        if t:
            f[f"hk_{'cc' if h == 'ccfull' else h}_inp"] = f"{t['inp']:,}"
            f[f"hk_{'cc' if h == 'ccfull' else h}_first"] = f"{t['first']:,}"
            f[f"hk_{'cc' if h == 'ccfull' else h}_cost"] = f"${t['cost']:.3f}"
    cells = {}
    for r in R:
        cells.setdefault((r["m"], r["h"], r["t"]), set()).add(r["bin"])
    f["mixed_cells"] = f"{sum(1 for v in cells.values() if len(v) > 1)} of {len(cells)}"
    f["max_vis_gap"] = str(round(max((x["vis"] - x["bin"]) * 100 for x in D["table"])))
    DR = [r for r in R if r.get("dropped")]
    f["dropped_runs"] = str(len(DR))
    f["dropped_by_h"] = ", ".join(f"{sum(1 for r in DR if r['h'] == h)} {D['harness'][h]}" for h in ("bash", "tools", "plain"))
    f["dropped_won"] = str(sum(r["bin"] for r in DR))
    if M:
        f["mask_off_small"] = str(sum(1 for c in ch if 0 < abs(c["gen_tokens"] - c["server_reply"]) <= 2))
        f["mask_off_big"] = str(sum(1 for c in ch if abs(c["gen_tokens"] - c["server_reply"]) > 2))
        f["mask_calls"] = str(len(ch))
    tm = json.load(open(os.path.join(HERE, "inputs", "timing.json")))
    f["t_start"] = f"{tm['container_start_s']:.2f}"
    f["t_verify"] = f"{min(tm['verifier_s']):.2f} to {max(tm['verifier_s']):.2f}"
    return f


def main():
    runs, traj = [], {}
    for f in sorted(glob.glob(os.path.join(REC, "*.jsonl"))):
        ev = load(f)
        s = summarise(ev)
        runs.append(s)
        traj[s["id"]] = ev
    # dedupe diffs
    diffs, dkey = [], {}
    for s in runs:
        d = s.pop("diff")
        if d not in dkey:
            dkey[d] = len(diffs)
            diffs.append(d)
        s["d"] = dkey[d]
    # success tables
    cells = {}
    for s in runs:
        cells.setdefault((s["m"], s["h"]), []).append(s)
    table = []
    for (m, h), L in sorted(cells.items()):
        costs = [x["cost"] for x in L if x["cost"] is not None]
        table.append({"m": m, "h": h, "n": len(L), "bin": round(st.mean(x["bin"] for x in L), 4),
                      "vis": round(st.mean(x["vis"] for x in L), 4), "part": round(st.mean(x["part"] for x in L), 4),
                      "calls": round(st.mean(x["calls"] for x in L), 2), "inp": round(st.mean(x["inp"] for x in L)),
                      "first": round(st.mean(x["first"] for x in L)), "cost": round(st.mean(costs), 5) if costs else None,
                      "edit_err": sum(x["edit_err"] for x in L)})
    # paired comparisons within each model (reward = binary hidden-test reward, and visible-test success)
    pairs = []
    for m in ("local", "haiku"):
        hs = sorted({h for (mm, h) in cells if mm == m})
        for i, a in enumerate(hs):
            for b in hs[i + 1:]:
                for key in ("bin", "vis"):
                    A, B = {}, {}
                    for x in cells[(m, a)]:
                        A.setdefault(x["t"], []).append(x[key])
                    for x in cells[(m, b)]:
                        B.setdefault(x["t"], []).append(x[key])
                    pairs.append({"m": m, "a": a, "b": b, "key": key, **boot_diff(A, B)})
    # groups and GRPO advantages: one group = one model, harness and task, all its rollouts
    groups = []
    for (m, h), L in sorted(cells.items()):
        by = {}
        for x in L:
            by.setdefault(x["t"], []).append(x)
        for t, G in sorted(by.items()):
            G = sorted(G, key=lambda x: x["r"])
            out = {"m": m, "h": h, "t": t, "ids": [x["id"] for x in G]}
            for key in ("bin", "part"):
                rs = [x[key] for x in G]
                mu = st.mean(rs)
                sd = st.pstdev(rs)
                out[key] = rs
                out[key + "_adv"] = [round((x - mu) / sd, 4) if sd > 0 else 0.0 for x in rs]
                out[key + "_mu"], out[key + "_sd"] = round(mu, 4), round(sd, 4)
            groups.append(out)
    zero = {}
    for g in groups:
        for key in ("bin", "part"):
            k = (g["m"], key)
            z = zero.setdefault(k, {"m": g["m"], "key": key, "groups": 0, "zero": 0, "all1": 0, "all0": 0})
            z["groups"] += 1
            if g[key + "_sd"] == 0:
                z["zero"] += 1
                if key == "bin":
                    z["all1" if g["bin"][0] == 1 else "all0"] += 1
    mask = json.load(open(os.path.join(HERE, "inputs", "mask.json"))) if os.path.exists(os.path.join(HERE, "inputs", "mask.json")) else []
    papers = json.load(open(os.path.join(HERE, "inputs", "papers.json")))
    meta_t = json.load(open(os.path.join(GYM, "meta.json")))
    hidden = open(os.path.join(GYM, "hidden", "hidden_tests.py")).read()
    import re
    checks = re.findall(r'\("([vh]_\w+)", "(\w+)", "((?:[^"\\]|\\.)*)"\)', hidden)
    data = {
        "models": MODEL, "harness": HARN,
        "tasks": [{"id": t, "bugs": b, "prompt": p, "f2p": meta_t[t]["f2p"], "p2p": len(meta_t[t]["p2p"])} for t, (b, p) in TASKS.items()],
        "bugs": {k: {"file": v[0], "old": v[1], "new": v[2]} for k, v in BUGS.items()},
        "checks": [{"n": n, "area": a, "expr": e.encode().decode("unicode_escape")} for n, a, e in checks],
        "runs": runs, "diffs": diffs, "table": table, "pairs": pairs, "groups": groups, "zero": list(zero.values()),
        "mask": mask, "papers": papers,
    }
    # condensed trajectories for the viewer: every rollout, tool outputs cut to 600 characters, thinking flagged only
    tv = {}
    for rid, ev in traj.items():
        if ev[0]["rollout"] != "r1":
            continue                      # the page embeds the first rollout of each cell; all are in recordings/
        c = []
        for e in ev[1:-1]:
            if e["ev"] == "call":
                c.append(["c", e["inp"], e["out"], e["text"][:260], [[t["name"], t["args"][:260]] for t in e["tools"]], 1 if e.get("thinking") else 0])
            elif e["ev"] == "obs":
                o = e["out"]
                c.append(["o", e["name"], o[:260] + ("\n[...]" if len(o) > 260 else ""), e["chars"]])
        tv[rid] = c
    data["traj"] = tv
    data["sys"] = {h: next((ev[0]["system"] for ev in traj.values() if ev[0]["harness"] == h and ev[0].get("system")), None) for h in HARN}
    from harnesses import HARNESS
    data["tooldefs"] = {h: HARNESS[h][1] for h in HARNESS}
    rp = os.path.join(HERE, "inputs", "redaction.json")
    data["redaction"] = json.load(open(rp)) if os.path.exists(rp) else {}
    # embed per-rollout mask summaries; token views and per-call checks only for the rollouts shown
    data["mask"] = [{k: v for k, v in m.items() if m.get("runs") or k != "checks"} for m in mask]
    data["frameworks"] = json.load(open(os.path.join(HERE, "inputs", "frameworks.json")))
    data["mask_full"] = mask
    data["f"] = facts(data)
    del data["mask_full"]
    body = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    js = "// Built by src/extract.py from src/recordings/ and src/code/gym/. Do not edit.\nwindow.HT=" + body + ";\n"
    open(os.path.join(HERE, "parts", "30_js_data.js"), "w").write(js)
    json.dump({"table": table, "pairs": pairs, "zero": list(zero.values())}, open(os.path.join(HERE, "inputs", "stats.json"), "w"), indent=1)
    print(len(runs), "runs;", len(js) // 1024, "KB of data")


if __name__ == "__main__":
    main()
