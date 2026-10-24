"""HTTP failures through a real nginx: 413, 429 + Retry-After, 502, 504, an idle timeout cutting an SSE stream,
a buffering proxy delaying tokens, keep-alive reuse after the server hung up, a body shorter than Content-Length."""
import json, os
import lab
from lab import run, save

J = "--json ../wire/request.json"
POST = "-H 'content-type: application/json' --data-binary @../wire/request.json"
ELOG = "grep -E '{}' $WORK/nginx_error.log | tail -1 | sed -E 's/^[0-9/]+ [0-9:]+ //; s/[0-9]+#[0-9]+: //'"


def main():
    big = {"model": "wire-lab-1", "max_tokens": 16, "stream": True,
           "messages": [{"role": "user", "content": [{"type": "text", "text": "Describe this image."},
                                                      {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "A" * 2000}}]}]}
    json.dump(big, open(os.path.join(lab.WORK, "big.json"), "w"))
    save("http_413", [
        run("curl -sS -i http://127.0.0.1:27103/v1/messages -H 'content-type: application/json' --data-binary @$WORK/big.json"),
        run("$PY $CL/py_httpx.py http://127.0.0.1:27103/v1/messages --json $WORK/big.json | tail -2"),
        run("node $CL/node_fetch.mjs http://127.0.0.1:27103/v1/messages $WORK/big.json | head -1"),
        run(ELOG.format("too large")),
        run("wc -c < $WORK/big.json"),
    ])
    save("http_429", [
        run(f"curl -sS -o /dev/null http://127.0.0.1:27095/v1/messages {POST}; curl -sS -i http://127.0.0.1:27095/v1/messages {POST}"),
        run(f"$PY $CL/py_httpx.py http://127.0.0.1:27095/v1/messages {J} | tail -2"),
        run("sleep 2.1; $PY $CL/retry_after.py http://127.0.0.1:27095/v1/messages"),
    ])
    save("http_502", [
        run(f"curl -sS -i http://127.0.0.1:27104/v1/messages {POST}"),
        run(f"$PY $CL/py_requests.py http://127.0.0.1:27104/v1/messages {J} | head -1"),
        run(ELOG.format("27099")),
    ])
    save("http_504", [
        run(f"curl -sS -i -w 'total %{{time_total}}s\\n' http://127.0.0.1:27105/v1/messages {POST}"),
        run(f"$PY $CL/py_httpx.py http://127.0.0.1:27105/v1/messages {J} | tail -2"),
        run(ELOG.format("27098")),
    ])
    save("sse_cut", [
        run(f"curl -sS -N http://127.0.0.1:27102/v1/messages {POST}"),
        run("$PY $CL/sse_times.py http://127.0.0.1:27102/v1/messages"),
        run("node $CL/node_fetch.mjs http://127.0.0.1:27102/v1/messages ../wire/request.json | tail -2"),
        run(ELOG.format("timed out.*27081")),
        run("$PY $CL/sse_times.py http://127.0.0.1:27107/v1/messages", note="the fix: proxy_read_timeout above the longest silence (or heartbeat events)"),
    ])
    save("buffering", [
        run("$PY $CL/sse_times.py http://127.0.0.1:27080/v1/messages", note="direct to the model server"),
        run("$PY $CL/sse_times.py http://127.0.0.1:27100/v1/messages", note="through nginx with its defaults"),
        run("$PY $CL/sse_times.py http://127.0.0.1:27101/v1/messages", note="nginx with proxy_buffering off"),
        run("$PY $CL/sse_times.py http://127.0.0.1:27106/v1/messages --gzip", note="nginx with gzip on for text/event-stream, buffering off"),
        run("$PY $CL/sse_times.py http://127.0.0.1:27108/v1/messages --gzip", note="nginx with gzip on and buffering on"),
        run("$PY $CL/sse_times.py http://127.0.0.1:27109/v1/messages", note="nginx speaking HTTP/1.0 to the upstream (its default before 1.29.7), buffering on"),
    ])
    save("keepalive", [
        run("$PY $CL/two_requests.py http://127.0.0.1:27093/v1/messages"),
        run("curl -sv http://127.0.0.1:27093/a -d '{}' http://127.0.0.1:27093/b -d '{}' 2>&1 | grep -iE 'connected to|re-us|retry|died|ok'"),
    ])
    save("short_body", [
        run("curl -sS http://127.0.0.1:27092/v1/messages -d '{}'"),
        run("$PY $CL/py_requests.py http://127.0.0.1:27092/v1/messages"),
        run("$PY $CL/py_httpx.py http://127.0.0.1:27092/v1/messages"),
        run("node $CL/node_fetch.mjs http://127.0.0.1:27092/v1/messages"),
    ])
