"""A minimal OpenAI-compatible /v1/embeddings server for BAAI/bge-small-en-v1.5 (384 dimensions, CPU).

Every memory system on this page embeds through it, so they all use the same embedder.
Usage: python embed_server.py PORT [LOG]
"""
import json, os, sys, time, threading, http.server
os.environ.setdefault("HF_HUB_OFFLINE", "1")
from sentence_transformers import SentenceTransformer
import torch
torch.set_num_threads(2)
MODEL_ID = "BAAI/bge-small-en-v1.5"
model = SentenceTransformer(MODEL_ID, device="cpu")
lock = threading.Lock()
LOG = sys.argv[2] if len(sys.argv) > 2 else None
N = {"requests": 0, "inputs": 0}


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        self._send(200, {"object": "list", "data": [{"id": MODEL_ID, "object": "model"}]})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n) or b"{}")
        inp = body.get("input", [])
        if isinstance(inp, str):
            inp = [inp]
        if inp and isinstance(inp[0], int):
            self._send(400, {"error": "token ids not supported"})
            return
        with lock:
            vecs = model.encode(inp, normalize_embeddings=True).tolist()
            N["requests"] += 1
            N["inputs"] += len(inp)
        toks = sum(len(x.split()) for x in inp)
        self._send(200, {"object": "list", "model": MODEL_ID,
                         "data": [{"object": "embedding", "index": i, "embedding": v} for i, v in enumerate(vecs)],
                         "usage": {"prompt_tokens": toks, "total_tokens": toks}})
        if LOG:
            with open(LOG, "a") as f:
                f.write(json.dumps({"t": time.time(), "n": len(inp), "chars": sum(len(x) for x in inp)}) + "\n")


http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
