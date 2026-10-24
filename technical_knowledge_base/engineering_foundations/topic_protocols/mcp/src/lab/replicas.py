"""One confirm-then-delete tool call through a round-robin balancer in front of two replicas, four ways:
legacy (2025-11-25 session) with round robin, legacy with session affinity, modern (2026-07-28) with
per-process requestState keys, modern with a shared key. Usage: python replicas.py OUT.json [N]
Ports: balancer 30710, replicas 30711 and 30712. No model is called; the user's 'yes' is a scripted callback."""
import asyncio, json, os, subprocess, sys, time, httpx
from mcp import Client
from mcp_types import ElicitResult

OUT, N = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 20
HERE = os.path.dirname(os.path.abspath(__file__)); PY = sys.executable
LB, A, B = 30710, 30711, 30712
SCEN = [("legacy", "rr", None), ("legacy", "sticky", None), ("modern", "rr", None), ("modern", "rr", "k" * 32)]


def wait(port):
    for _ in range(100):
        try:
            httpx.get(f"http://127.0.0.1:{port}/", timeout=0.2); return
        except Exception:
            time.sleep(0.1)


async def on_elicit(ctx, params):
    return ElicitResult(action="accept", content={"confirm": True})


async def one(mode):
    t0 = time.perf_counter()
    try:
        async with Client(f"http://127.0.0.1:{LB}/mcp", mode=("legacy" if mode == "legacy" else "2026-07-28"),
                          elicitation_callback=on_elicit, read_timeout_seconds=5) as c:
            r = await c.call_tool("delete_checkpoint", {"name": "llama-7b-step-2000"})
            txt = r.content[0].text if r.content else ""
            ok = (not r.is_error) and txt.startswith("deleted")
            return ok, txt[:300], time.perf_counter() - t0
    except BaseException as e:
        while isinstance(e, BaseExceptionGroup) and len(e.exceptions) == 1:
            e = e.exceptions[0]
        return False, f"{type(e).__name__}: {e}"[:300], time.perf_counter() - t0


async def main():
    res = []
    for era, lbmode, key in SCEN:
        env = dict(os.environ); env.pop("MCP_STATE_KEY", None)
        if key: env["MCP_STATE_KEY"] = key
        procs = [subprocess.Popen([PY, os.path.join(HERE, "ckpt_server.py"), "http", str(p)], env=env,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) for p in (A, B)]
        procs.append(subprocess.Popen([PY, os.path.join(HERE, "lb_proxy.py"), str(LB), lbmode,
                                       f"http://127.0.0.1:{A}", f"http://127.0.0.1:{B}"],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        for p in (A, B, LB): wait(p)
        httpx.get(f"http://127.0.0.1:{LB}/__log")  # clear the readiness probes
        first = await one(era)
        trace = httpx.get(f"http://127.0.0.1:{LB}/__log").json()
        outcomes = [first] + [await one(era) for _ in range(N - 1)]
        for p in procs: p.terminate()
        for p in procs: p.wait()
        r = {"era": era, "balancer": lbmode, "shared_key": bool(key), "first": {"ok": first[0], "detail": first[1]},
             "trace": trace, "n": N, "ok": sum(o[0] for o in outcomes),
             "errors": sorted({o[1] for o in outcomes if not o[0]}),
             "median_ms": round(sorted(o[2] for o in outcomes)[N // 2] * 1000, 1)}
        res.append(r)
        print(era, lbmode, "key" if key else "-", f"{r['ok']}/{N}", r["errors"][:2])
    json.dump(res, open(OUT, "w"), indent=1)

asyncio.run(main())
