"""Runs every measurement for the page, one after another (about 17 minutes).

Run from a short directory (Unix socket paths are relative), with Python 3.12:
    cd <scratch> && python3.12 <this folder>/run_all.py [hockey|co|lb|all]
Raw per-request files land in the current directory; summarize.py reduces them
to ../inputs/measured.json.

hockey  one server, 1 slot, exponential service, mean 10 ms; open-loop Poisson
        arrivals at 10 utilisations from 10% to 95%.
co      the same server with a 1.5 s stall every 15 s, at 30 requests/s:
        a closed-loop generator (3 users) and an open-loop one (evenly spaced),
        60 s each.
lb      8 servers, 1 slot each, exponential service, mean 20 ms; one open-loop
        client balancing with random, round robin, power of two choices and
        least outstanding, at 70% and 90% utilisation (40 s each), plus a run at
        70% with one server three times slower (30 s each).
"""
import os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable


def servers(n, mean_ms, tag, slow=None, stall=None, dur=200):
    ps, socks = [], []
    for i in range(n):
        s = "%s%d.sock" % (tag, i)
        m = mean_ms * (3 if slow is not None and i == slow else 1)
        args = [PY, os.path.join(HERE, "server.py"), "--sock", s, "--log", "%s_srv%d.json" % (tag, i),
                "--mean-ms", str(m), "--seed", str(100 + i), "--duration", str(dur)]
        if stall:
            args += ["--stall-every", str(stall[0]), "--stall-ms", str(stall[1])]
        if os.path.exists(s + ".ready"):
            os.unlink(s + ".ready")
        ps.append(subprocess.Popen(args))
        socks.append(s)
    for s in socks:
        while not os.path.exists(s + ".ready"):
            time.sleep(0.05)
    return ps, socks


def stop(ps):
    for p in ps:
        p.terminate()
    for p in ps:
        p.wait()


def gen(socks, out, **kw):
    args = [PY, os.path.join(HERE, "loadgen.py"), "--socks", ",".join(socks), "--out", out]
    for k, v in kw.items():
        if v is True:
            args.append("--" + k)
        else:
            args += ["--" + k.replace("_", "-"), str(v)]
    subprocess.run(args, check=True)


def hockey():
    for u in [0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]:
        tag = "h%02d_" % int(u * 100)
        ps, socks = servers(1, 10, tag)
        gen(socks, tag + "cli.json", mode="open", rate=u * 100, duration=40 if u < 0.8 else 75, seed=11)
        stop(ps)
        print("hockey", u, flush=True)


def co():
    for mode in ["closed", "open"]:
        tag = "co_%s_" % mode
        ps, socks = servers(1, 10, tag, stall=(15, 1500))
        kw = dict(mode=mode, rate=30, duration=60, seed=12)
        if mode == "closed":
            kw["users"] = 3
        else:
            kw["even"] = True
        gen(socks, tag + "cli.json", **kw)
        stop(ps)
        print("co", mode, flush=True)


def lb():
    for u, slow, dur in [(0.7, None, 40), (0.9, None, 40), (0.7, 0, 30)]:
        for pol in ["random", "rr", "p2c", "lor"]:
            tag = "lb%02d%s_%s_" % (int(u * 100), "slow" if slow is not None else "", pol)
            ps, socks = servers(8, 20, tag, slow=slow)
            # capacity: 8 servers x 50/s = 400/s; with one server 3x slower: 7 x 50 + 16.7 = 366.7/s
            cap = 400 if slow is None else 7 * 50 + 50 / 3
            gen(socks, tag + "cli.json", mode="open", rate=round(u * cap, 1), duration=dur, policy=pol, seed=13)
            stop(ps)
            print("lb", u, slow, pol, flush=True)


what = sys.argv[1] if len(sys.argv) > 1 else "all"
t = time.time()
if what in ("hockey", "all"):
    hockey()
if what in ("co", "all"):
    co()
if what in ("lb", "all"):
    lb()
print("done in %.0f s" % (time.time() - t), flush=True)
