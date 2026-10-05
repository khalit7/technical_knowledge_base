"""Cases for check_js.mjs: every scenario under several configurations, plus random request streams."""
import json, random
MiB = 1 << 20
S = json.load(open("scenarios.json"))
cfgs = [dict(), dict(expandable=True), dict(max_split=200 * MiB), dict(divisions=4), dict(max_split=40 * MiB, divisions=2)]
cases = {}
for name, sc in S.items():
    for i, c in enumerate(cfgs):
        for capf in (1.0, 0.85, 1.3):
            cfg = dict(c, capacity=int(sc["cap"] * capf) // 512 * 512)
            cases[f"{name}/{i}/{capf}"] = {"cfg": cfg, "ops": sc["ops"]}
rng = random.Random(5)
for k in range(40):
    ops, live = [], []
    for j in range(rng.randint(30, 120)):
        if live and rng.random() < 0.45:
            ops.append(["-", live.pop(rng.randrange(len(live)))])
        else:
            t = f"r{j}"; live.append(t)
            ops.append(["+", t, rng.choice([rng.randint(1, 1 << 20), rng.randint(1 << 20, 12 << 20), rng.randint(12 << 20, 300 << 20)])])
    c = dict(cfgs[k % len(cfgs)], capacity=rng.choice([256, 512, 1024]) * MiB)
    cases[f"random/{k}"] = {"cfg": c, "ops": ops}
json.dump(cases, open("cases.json", "w"))
print(len(cases), "cases")
