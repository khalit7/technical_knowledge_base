"""gRPC failures, caused on purpose and recorded as the client sees them: python status_run.py GEN_DIR PY LABDIR NGINX WORK OUT.json
Servers: inference on 30541 (normal), 30542 (first token after 8 s), 30543 and 30545 (Who fails twice with UNAVAILABLE first),
nginx L7 on 30534 pointing at 30549 where nothing listens, a frame proxy 30544 -> 30542 for the keepalive run.
Each case records the code, the details string and the time, with the exact client call. Only PIDs started here are stopped."""
import json, os, subprocess, sys, time
GEN, PY, LAB, NGINX, WORK, OUT = sys.argv[1:7]
sys.path.insert(0, GEN)
import grpc
import llm_pb2 as pb, llm_pb2_grpc as pbg
from grpc_reflection.v1alpha import reflection_pb2, reflection_pb2_grpc

srvlog = os.path.join(WORK, "status_srv.log"); open(srvlog, "w").close()
flog = os.path.join(WORK, "status_frames.jsonl"); open(flog, "w").close()
P = lambda *a: subprocess.Popen([PY, *a], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
procs = [P(f"{LAB}/infer_server.py", GEN, "30541", "infer-1", "--reflect", "--health"),
         P(f"{LAB}/infer_server.py", GEN, "30542", "infer-slow", "--first", "8"),
         P(f"{LAB}/infer_server.py", GEN, "30543", "infer-flaky", "--fail-first", "2", "--log", srvlog),
         P(f"{LAB}/infer_server.py", GEN, "30545", "infer-flaky", "--fail-first", "2"),
         P(f"{LAB}/frame_proxy.py", "30544", "30542", flog)]
d = os.path.join(WORK, "ngx_status"); os.makedirs(os.path.join(d, "tmp"), exist_ok=True)
open(os.path.join(d, "nginx.conf"), "w").write(open(os.path.join(LAB, "nginx_lb.conf.in")).read().replace("@WORK@", d).replace("@BACKENDS@", "server 127.0.0.1:30549;"))
procs.append(subprocess.Popen([NGINX, "-p", d, "-c", os.path.join(d, "nginx.conf")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
time.sleep(1.5)
REQ = dict(model="wire-lab-1", max_tokens=5, stream=True, messages=[pb.Message(role="user", content="What colour is the sky?")])
cases = []


def case(cid, what, code_line, fn):
    t = time.time()
    try:
        r = fn(); res = dict(code="OK", result=str(r)[:200])
    except grpc.RpcError as e:
        res = dict(code=e.code().name, details=e.details())
    res.update(id=cid, what=what, call=code_line, ms=round((time.time() - t) * 1000))
    cases.append(res); print(cid, res["code"], (res.get("details") or "")[:150])


def gen(target, opts=(), timeout=5, **kw):
    req = pb.GenerateRequest(**{**REQ, **kw})
    return [t.text for t in pbg.InferenceStub(grpc.insecure_channel(target, list(opts))).Generate(req, timeout=timeout)]


try:
    case("ok", "the running example", "stub.Generate(req, timeout=5)", lambda: gen("127.0.0.1:30541"))
    case("unavailable", "nothing listens on the port", "Generate on 127.0.0.1:30549, timeout=2", lambda: gen("127.0.0.1:30549", timeout=2))
    case("deadline", "first token takes 8 s, deadline 0.5 s", "Generate on the slow server, timeout=0.5", lambda: gen("127.0.0.1:30542", timeout=0.5))
    case("too_big", "a 5 MB prompt; the default receive limit is 4 MB", 'content="x" * 5_000_000', lambda: gen("127.0.0.1:30541", messages=[pb.Message(role="user", content="x" * 5_000_000)]))
    case("invalid", "the server rejects max_tokens 100000 (application error)", "max_tokens=100000", lambda: gen("127.0.0.1:30541", max_tokens=100000))
    case("unknown", "the handler raises an exception", 'model="boom"', lambda: gen("127.0.0.1:30541", model="boom"))
    case("unimplemented", "a method the server does not have", "/llm.v1.Inference/Translate", lambda: grpc.insecure_channel("127.0.0.1:30541").unary_unary("/llm.v1.Inference/Translate")(b"", timeout=2))
    case("l7_dead", "the L7 balancer's only backend is down", "Generate on nginx grpc_pass (30534) -> 30549", lambda: gen("127.0.0.1:30534", timeout=2))
    # retries
    who = lambda opts, port="30543": pbg.InferenceStub(grpc.insecure_channel(f"127.0.0.1:{port}", list(opts))).Who(pb.WhoRequest(), timeout=3)
    case("no_retry", "first attempt fails with UNAVAILABLE, no retry policy", "Who(), default config", lambda: who([], "30545"))
    sc = json.dumps({"methodConfig": [{"name": [{"service": "llm.v1.Inference", "method": "Who"}],
                                       "retryPolicy": {"maxAttempts": 4, "initialBackoff": "0.1s", "maxBackoff": "1s", "backoffMultiplier": 2, "retryableStatusCodes": ["UNAVAILABLE"]}}]})
    case("retry", "same server, retry policy in the service config (maxAttempts 4, UNAVAILABLE retryable)", "options=[('grpc.service_config', SC)]",
         lambda: who([("grpc.service_config", sc), ("grpc.enable_retries", 1)]))
    # keepalive pings faster than the server allows
    case("too_many_pings", "client pings every 1 s during an 8 s silent call; server defaults", "options=[('grpc.keepalive_time_ms', 1000)], timeout=12",
         lambda: gen("127.0.0.1:30544", opts=[("grpc.keepalive_time_ms", 1000), ("grpc.keepalive_permit_without_calls", 1)], timeout=12))
    case("too_many_pings_2", "the same, and the client's own brake removed (max_pings_without_data 0)", "options=[('grpc.keepalive_time_ms', 1000), ('grpc.http2.max_pings_without_data', 0)], timeout=12",
         lambda: gen("127.0.0.1:30544", opts=[("grpc.keepalive_time_ms", 1000), ("grpc.keepalive_permit_without_calls", 1), ("grpc.http2.max_pings_without_data", 0)], timeout=12))
    # server reflection: what grpcurl list uses
    rs = reflection_pb2_grpc.ServerReflectionStub(grpc.insecure_channel("127.0.0.1:30541"))
    ans = list(rs.ServerReflectionInfo(iter([reflection_pb2.ServerReflectionRequest(list_services="")]), timeout=3))
    services = [s.name for s in ans[0].list_services_response.service]
finally:
    for p in procs:
        p.terminate()
    for p in procs:
        p.wait()
frames = [json.loads(l) for l in open(flog) if l.strip()]
pings = [f for f in frames if f["type"] in ("PING", "GOAWAY", "RSTSTREAM")]
attempts = [json.loads(l) for l in open(srvlog) if l.strip()]
json.dump(dict(grpcio=grpc.__version__, recorded=time.strftime("%Y-%m-%d %H:%M %Z"), cases=cases, retry_server_log=attempts,
               keepalive_frames=[{k: v for k, v in f.items() if k in ("conn", "ms", "dir", "type", "flags", "error", "debug", "last_stream")} for f in pings],
               reflection_services=services), open(OUT, "w"), indent=1)
print("services", services); print("attempts", attempts); print("pings", [(f["ms"], f["dir"], f["type"], f.get("debug")) for f in pings][:20])
