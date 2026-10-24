# Stand-in for a Jupyter server: a token-protected HTTP endpoint (no Jupyter installed in the lab).
import http.server, sys, socket, os
host, port = sys.argv[1], int(sys.argv[2])
TOKEN = "lab-token-0001"
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        ok = ("token=" + TOKEN) in self.path
        body = (f"notebook on {socket.gethostname()} as uid {os.getuid()}, bound to {host}:{port}; "
                + ("token accepted: kernel would run your code\n" if ok else "403: token required\n")).encode()
        self.send_response(200 if ok else 403); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def log_message(self, *a): pass
if host == "unix":  # listen on a Unix socket in a private directory: only this user (and root) can connect
    import socketserver
    path = sys.argv[3]; os.makedirs(os.path.dirname(path), mode=0o700, exist_ok=True)
    if os.path.exists(path): os.unlink(path)
    class U(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
        def get_request(self):
            r, _ = super().get_request(); return r, ("unix", 0)
    U(path, H).serve_forever()
else:
    http.server.ThreadingHTTPServer((host, port), H).serve_forever()
