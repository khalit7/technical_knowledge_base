"""WebSockets through nginx: a proxy that drops the upgrade, and one whose idle timeout cuts a quiet socket.

Usage: python ws_proxy.py   (nginx_ws.conf on 30410/30411, ws_server.py on 30405/30406)
Prints JSON: per case, what the Python `websockets` client saw (messages, timing, close code, error text).
"""
import asyncio, json, time
import websockets
from websockets.asyncio.client import connect


async def attempt(url, ping_interval=None, origin=None, secs=10):
    t0 = time.monotonic(); got = []; err = None; code = None
    try:
        async with connect(url, ping_interval=ping_interval, ping_timeout=5, compression=None, open_timeout=5,
                           origin=origin) as w:
            try:
                while time.monotonic() - t0 < secs:
                    m = await asyncio.wait_for(w.recv(), secs)
                    got.append([round(time.monotonic() - t0, 3), json.loads(m)["type"]])
                    if got[-1][1] == "message_stop":
                        break
            except websockets.ConnectionClosed as e:
                err = f"{type(e).__name__}: {e}"
                code = e.rcvd.code if e.rcvd else None
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
    return {"url": url, "ping_interval_s": ping_interval, "origin": origin, "messages": got, "error": err,
            "close_code_received": code, "ended_at_s": round(time.monotonic() - t0, 3)}


async def main():
    out = {
        "no_upgrade_headers": await attempt("ws://127.0.0.1:30411/tokens"),
        "idle_no_ping": await attempt("ws://127.0.0.1:30410/idle"),
        "idle_ping_1s": await attempt("ws://127.0.0.1:30410/idle", ping_interval=1),
        "origin_checked_good": await attempt("ws://127.0.0.1:30406/tokens", origin="https://chat.example"),
        "origin_checked_evil": await attempt("ws://127.0.0.1:30406/tokens", origin="https://evil.example"),
        "origin_unchecked_evil": await attempt("ws://127.0.0.1:30405/tokens", origin="https://evil.example"),
    }
    print(json.dumps(out, indent=1))

asyncio.run(main())
