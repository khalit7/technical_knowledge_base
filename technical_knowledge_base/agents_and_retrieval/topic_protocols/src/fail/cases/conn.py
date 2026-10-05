"""Layer 4 (TCP connection) failures: refused, connect timeout, reset, empty reply, read timeout."""
from lab import run, save

J = "--json ../wire/request.json"
U = "http://127.0.0.1:{}/v1/messages"


def clients(port, extra_py="", curl_opts="", node_env=""):
    u = U.format(port)
    return [
        run(f"curl -sS {curl_opts} {u} -H 'content-type: application/json' --data-binary @../wire/request.json"),
        run(f"$PY $CL/py_requests.py {u} {J} {extra_py}"),
        run(f"$PY $CL/py_httpx.py {u} {J} {extra_py}"),
        run(f"{node_env}node $CL/node_fetch.mjs {u} ../wire/request.json"),
    ]


def main():
    save("refused", clients(27099) + [
        run("nc -vz 127.0.0.1 27099"),
        run("lsof -nP -iTCP:27099 -sTCP:LISTEN; echo \"lsof exit $?: nothing is listening\""),
    ])
    u = "http://192.0.2.1:8080/v1/messages"
    save("conn_timeout", [
        run(f"curl -sS --connect-timeout 3 {u} --data-binary @../wire/request.json"),
        run(f"$PY $CL/py_requests.py {u} {J} --timeout 3"),
        run(f"$PY $CL/py_httpx.py {u} {J} --timeout 3"),
        run(f"node $CL/node_fetch.mjs {u} ../wire/request.json"),
        run("nc -vz -G 3 192.0.2.1 8080"),
        run("route -n get 192.0.2.1 | grep -E 'gateway|interface'"),
    ])
    save("reset", clients(27090) + [
        run("curl -sS http://127.0.0.1:27091/v1/messages --data-binary @../wire/request.json", note="the same server closing cleanly (FIN) instead of RST"),
        run(f"$PY $CL/py_requests.py http://127.0.0.1:27091/v1/messages {J}"),
    ])
    save("read_timeout", clients(27098, "--timeout 3", "-m 3", "TIMEOUT_MS=3000 ") + [
        run("curl -sS -m 3 -o /dev/null -w 'connect %{time_connect}s  first byte %{time_starttransfer}s  total %{time_total}s\\n' http://127.0.0.1:27098/v1/messages --data-binary @../wire/request.json"),
        run("curl -sS -o /dev/null -w 'connect %{time_connect}s  first byte %{time_starttransfer}s  total %{time_total}s\\n' http://127.0.0.1:27080/v1/messages -H 'content-type: application/json' --data-binary @../wire/request.json", note="the healthy server for comparison"),
    ])
