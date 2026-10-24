"""The same tool call (list_checkpoints) over every transport shape the Python SDK speaks, measured on one laptop.
Cold: from opening the client to the first result (stdio includes starting the Python server process).
Warm: N further calls on the open client. Bytes: one warm call, counted on the wire (TCP tap) or on the pipes (tee).
Usage: python transports.py OUT.json [N]. Ports 30721-30722 (servers), 30731-30732 (taps). No model is called."""
import asyncio, json, os, subprocess, sys, time, statistics, httpx
from mcp import Client, StdioServerParameters
from tcp_tap import Tap

OUT, N = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 300
HERE = os.path.dirname(os.path.abspath(__file__)); PY = sys.executable; SRV = os.path.join(HERE, "ckpt_server.py")
ARGS = {"run": "llama-7b-sft"}


def wait(port):
    for _ in range(100):
        try:
            httpx.get(f"http://127.0.0.1:{port}/", timeout=0.2); return
        except Exception:
            time.sleep(0.1)


async def measure(target, mode, tap=None, tee=None, R=7):
    colds = []
    for _ in range(R):
        t0 = time.perf_counter()
        async with Client(target, mode=mode, cache=None) as c:
            await c.call_tool("list_checkpoints", ARGS)
            colds.append(time.perf_counter() - t0)
    cold = statistics.median(colds)
    cold_trace = None
    if tap:
        tap.conns = []
    if tee:
        open(tee, "w").close()
    async with Client(target, mode=mode, cache=None) as c:
        await c.call_tool("list_checkpoints", ARGS)
        await asyncio.sleep(0.2)
        if tee:
            cold_trace = [json.loads(l) for l in open(tee)]
        if tap:
            cold_trace = tap.text()
        warm = []
        for _ in range(N):
            t = time.perf_counter(); r = await c.call_tool("list_checkpoints", ARGS); warm.append(time.perf_counter() - t)
        assert not r.is_error and len(r.structured_content["result"]) == 3
        one = None
        if tap:
            tap.reset(); await c.call_tool("list_checkpoints", ARGS); await asyncio.sleep(0.2)
            up, down, conns = tap.totals(); one = {"up": up, "down": down, "text": tap.text()}
        if tee:
            open(tee, "w").close(); await c.call_tool("list_checkpoints", ARGS); await asyncio.sleep(0.2)
            lines = [json.loads(l) for l in open(tee)]
            one = {"up": sum(len(l["line"].encode()) for l in lines if l["dir"] == "client->server"),
                   "down": sum(len(l["line"].encode()) for l in lines if l["dir"] == "server->client"), "text": lines}
    q = sorted(warm)
    return {"cold_ms": round(cold * 1000, 1), "warm_median_ms": round(statistics.median(q) * 1000, 3),
            "warm_p90_ms": round(q[int(0.9 * len(q))] * 1000, 3), "n": N, "one_call": one, "cold_trace": cold_trace}


async def main():
    res = {}
    stdio = StdioServerParameters(command=PY, args=[SRV, "stdio"])
    for name, mode in [("stdio, 2026-07-28 pinned", "2026-07-28"), ("stdio, auto (discover probe)", "auto"),
                       ("stdio, legacy 2025-11-25", "legacy")]:
        res[name] = await measure(stdio, mode)
        tee = os.path.join(HERE, "tee.jsonl"); open(tee, "w").close()
        teed = StdioServerParameters(command=PY, args=[os.path.join(HERE, "tee_stdio.py"), tee, "--", PY, SRV, "stdio"])
        b = await measure(teed, mode, tee=tee, R=1)
        res[name]["one_call"] = b["one_call"]; res[name]["cold_trace"] = b["cold_trace"]
        print(name, {k: v for k, v in res[name].items() if k != "one_call"}, res[name]["one_call"]["up"], res[name]["one_call"]["down"])
    procs = [subprocess.Popen([PY, SRV, "http", "30721"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
             subprocess.Popen([PY, SRV, "http", "30722", "json"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    wait(30721); wait(30722)
    taps = {30721: Tap(30731, 30721), 30722: Tap(30732, 30722)}
    for t in taps.values():
        await t.start()
    try:
        for name, port, mode in [("Streamable HTTP, 2026-07-28 (server free to stream)", 30721, "2026-07-28"),
                                 ("Streamable HTTP, 2026-07-28 (json_response=True)", 30722, "2026-07-28"),
                                 ("Streamable HTTP, legacy session (2025-11-25)", 30721, "legacy")]:
            res[name] = await measure(f"http://127.0.0.1:{port}/mcp", mode)
            tapped = await measure(f"http://127.0.0.1:{taps[port].listen}/mcp", mode, tap=taps[port], R=1)
            res[name]["one_call"] = tapped["one_call"]; res[name]["cold_trace"] = tapped["cold_trace"]
            print(name, {k: v for k, v in res[name].items() if k != "one_call"}, res[name]["one_call"]["up"], res[name]["one_call"]["down"])
        # a call that reports progress: the reply becomes an SSE stream scoped to this one request
        prog = []
        async with Client(f"http://127.0.0.1:{taps[30721].listen}/mcp", mode="2026-07-28", cache=None) as c:
            taps[30721].reset()
            r = await c.call_tool("evaluate_checkpoint", {"name": "llama-7b-step-3000"},
                                  progress_callback=lambda p, t, m: prog.append([p, t, m]) or asyncio.sleep(0))
            await asyncio.sleep(0.2)
        res["progress_call"] = {"progress_seen": prog, "text": taps[30721].text(), "result": r.structured_content}
        print("progress", prog)
    finally:
        for p in procs: p.terminate()
    json.dump(res, open(OUT, "w"), indent=1)

asyncio.run(main())
