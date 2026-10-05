"""Three gRPC calls through frame_proxy.py, one connection each: python frames_run.py GEN_DIR PROXY_PORT FRAMES.jsonl OUT.json
1. the running example as server streaming: Generate(model wire-lab-1, "What colour is the sky?", max_tokens 5), deadline 2 s
2. a method the server does not have (trailers-only answer, UNIMPLEMENTED)
3. the standard health check (grpc.health.v1.Health/Check)
Joins the frame log by connection into OUT.json with what the application saw."""
import json, sys, time
sys.path.insert(0, sys.argv[1])
import grpc
import llm_pb2 as pb, llm_pb2_grpc as pbg
from grpc_health.v1 import health_pb2, health_pb2_grpc

port, flog, out = sys.argv[2], sys.argv[3], sys.argv[4]
target = f"127.0.0.1:{port}"
app = []

ch = grpc.insecure_channel(target)
stub = pbg.InferenceStub(ch)
req = pb.GenerateRequest(model="wire-lab-1", max_tokens=5, stream=True, messages=[pb.Message(role="user", content="What colour is the sky?")])
t0 = time.time(); got = []
call = stub.Generate(req, timeout=2.0, metadata=[("x-request-id", "req_wirelab_0001")])
for tok in call:
    got.append([round((time.time() - t0) * 1000, 1), tok.text])
app.append(dict(call="Generate (server streaming)", tokens=got, code=str(call.code()), trailing=[[k, v] for k, v in call.trailing_metadata()]))
ch.close(); time.sleep(0.3)

ch = grpc.insecure_channel(target)
nope = ch.unary_unary("/llm.v1.Inference/Translate")
try:
    nope(b"", timeout=2.0); app.append(dict(call="Translate", code="OK?"))
except grpc.RpcError as e:
    app.append(dict(call="Translate (no such method)", code=str(e.code()), details=e.details()))
ch.close(); time.sleep(0.3)

ch = grpc.insecure_channel(target)
r = health_pb2_grpc.HealthStub(ch).Check(health_pb2.HealthCheckRequest(service="llm.v1.Inference"), timeout=2.0)
app.append(dict(call="Health/Check", status=health_pb2.HealthCheckResponse.ServingStatus.Name(r.status), bytes=r.SerializeToString().hex(" ")))
ch.close(); time.sleep(0.5)

frames = [json.loads(l) for l in open(flog)]
conns = sorted({f["conn"] for f in frames})
json.dump(dict(grpcio=grpc.__version__, recorded=time.strftime("%Y-%m-%d %H:%M %Z"), app=app,
               conns=[[f for f in frames if f["conn"] == c] for c in conns]), open(out, "w"), indent=1)
print(json.dumps(app)[:600]); print("frames", len(frames), "conns", len(conns))
