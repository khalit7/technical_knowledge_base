"""A gRPC backend (grpcio, no .proto: raw bytes): python grpc_backend.py PORT NAME [MAX_STREAMS] [DELAY_S]
/lab.Lab/Who answers with NAME after DELAY_S seconds. MAX_STREAMS sets the HTTP/2 SETTINGS_MAX_CONCURRENT_STREAMS
the server advertises (grpc.max_concurrent_streams)."""
import sys, time
from concurrent import futures
import grpc

port, name = sys.argv[1], sys.argv[2]
maxs = int(sys.argv[3]) if len(sys.argv) > 3 else 0
delay = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0


def who(req, ctx):
    time.sleep(delay)
    return name.encode()


h = grpc.method_handlers_generic_handler("lab.Lab", {"Who": grpc.unary_unary_rpc_method_handler(who)})
opts = [("grpc.max_concurrent_streams", maxs)] if maxs else []
s = grpc.server(futures.ThreadPoolExecutor(32), options=opts)
s.add_generic_rpc_handlers((h,)); s.add_insecure_port(f"127.0.0.1:{port}"); s.start(); s.wait_for_termination()
