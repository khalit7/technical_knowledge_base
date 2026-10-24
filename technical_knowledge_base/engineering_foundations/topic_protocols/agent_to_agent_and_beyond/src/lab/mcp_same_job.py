"""Run the eval job the MCP way and count what crosses the wire and what lands in team A's model context.
Usage: python mcp_same_job.py OUT.json. Ports: 30841 server, 30842 tap. Scripted host, no model: the steps a model
would choose are fixed (list tools, list suites, ask the user, load, three shards, average)."""
import asyncio, json, os, subprocess, sys, time, httpx
from mcp import Client
from tcp_tap import Tap

HERE = os.path.dirname(os.path.abspath(__file__))


async def main(out):
    p = subprocess.Popen([sys.executable, os.path.join(HERE, "mcp_eval_server.py"), "30841"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                httpx.get("http://127.0.0.1:30841/", timeout=0.2); break
            except Exception:
                time.sleep(0.1)
        tap = Tap(30842, 30841); await tap.start()
        steps = []; t0 = time.perf_counter()
        async with Client("http://127.0.0.1:30842/mcp", mode="2026-07-28", cache=None) as c:
            tools = await c.list_tools()
            steps.append({"call": "tools/list", "into_context": json.dumps([t.model_dump(mode="json", exclude_none=True, by_alias=True) for t in tools.tools])})
            async def call(name, args):
                r = await c.call_tool(name, args)
                txt = "\n".join(x.text for x in r.content)
                steps.append({"call": f"tools/call {name}", "args": args, "into_context": txt}); return r
            await call("list_suites", {})
            steps.append({"call": "(host asks the user which suite; user says gsm-mini: scripted)", "into_context": "gsm-mini"})
            r = await call("load_checkpoint", {"checkpoint": "step-4000"})
            h = (r.structured_content or {}).get("handle", "h-step-4000")
            acc = []
            for i in (1, 2, 3):
                r = await call("run_shard", {"handle": h, "suite": "gsm-mini", "shard": i})
                acc.append(json.loads(steps[-1]["into_context"])["accuracy"])
        wall = round((time.perf_counter() - t0) * 1000)
        await asyncio.sleep(0.2)
        up, down, conns = tap.totals()
        posts = sum(w["data"].count("POST /mcp") for w in tap.ordered() if w["dir"] == "up")
        json.dump({"steps": steps, "mean": round(sum(acc) / 3, 4), "bytes_up": up, "bytes_down": down, "connections": conns,
                   "http_requests": posts, "wall_ms": wall, "context_chars": sum(len(s["into_context"]) for s in steps),
                   "wire": tap.ordered(), "reads": tap.raw()}, open(out, "w"), indent=1)
        print("mcp job", up, down, posts, wall)
    finally:
        p.terminate(); p.wait()

asyncio.run(main(sys.argv[1]))
