#!/usr/bin/env python3
"""Compare recorded runs of the running example: per-step global loss (gloss) of each run, bit for bit.

usage: python compare_runs.py runs/slurm runs/k8s runs/ray [--json out.json]
Reads rank0.jsonl of each run folder (gloss is all-reduced, so every rank logs the same value).
Prints a table and whether all runs agree exactly at every logged step; with --json writes the summary.
"""
import json, os, sys


def load(folder):
    steps, meta = {}, {}
    with open(os.path.join(folder, "rank0.jsonl")) as f:
        for line in f:
            r = json.loads(line)
            if r["ev"] == "step":
                steps[r["step"]] = r["gloss"]
            elif r["ev"] == "start":
                meta = {"world": r["world"], "torch": r.get("torch"), "params": r.get("params"),
                        "launcher": r.get("launcher", "torchrun")}
            elif r["ev"] == "end":
                meta["wall_s"] = r.get("wall_s")
    return steps, meta


def main():
    args = sys.argv[1:]
    out = None
    if "--json" in args:
        i = args.index("--json"); out = args[i + 1]; del args[i:i + 2]
    runs = {os.path.basename(os.path.normpath(a)): load(a) for a in args}
    names = list(runs)
    common = sorted(set.intersection(*(set(s) for s, _ in runs.values())))
    print("step  " + "  ".join(f"{n:>20}" for n in names) + "  same")
    rows, all_same = [], True
    for st in common:
        vals = [runs[n][0][st] for n in names]
        same = len(set(vals)) == 1
        all_same &= same
        rows.append({"step": st, **{n: runs[n][0][st] for n in names}, "same": same})
        print(f"{st:4d}  " + "  ".join(f"{v:20.16f}" for v in vals) + f"  {'yes' if same else 'NO'}")
    print("all logged steps identical:", all_same)
    if out:
        json.dump({"runs": {n: runs[n][1] for n in names}, "steps": rows, "identical": all_same},
                  open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
