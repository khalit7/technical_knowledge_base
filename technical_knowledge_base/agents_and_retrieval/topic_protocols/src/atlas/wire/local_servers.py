"""Two tiny local servers for the atlas recordings, on 127.0.0.1 only.
- gRPC: the standard grpc.health.v1.Health service (grpcio-health-checking), plaintext HTTP/2, port 19301.
- SSE: GET /stream answers text/event-stream with three token events, a keep-alive comment and a done event, port 19302.
Run: python local_servers.py  (stops after 60 s)."""
import threading, time, json
from concurrent import futures
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

def grpc_server():
    s = grpc.server(futures.ThreadPoolExecutor(max_workers=2))
    h = health.HealthServicer(); h.set("", health_pb2.HealthCheckResponse.SERVING)
    health_pb2_grpc.add_HealthServicer_to_server(h, s)
    s.add_insecure_port("127.0.0.1:19301"); s.start(); return s

class SSE(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        for i, tok in enumerate(["Hel", "lo", "!"]):
            self.wfile.write(f"id: {i}\nevent: token\ndata: {json.dumps({'text': tok})}\n\n".encode()); self.wfile.flush(); time.sleep(0.2)
        self.wfile.write(b": keep-alive comment, ignored by the client\n\n")
        self.wfile.write(b"event: done\ndata: {}\n\n"); self.wfile.flush()
        self.close_connection = True

g = grpc_server()
httpd = ThreadingHTTPServer(("127.0.0.1", 19302), SSE)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
print("ready", flush=True)
time.sleep(60)
httpd.shutdown(); g.stop(0)
