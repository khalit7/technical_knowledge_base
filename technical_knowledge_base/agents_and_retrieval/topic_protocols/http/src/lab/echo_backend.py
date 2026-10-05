"""A backend that records the exact bytes it receives, so the page can show what a proxy changed in a request.

Reads one request (head, then a body framed by Content-Length or chunked), appends {"port", "raw"} to the log as one
JSON line, answers 200 "ok" and keeps the connection open for the next request (HTTP/1.1 keep-alive).
Usage: python echo_backend.py <port> <log.jsonl>
"""
import asyncio, json, sys

PORT, LOG = int(sys.argv[1]), sys.argv[2]


async def read_request(r):
    head = await r.readuntil(b"\r\n\r\n")
    lines = head.decode("latin-1").split("\r\n")
    hd = {}
    for l in lines[1:]:
        if ":" in l:
            k, v = l.split(":", 1); hd.setdefault(k.strip().lower(), []).append(v.strip())
    body = b""
    if "chunked" in ",".join(hd.get("transfer-encoding", [])).lower():
        while True:
            size_line = await r.readuntil(b"\r\n"); body += size_line
            n = int(size_line.split(b";")[0].strip() or b"0", 16)
            chunk = await r.readexactly(n + 2); body += chunk
            if n == 0:
                break
    elif "content-length" in hd:
        body = await r.readexactly(int(hd["content-length"][0]))
    return head + body


async def handle(r, w):
    try:
        while True:
            raw = await read_request(r)
            with open(LOG, "a") as f:
                f.write(json.dumps({"port": PORT, "raw": raw.decode("latin-1")}) + "\n")
            w.write(b"HTTP/1.1 200 OK\r\ncontent-type: text/plain\r\ncontent-length: 3\r\n\r\nok\n")
            await w.drain()
    except (asyncio.IncompleteReadError, ConnectionError, ValueError):
        pass
    finally:
        w.close()


async def main():
    srv = await asyncio.start_server(handle, "127.0.0.1", PORT)
    async with srv:
        await srv.serve_forever()

asyncio.run(main())
