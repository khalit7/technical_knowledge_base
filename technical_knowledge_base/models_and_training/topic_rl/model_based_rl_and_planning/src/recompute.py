"""Recompute every number the Model-based RL and planning page computes or quotes from its own experiments.

Writes expected.json (compared with the page's engine by check_engine.mjs) and prints a summary
(saved as recompute_output.txt). Pure Python, no dependencies; about 3 to 4 minutes.
Run from src/: python3 recompute.py > recompute_output.txt
"""
import json, math, os, sys, time
import mb_ref as m
HERE = os.path.dirname(os.path.abspath(__file__))
t0 = time.time(); out = {}
def say(*a): print(*a, flush=True)

# ---------- 1. Dyna ----------
DY = {"alpha": 0.1, "eps": 0.1, "gamma": 0.95}
curves = m.dyna_curves((0, 5, 50), 30, 50, **DY)
out["dyna_curves"] = {str(n): [round(x, 6) for x in v["mean"]] for n, v in curves.items()}
first = curves[0]["first"]; out["dyna_first_mean"] = sum(first) / len(first)
say("Figure 8.2 (30 runs): first-episode mean", round(out["dyna_first_mean"], 1), "(identical for every n:",
    curves[0]["first"] == curves[5]["first"] == curves[50]["first"], ")")
for n, v in curves.items():
    mm = v["mean"]; reach = next((e + 1 for e in range(1, 50) if all(x <= 20 for x in mm[e:])), None)
    say(" n =", n, "episode 2:", round(mm[1], 1), "episode 50:", round(mm[-1], 1), "first episode after which every mean is <= 20 steps:", reach)
# exact expected length of a uniformly random walk from S to G (what episode 1 is, since every value is 0 until the goal)
mz = m.MAZES["dyna"]; w = m.wallset(mz); S = 54; g = 8; s0 = 18
# solve h = 1 + mean over actions of h(next) by Gauss-Seidel to convergence
h = [0.0] * S
for it in range(200000):
    d = 0.0
    for s in range(S):
        if s == g or s in w: continue
        nv = 1 + sum(h[m.maze_step(mz, w, s, a)] for a in range(4)) / 4
        d = max(d, abs(nv - h[s])); h[s] = nv
    if d < 1e-10: break
out["dyna_walk_expected"] = h[s0]; say("exact expected length of episode 1 (random walk from S):", round(h[s0], 2))
out["dyna_snap"] = {str(n): m.dyna_snapshot(n, 0, **DY) for n in (0, 5, 50)}
for n, sn in out["dyna_snap"].items(): say(" Figure 8.3 run 0, n =", n, "episode lengths", sn["lens"], "arrows at midpoint of episode 2:", sn["arrows"])

CH = {"n": 50, "alpha": 1.0, "eps": 0.1, "gamma": 0.95, "kappa": 1e-3, "runs": 20}
out["changing"] = {}
for name, steps, sw in (("block", 3000, 1000), ("short", 6000, 3000)):
    for plus in (False, True):
        c = m.changing_maze(name, plus, steps, sw, CH["n"], CH["alpha"], CH["eps"], CH["gamma"], CH["kappa"] if plus else 0.0, CH["runs"])
        key = name + ("_plus" if plus else "")
        out["changing"][key] = [round(c[t], 6) for t in range(99, steps, 100)]
        say(" changing maze", key, "at switch", round(c[sw - 1], 1), "at end", round(c[-1], 1), "last 1000 steps slope", round((c[-1] - c[-1001]) / 1000, 4))
say("dyna done", round(time.time() - t0), "s")

# ---------- 2. Tic-tac-toe ----------
m.solve([0] * 9)
STATES = sorted(list(k) for k, (v, opt) in m.SOLVED.items() if opt)
say("tic-tac-toe: non-terminal positions", len(STATES), "all positions", len(m.SOLVED))
net = json.load(open(os.path.join(HERE, "inputs", "ttt_net.json")))
nets = {k: m.Net(v["w"]) for k, v in net["ckpts"].items()}
out["ttt"] = {}
for k, nt in nets.items():
    acc = 0; mae = 0.0; sgn = 0
    for b in STATES:
        vs, opt = m.SOLVED[tuple(b)]; p, v = nt.evaluate(b)
        a = max(range(9), key=lambda i: (p[i] if b[i] == 0 else -1, -i)); acc += a in opt; mae += abs(v - vs)
        sgn += (vs == 0 and abs(v) < 1/3) or (vs == 1 and v >= 1/3) or (vs == -1 and v <= -1/3)
    r = {"prior_opt": acc / len(STATES), "v_mae": mae / len(STATES), "v_class": sgn / len(STATES)}
    tq = net["ckpts"][k]["metrics_quantised"]
    say(" checkpoint", k, "prior optimal", round(r["prior_opt"], 4), "(training script:", round(tq["prior_opt"], 4), ") value MAE", round(r["v_mae"], 4),
        "value in the right third", round(r["v_class"], 4), "| search optimal (training script, 50 sims)", round(tq["search_opt"], 4))
    out["ttt"][k] = r

SHOW = [-1, 0, 0, 1, 1, 0, 0, 0, 0]   # O to move; X threatens the middle row; the only move that does not lose is 5
out["show"] = {"board": SHOW, "solved": m.SOLVED[tuple(SHOW)]}
out["show"]["puct60"] = m.puct(nets["60"], SHOW, 30, True)
out["show"]["puct0"] = m.puct(nets["0"], SHOW, 30, True)
out["show"]["uct"] = m.uct(SHOW, 30, m.Rng(4242), True)
say(" showcase: PUCT (final net) visits", out["show"]["puct60"]["N"], "| PUCT (untrained net)", out["show"]["puct0"]["N"], "| UCT seed 4242", out["show"]["uct"]["N"])
SIMS = [4, 8, 16, 32, 64, 128, 256, 512, 1024]
rel = {"sims": SIMS, "uct": [], "puct": {}}
for s in SIMS:
    rel["uct"].append(sum(m.top(m.uct(SHOW, s, m.Rng(7000 + i))["N"]) == 5 for i in range(40)) / 40)
for k in ("0", "1", "60"):
    rel["puct"][k] = [1.0 if m.top(m.puct(nets[k], SHOW, s)["N"]) == 5 else 0.0 for s in SIMS]
out["reliability"] = rel
say(" UCT (40 seeds) share choosing the block, by simulations", list(zip(SIMS, rel["uct"])))
say(" PUCT final net, by simulations", rel["puct"]["60"], "untrained", rel["puct"]["0"])

# games against a perfect player who picks uniformly among optimal moves (rng 31337); 50 games as X, 50 as O
def play(agent, k_side, r):
    b = [0] * 9
    while not m.terminal(b)[0]:
        if m.mover(b) == k_side: a = agent(b)
        else:
            opt = m.SOLVED[tuple(b)][1]; a = opt[int(r() * len(opt))]
        b[a] = m.mover(b)
    return m.terminal(b)[1] * k_side   # +1 agent won, 0 draw, -1 lost
out["games"] = {}
for k in ("0", "1", "3", "10", "60"):
    nt = nets[k]; res = {}
    for nm, ag in (("raw", lambda b, nt=nt: max(range(9), key=lambda i: (nt.evaluate(b)[0][i] if b[i] == 0 else -1, -i))),
                   ("search50", lambda b, nt=nt: m.top(m.puct(nt, b, 50)["N"]))):
        r = m.Rng(31337); losses = 0; draws = 0
        for gm in range(100):
            z = play(ag, 1 if gm < 50 else -1, r); losses += z < 0; draws += z == 0
        res[nm] = {"losses": losses, "draws": draws}
    out["games"][k] = res; say(" vs perfect player, checkpoint", k, res)
say("tic-tac-toe done", round(time.time() - t0), "s")

# ---------- 3. Pendulum ----------
pm = json.load(open(os.path.join(HERE, "inputs", "pendulum_models.json")))
mem = [m.PMember(w, pm["out_scale"]) for w in pm["members"]]
tests = m.pend_tests()
op = m.pend_error_curves(mem, tests, 0); br = m.pend_error_curves(mem, tests, 5)
out["pend"] = {"open": op, "branch5": br}
mean = lambda c, t: sum(e[t] for e in c["err"]) / len(c["err"])
say("pendulum: mean |angle error| (rad) of the five members, open-loop: step 1", round(mean(op, 1), 5), "step 10", round(mean(op, 10), 4),
    "step 25", round(mean(op, 25), 4), "step 50", round(mean(op, 50), 4), "| spread at 50", round(op["spread"][50], 4))
say("  ratio step 50 / step 1:", round(mean(op, 50) / mean(op, 1)), "| branched k = 5, mean over steps 1 to 50:", round(sum(mean(br, t) for t in range(1, 51)) / 50, 4),
    "open-loop mean over steps 1 to 50:", round(sum(mean(op, t) for t in range(1, 51)) / 50, 4))
# the animation's example: test 0 with member 0
EX = 5   # the animation's example: test 5, member 0 (it falls, swings back up near the top around step 30, and the model goes over where the real one does not)
T, Mo = m.pend_rollout(mem[0], *tests[EX], 0); out["pend"]["ex_open"] = {"T": T, "M": Mo}
T, Mo = m.pend_rollout(mem[0], *tests[EX], 5); out["pend"]["ex_k5"] = {"T": T, "M": Mo}
say("  example (test", EX, ", member 0): error at steps 10, 25, 50 open-loop", [round(abs(m.wrap(out["pend"]["ex_open"]["M"][t] - T[t])), 4) for t in (10, 25, 50)])
# the error distribution is heavy-tailed: median and 90th percentile at step 50 (member 0)
e50 = sorted(abs(m.wrap(m.pend_rollout(mem[0], *te, 0)[1][50] - m.pend_rollout(mem[0], *te, 0)[0][50])) for te in tests)
out["pend"]["m0_step50"] = {"median": e50[len(e50) // 2], "p90": e50[int(0.9 * len(e50))], "mean": sum(e50) / len(e50), "over_0p5": sum(1 for x in e50 if x > 0.5)}
say("  member 0 at step 50: median", round(e50[len(e50)//2], 4), "90th percentile", round(e50[int(0.9*len(e50))], 4), "mean", round(sum(e50)/len(e50), 4), "tests off by more than 0.5 rad:", out["pend"]["m0_step50"]["over_0p5"], "of", len(e50))

json.dump(out, open(os.path.join(HERE, "expected.json"), "w"))
say("done", round(time.time() - t0), "s")
