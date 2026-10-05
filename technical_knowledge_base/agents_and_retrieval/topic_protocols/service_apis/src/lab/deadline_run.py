"""Deadlines across three hops, measured: python deadline_run.py GEN_DIR PY LABDIR WORK OUT.json
client -> gateway (30520) -> frame proxy (30522) -> inference (30521). The inference service streams up to 40 tokens,
the first after 0.12 s then one every 0.05 s (2.12 s in all). Four runs:
  A. client deadline 0.6 s, gateway propagates the deadline and the cancellation
  B. the same deadline, gateway propagates nothing
  C. no deadline; the user closes the tab at 0.6 s (client cancels), gateway propagates the cancellation
  D. client deadline 0.6 s, gateway reads downstream in a worker thread and propagates nothing
Each run restarts the three processes so the logs are separate; only the PIDs started here are stopped."""
import json, os, subprocess, sys, time
GEN, PY, LAB, WORK, OUT = sys.argv[1:6]
sys.path.insert(0, GEN)
import grpc
import llm_pb2 as pb, llm_pb2_grpc as pbg


def run(label, mode, deadline, cancel_at):
    logs = {k: os.path.join(WORK, f"dl_{label}_{k}.log") for k in ("inf", "gw", "frames")}
    for f in logs.values():
        open(f, "w").close()
    procs = [subprocess.Popen([PY, f"{LAB}/infer_server.py", GEN, "30521", "infer-1", "--log", logs["inf"]], stdout=subprocess.DEVNULL),
             subprocess.Popen([PY, f"{LAB}/frame_proxy.py", "30522", "30521", logs["frames"]], stdout=subprocess.DEVNULL),
             subprocess.Popen([PY, f"{LAB}/gateway.py", GEN, "30520", "30522", mode, logs["gw"]], stdout=subprocess.DEVNULL)]
    try:
        time.sleep(1.5)
        stub = pbg.InferenceStub(grpc.insecure_channel("127.0.0.1:30520"))
        req = pb.GenerateRequest(model="wire-lab-1", max_tokens=40, stream=True, messages=[pb.Message(role="user", content="What colour is the sky?")])
        t0 = time.time(); got = 0; code = "OK"
        call = stub.Generate(req, timeout=deadline, metadata=[("x-request-id", f"req_{label}")])
        if cancel_at:
            import threading
            threading.Timer(cancel_at, call.cancel).start()
        try:
            for _ in call:
                got += 1
        except grpc.RpcError as e:
            code = e.code().name
        client = dict(code=code, tokens_received=got, gave_up_s=round(time.time() - t0, 3))
        time.sleep(2.8)  # let the inference service finish whatever it is still doing
    finally:
        for p in procs:
            p.terminate()
        for p in procs:
            p.wait()
    rd = lambda f: [json.loads(l) for l in open(f) if l.strip()]
    hdr = [fr for fr in rd(logs["frames"]) if fr.get("type") == "HEADERS" and fr["dir"] == "c>s"]
    tail = [fr for fr in rd(logs["frames"]) if fr.get("type") in ("RST_STREAM", "RSTSTREAM") or (fr.get("type") == "HEADERS" and fr["dir"] == "s>c" and "END_STREAM" in fr["flags"])]
    return dict(label=label, mode=mode, client_deadline_s=deadline, client_cancel_at_s=cancel_at, client=client,
                gateway=rd(logs["gw"]), inference=rd(logs["inf"]),
                hop2_request_headers=[h["headers"] for h in hdr],
                hop2_end=[{k: v for k, v in fr.items() if k in ("ms", "dir", "type", "flags", "error", "headers")} for fr in tail])


res = [run("A", "propagate", 0.6, None), run("B", "none", 0.6, None), run("C", "propagate", None, 0.6), run("D", "thread", 0.6, None)]
json.dump(dict(grpcio=grpc.__version__, recorded=time.strftime("%Y-%m-%d %H:%M %Z"), runs=res), open(OUT, "w"), indent=1)
for r in res:
    print(r["label"], r["client"], "| gw", r["gateway"], "| inf", r["inference"], "| hdr", [[kv for kv in h if kv[0] == "grpc-timeout"] for h in r["hop2_request_headers"]], "| end", r["hop2_end"])
