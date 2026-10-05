"""A stand-in inference service speaking gRPC (llm.proto): python infer_server.py GEN_DIR PORT NAME [options]
Generate streams the root page's five tokens ("The", " sky", " is", " blue", ".") and then filler tokens up to
max_tokens, one every --gap seconds after --first seconds (prefill). No model runs. Who answers with NAME.
Every call is logged as one JSON line to --log: method, grpc-timeout as the server saw it (time_remaining),
tokens produced, tokens produced after the client was gone, and how the call ended.
Options: --max-age S (MAX_CONNECTION_AGE, server closes connections with GOAWAY after S seconds, +-10% jitter)
         --health (register grpc.health.v1) --reflect (server reflection) --fail-first N (Who fails N times with UNAVAILABLE)
model "boom" raises an exception in the handler; max_tokens above 4096 is rejected with INVALID_ARGUMENT."""
import argparse, json, sys, threading, time
from concurrent import futures
a = argparse.ArgumentParser()
a.add_argument("gen"); a.add_argument("port"); a.add_argument("name")
a.add_argument("--first", type=float, default=0.12); a.add_argument("--gap", type=float, default=0.05)
a.add_argument("--max-age", type=float, default=0); a.add_argument("--log", default=None)
a.add_argument("--health", action="store_true"); a.add_argument("--reflect", action="store_true")
a.add_argument("--fail-first", type=int, default=0); a.add_argument("--ignore-cancel", action="store_true")
o = a.parse_args()
sys.path.insert(0, o.gen)
import grpc
import llm_pb2 as pb, llm_pb2_grpc as pbg

TOKENS = ["The", " sky", " is", " blue", "."]
lock = threading.Lock()
peers = {}
fails = [o.fail_first]


def log(rec):
    if o.log:
        with lock, open(o.log, "a") as f:
            f.write(json.dumps(rec) + "\n")


class Inference(pbg.InferenceServicer):
    def Generate(self, req, ctx):
        t0 = time.time(); rem = ctx.time_remaining()
        md = {k: v for k, v in ctx.invocation_metadata()}
        n = req.max_tokens or 16
        if req.model == "boom":  # an unhandled exception in the handler: the library answers UNKNOWN
            raise RuntimeError("tokenizer crashed")
        if n > 4096:  # an application error with a status the library never generates by itself
            ctx.abort(grpc.StatusCode.INVALID_ARGUMENT, f"max_tokens {n} is above this model's limit of 4096")
        made = after = 0; gone_at = None; end = "ok"
        time.sleep(o.first)
        for i in range(n):
            if not ctx.is_active():
                gone_at = gone_at or time.time()
                if not o.ignore_cancel:
                    end = "stopped: client gone"; break
            text = TOKENS[i] if i < len(TOKENS) else f" t{i}"
            made += 1
            if gone_at:
                after += 1
            else:
                yield pb.Token(text=text, index=i)
            time.sleep(o.gap)
        else:
            if gone_at:
                end = "ran to the end for nobody"
        log(dict(server=o.name, method="Generate", time_remaining_s=None if rem is None or rem > 1e9 else round(rem, 3),
                 meta={k: v for k, v in md.items() if k.startswith("x-") or k == "grpc-previous-rpc-attempts"},
                 tokens_made=made, tokens_after_client_gone=after, end=end, dur_s=round(time.time() - t0, 3)))

    def Who(self, req, ctx):
        p = ctx.peer()
        with lock:
            peers[p] = peers.get(p, 0) + 1; c = peers[p]
            f = fails[0] > 0
            if f:
                fails[0] -= 1
        md = {k: v for k, v in ctx.invocation_metadata()}
        log(dict(server=o.name, method="Who", attempt_header=md.get("grpc-previous-rpc-attempts"), failed=f, t=round(time.time(), 3)))
        if f:
            ctx.abort(grpc.StatusCode.UNAVAILABLE, f"{o.name} warming up")
        return pb.WhoReply(backend=o.name, connection_calls=c)


opts = []
if o.max_age:
    opts += [("grpc.max_connection_age_ms", int(o.max_age * 1000)), ("grpc.max_connection_age_grace_ms", 5000)]
s = grpc.server(futures.ThreadPoolExecutor(32), options=opts)
pbg.add_InferenceServicer_to_server(Inference(), s)
names = ["llm.v1.Inference"]
if o.health:
    from grpc_health.v1 import health, health_pb2, health_pb2_grpc
    hs = health.HealthServicer(); health_pb2_grpc.add_HealthServicer_to_server(hs, s)
    hs.set("", health_pb2.HealthCheckResponse.SERVING); hs.set("llm.v1.Inference", health_pb2.HealthCheckResponse.SERVING)
    names.append("grpc.health.v1.Health")
if o.reflect:
    from grpc_reflection.v1alpha import reflection
    names.append(reflection.SERVICE_NAME); reflection.enable_server_reflection(names, s)
s.add_insecure_port(f"127.0.0.1:{o.port}")
s.start(); print("ready", o.name, o.port, flush=True)
s.wait_for_termination()
