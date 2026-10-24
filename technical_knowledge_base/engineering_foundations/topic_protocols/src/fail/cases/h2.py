"""HTTP/2 and gRPC: one long-lived connection pinned to one backend by an L4 balancer; max concurrent streams."""
import lab
from lab import run, save, start


def main():
    for i in (1, 2, 3):
        start([lab.PY, "grpc_backend.py", str(27300 + i), f"backend-{i}"], log="grpc.log", port=27300 + i)
    start([lab.PY, "grpc_backend.py", "27310", "slow-1", "2", "1.0"], log="grpc.log", port=27310)
    save("grpc_pinning", [
        run("$PY $CL/grpc_call.py 127.0.0.1:27300 --n 30", note="one channel, 30 calls, through nginx's stream (L4) balancer"),
        run("for i in 1 2 3; do $PY $CL/grpc_call.py 127.0.0.1:27300 --n 10; done", note="three separate processes, each with its own connection"),
        run("$PY $CL/grpc_call.py ipv4:127.0.0.1:27301,127.0.0.1:27302,127.0.0.1:27303 --n 30 --lb round_robin",
            note="the fix: client-side round_robin over every backend address (or an L7, HTTP/2-aware balancer)"),
    ])
    save("max_streams", [
        run("$PY $CL/grpc_call.py 127.0.0.1:27310 --n 6 --parallel 6", note="server advertises max_concurrent_streams 2; each call takes 1 s"),
        run("$PY $CL/grpc_call.py 127.0.0.1:27310 --n 6 --parallel 6 --timeout 2.5", note="the same with a 2.5 s deadline per call"),
    ])
