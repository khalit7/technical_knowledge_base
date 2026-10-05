"""A middle hop (the router between the API front door and the inference service), speaking llm.proto on both
sides: python gateway.py GEN_DIR PORT DOWNSTREAM_PORT MODE LOG
MODE propagate: pass the caller's remaining time on as the downstream deadline (timeout=ctx.time_remaining())
                and cancel the downstream call the moment the caller goes away (ctx.add_callback).
MODE none:      call downstream with no deadline and no cancellation hook, the code people write first.
MODE thread:    no deadline, no hook, and the downstream stream is read by a worker thread into a queue (the shape of
                fan-out and batching code): the worker keeps reading after the caller is gone."""
import json, queue, sys, threading, time
from concurrent import futures
sys.path.insert(0, sys.argv[1])
import grpc
import llm_pb2 as pb, llm_pb2_grpc as pbg

port, down, mode, logf = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
stub = pbg.InferenceStub(grpc.insecure_channel(f"127.0.0.1:{down}"))
lock = threading.Lock()


class Gateway(pbg.InferenceServicer):
    def Generate(self, req, ctx):
        t0 = time.time(); rem = ctx.time_remaining(); n = 0; end = "ok"
        md = [("x-request-id", dict(ctx.invocation_metadata()).get("x-request-id", "-"))]
        if mode == "propagate":
            call = stub.Generate(req, timeout=ctx.time_remaining(), metadata=md)
            ctx.add_callback(call.cancel)
        elif mode == "thread":
            call = stub.Generate(req, metadata=md); q = queue.Queue()
            def pump():
                try:
                    for t in call:
                        q.put(t)
                finally:
                    q.put(None)
            threading.Thread(target=pump, daemon=True).start()
            call = iter(q.get, None)
        else:
            call = stub.Generate(req, metadata=md)
        try:
            for tok in call:
                n += 1
                yield tok
        except grpc.RpcError as e:
            end = f"downstream {e.code().name}"
        except GeneratorExit:
            end = "caller gone (generator closed)"
            raise
        finally:
            with lock, open(logf, "a") as f:
                f.write(json.dumps(dict(server="gateway", mode=mode, time_remaining_s=None if rem is None or rem > 1e9 else round(rem, 3),
                                        tokens_forwarded=n, end=end, dur_s=round(time.time() - t0, 3))) + "\n")


s = grpc.server(futures.ThreadPoolExecutor(16))
pbg.add_InferenceServicer_to_server(Gateway(), s)
s.add_insecure_port(f"127.0.0.1:{port}"); s.start(); print("gateway ready", port, mode, flush=True)
s.wait_for_termination()
