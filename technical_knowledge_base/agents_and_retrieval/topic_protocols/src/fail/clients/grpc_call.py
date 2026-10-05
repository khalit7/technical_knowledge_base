"""gRPC client: python grpc_call.py TARGET [--ca CA] [--name NAME] [--n N] [--parallel P] [--timeout S]
Calls the unary method /lab.Lab/Who N times on one channel (P at a time) and counts which backend answered.
Messages are raw bytes (no .proto needed): the server answers with its own name. Errors print as the
client sees them: the status code and details of grpc.RpcError."""
import argparse, collections, time, grpc
from concurrent.futures import ThreadPoolExecutor
a = argparse.ArgumentParser(); a.add_argument("target"); a.add_argument("--ca"); a.add_argument("--name", default="api.llm.test")
a.add_argument("--n", type=int, default=1); a.add_argument("--parallel", type=int, default=1); a.add_argument("--timeout", type=float, default=5)
a.add_argument("--lb", default=None, help="round_robin to spread calls over every address the name resolves to")
o = a.parse_args()
opts = [("grpc.ssl_target_name_override", o.name)] if o.ca else []
if o.lb: opts.append(("grpc.lb_policy_name", o.lb))
ch = grpc.secure_channel(o.target, grpc.ssl_channel_credentials(open(o.ca, "rb").read()), opts) if o.ca else grpc.insecure_channel(o.target, opts)
who = ch.unary_unary("/lab.Lab/Who")
t0 = time.perf_counter()
def call(i):
    t = time.perf_counter()
    try:
        r = who(b"hi", timeout=o.timeout).decode()
    except grpc.RpcError as e:
        r = f"{e.code()}: {e.details()}"
    return i, r, time.perf_counter() - t0, time.perf_counter() - t
with ThreadPoolExecutor(o.parallel) as ex:
    res = list(ex.map(call, range(o.n)))
if o.n == 1:
    print(res[0][1])
else:
    for i, r, end, dur in res if o.parallel > 1 else []:
        print(f"call {i}: {r:10s} finished at {end:5.2f} s (took {dur:4.2f} s)")
    print("answers per backend:", dict(sorted(collections.Counter(r for _, r, _, _ in res).items())))
