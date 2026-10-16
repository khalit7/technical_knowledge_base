#!/usr/bin/env python3
"""tpfs: a toy parallel file system, built to show two mechanisms of Lustre-like systems with real runs.

It is NOT Lustre. It copies only the split that matters here:
  * one metadata server (mds) owns names and layouts (like a Lustre MDT): create, stat, unlink, list;
  * several object servers (ost) store the bytes (like Lustre OSTs); each one is capped by a token
    bucket at --mbps MB/s, standing in for one server's disks (an input, not a measurement);
  * a client asks the mds for a file's layout once, then moves data straight to the osts, RAID-0 style:
    stripe unit k of the file lives on ost (offset + k) mod count, at object offset (k // count) * size,
    the same arithmetic as Lustre's lov_stripe_number() / lov_stripe_offset() for a plain RAID-0 layout.
Not modelled: locks (Lustre's LDLM extent locks), caching, recovery, journals.

Standard library only. Subcommands:
  tpfs.py ost  --port 9000 --dir /data --mbps 25
  tpfs.py mds  --port 8000 --osts host1:9000,host2:9000,...
  tpfs.py bench <experiment> ...   (see bench_* below; prints JSON lines)
"""
import argparse, http.client, json, os, sys, threading, time, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from concurrent.futures import ThreadPoolExecutor

CH = 256 * 1024  # bytes moved per token-bucket grant


class Bucket:
    """One token bucket shared by every request to this server: the server's whole bandwidth."""
    def __init__(self, rate):
        self.rate, self.t, self.lock = rate, time.monotonic(), threading.Lock()

    def take(self, n):
        with self.lock:
            now = time.monotonic()
            self.t = max(self.t, now) + n / self.rate
            wait = self.t - now
        if wait > 0:
            time.sleep(wait)


def run_ost(a):
    os.makedirs(a.dir, exist_ok=True)
    bucket = Bucket(a.mbps * 1e6)
    stats = {"put_bytes": 0, "get_bytes": 0, "reqs": 0}
    slock = threading.Lock()

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        def log_message(self, *x): pass
        def _q(self):
            u = urllib.parse.urlparse(self.path)
            return u.path, dict(urllib.parse.parse_qsl(u.query))
        def do_PUT(self):
            p, q = self._q(); oid = p.rsplit("/", 1)[-1]; off = int(q.get("off", 0))
            n = int(self.headers["Content-Length"]); fn = os.path.join(a.dir, oid)
            fd = os.open(fn, os.O_WRONLY | os.O_CREAT, 0o644)
            try:
                left, pos = n, off
                while left:
                    b = self.rfile.read(min(CH, left)); bucket.take(len(b))
                    os.pwrite(fd, b, pos); pos += len(b); left -= len(b)
            finally:
                os.close(fd)
            with slock: stats["put_bytes"] += n; stats["reqs"] += 1
            self.send_response(200); self.send_header("Content-Length", "0"); self.end_headers()
        def do_GET(self):
            p, q = self._q()
            if p == "/stats":
                body = json.dumps(stats).encode()
                self.send_response(200); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
            oid = p.rsplit("/", 1)[-1]; off = int(q.get("off", 0)); n = int(q.get("len", 0))
            fd = os.open(os.path.join(a.dir, oid), os.O_RDONLY)
            try:
                b = os.pread(fd, n, off)
            finally:
                os.close(fd)
            self.send_response(200); self.send_header("Content-Length", str(len(b))); self.end_headers()
            for i in range(0, len(b), CH):
                bucket.take(len(b[i:i + CH])); self.wfile.write(b[i:i + CH])
            with slock: stats["get_bytes"] += len(b); stats["reqs"] += 1
        def do_DELETE(self):
            p, _ = self._q()
            try: os.remove(os.path.join(a.dir, p.rsplit("/", 1)[-1]))
            except FileNotFoundError: pass
            self.send_response(200); self.send_header("Content-Length", "0"); self.end_headers()
    s = ThreadingHTTPServer(("0.0.0.0", a.port), H); s.daemon_threads = True; s.serve_forever()


def run_mds(a):
    osts = a.osts.split(",")
    ns = {}          # path -> {"layout": {...}, "size": int}
    lock = threading.Lock()
    st = {"next_ost": 0, "next_oid": 0, "ops": 0}

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        def log_message(self, *x): pass
        def _send(self, code, obj):
            body = json.dumps(obj).encode()
            self.send_response(code); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
        def do_POST(self):
            n = int(self.headers.get("Content-Length", 0)); req = json.loads(self.rfile.read(n) or b"{}")
            op = self.path.strip("/")
            with lock:
                st["ops"] += 1
                if op == "create":
                    if req["path"] in ns: return self._send(409, {"error": "EEXIST"})
                    c = min(int(req.get("count", 1)), len(osts)); size = int(req.get("size", 1 << 20))
                    off = req.get("offset", -1)
                    if off is None or int(off) < 0:          # the server picks the starting OST, round robin
                        off = st["next_ost"]; st["next_ost"] = (st["next_ost"] + c) % len(osts)
                    objs = []
                    for k in range(c):
                        st["next_oid"] += 1
                        objs.append({"ost": (int(off) + k) % len(osts), "oid": "o%08d" % st["next_oid"]})
                    ns[req["path"]] = {"layout": {"count": c, "size": size, "offset": int(off), "objects": objs}, "size": 0}
                    return self._send(200, ns[req["path"]])
                if op == "stat":
                    e = ns.get(req["path"])
                    return self._send(200, e) if e else self._send(404, {"error": "ENOENT"})
                if op == "setsize":
                    e = ns.get(req["path"])
                    if not e: return self._send(404, {"error": "ENOENT"})
                    e["size"] = max(e["size"], int(req["size"])); return self._send(200, {})
                if op == "unlink":
                    e = ns.pop(req["path"], None)
                    return self._send(200, e) if e else self._send(404, {"error": "ENOENT"})
                if op == "ls":
                    pre = req["dir"].rstrip("/") + "/"
                    return self._send(200, sorted(p for p in ns if p.startswith(pre)))
                if op == "info":
                    return self._send(200, {"files": len(ns), "ops": st["ops"], "osts": osts})
            return self._send(400, {"error": "bad op"})
    s = ThreadingHTTPServer(("0.0.0.0", a.port), H); s.daemon_threads = True; s.serve_forever()


# ---------------- client ----------------
class Conn:
    """One persistent HTTP connection per (thread, server)."""
    _tl = threading.local()
    @classmethod
    def get(cls, hostport):
        d = getattr(cls._tl, "d", None)
        if d is None: d = cls._tl.d = {}
        c = d.get(hostport)
        if c is None:
            h, p = hostport.split(":"); c = d[hostport] = http.client.HTTPConnection(h, int(p), timeout=120)
        return c


def call(hostport, method, path, body=None):
    for attempt in range(3):
        c = Conn.get(hostport)
        try:
            c.request(method, path, body=body, headers={"Content-Length": str(len(body) if body else 0)})
            r = c.getresponse(); data = r.read(); return r.status, data
        except (ConnectionError, http.client.HTTPException):
            c.close(); Conn._tl.d.pop(hostport, None)
            if attempt == 2: raise


def mds_op(mds, op, **kw):
    code, data = call(mds, "POST", "/" + op, json.dumps(kw).encode())
    return code, json.loads(data or b"null")


def units(layout, length):
    """(stripe unit index, ost, object offset, length) for a file of `length` bytes: RAID-0."""
    size, c = layout["size"], layout["count"]
    out = []
    for k in range(0, (length + size - 1) // size):
        n = min(size, length - k * size)
        out.append((k, layout["objects"][k % c], (k // c) * size, n))
    return out


def write_range(osts, layout, buf, start):
    """Write buf at file offset start (a multiple of the stripe size); one thread per object."""
    by_obj = {}
    for k, obj, ooff, n in units(layout, start + len(buf)):
        if k * layout["size"] < start: continue
        by_obj.setdefault(obj["oid"], (obj, []))[1].append((ooff, k * layout["size"] - start, n))
    def go(item):
        obj, parts = item
        for ooff, boff, n in parts:
            code, _ = call(osts[obj["ost"]], "PUT", "/obj/%s?off=%d" % (obj["oid"], ooff), buf[boff:boff + n])
            assert code == 200
    with ThreadPoolExecutor(len(by_obj)) as ex: list(ex.map(go, by_obj.values()))


def read_file(osts, layout, length):
    by_obj = {}
    for k, obj, ooff, n in units(layout, length):
        by_obj.setdefault(obj["oid"], (obj, []))[1].append((ooff, n))
    got = [0]
    def go(item):
        obj, parts = item; t = 0
        for ooff, n in parts:
            code, data = call(osts[obj["ost"]], "GET", "/obj/%s?off=%d&len=%d" % (obj["oid"], ooff, n)); t += len(data)
        return t
    with ThreadPoolExecutor(len(by_obj)) as ex: return sum(ex.map(go, by_obj.values()))


def get_osts(mds):
    return mds_op(mds, "info")[1]["osts"]


def bench_stripe(a):
    """One client, one file of --mib MiB, written then read, for each stripe count."""
    osts = get_osts(a.mds); buf = os.urandom(a.mib << 20)
    for c in [int(x) for x in a.counts.split(",")]:
        for rep in range(a.reps):
            p = "/stripe/c%d_r%d" % (c, rep)
            t0 = time.perf_counter(); code, e = mds_op(a.mds, "create", path=p, count=c, size=a.stripe_kib << 10)
            write_range(osts, e["layout"], buf, 0); mds_op(a.mds, "setsize", path=p, size=len(buf)); tw = time.perf_counter() - t0
            t0 = time.perf_counter(); _, e = mds_op(a.mds, "stat", path=p); n = read_file(osts, e["layout"], e["size"]); tr = time.perf_counter() - t0
            assert n == len(buf)
            print(json.dumps({"exp": "stripe", "count": c, "rep": rep, "bytes": len(buf), "stripe_kib": a.stripe_kib,
                              "write_s": round(tw, 4), "read_s": round(tr, 4), "layout": e["layout"]}), flush=True)
            for o in e["layout"]["objects"]: call(osts[o["ost"]], "DELETE", "/obj/" + o["oid"])
            mds_op(a.mds, "unlink", path=p)


def _writer(args):
    mds, path, count, size, offset, mib, shared_start, create = args
    Conn._tl.d = {}  # a forked worker must not reuse the parent's open sockets
    osts = get_osts(mds); buf = os.urandom(mib << 20)
    t0 = time.perf_counter(); w0 = time.time()
    if create:
        code, e = mds_op(mds, "create", path=path, count=count, size=size, offset=offset)
    else:
        for _ in range(200):
            code, e = mds_op(mds, "stat", path=path)
            if code == 200: break
            time.sleep(0.01)
    write_range(osts, e["layout"], buf, shared_start)
    mds_op(mds, "setsize", path=path, size=shared_start + len(buf))
    return time.perf_counter() - t0, e["layout"], w0, time.time()


def bench_nproc(a):
    """--procs writers at once: file per process (balanced or all on OST 0) or one shared file."""
    from multiprocessing import Pool
    P, mib = a.procs, a.mib
    for mode in a.modes.split(","):
        for rep in range(a.reps):
            tag = "/np/%s_r%d" % (mode, rep)
            if mode in ("fpp_balanced", "fpp_ost0"):
                jobs = [(a.mds, "%s/f%d" % (tag, i), 1, 1 << 20, (0 if mode == "fpp_ost0" else -1), mib, 0, True) for i in range(P)]
            else:  # shared file, count from mode name: shared_c1 / shared_c4
                c = int(mode.split("_c")[1])
                mds_op(a.mds, "create", path=tag + "/shared", count=c, size=1 << 20)
                jobs = [(a.mds, tag + "/shared", c, 1 << 20, -1, mib, i * (mib << 20), False) for i in range(P)]
            t0 = time.perf_counter()
            with Pool(P) as pool: res = pool.map(_writer, jobs)
            wall = time.perf_counter() - t0
            used = {}
            for _, lay, _, _ in res:
                for o in lay["objects"]: used[o["ost"]] = 1
            per_ost = {}
            osts = get_osts(a.mds)
            print(json.dumps({"exp": "nproc", "mode": mode, "rep": rep, "procs": P, "bytes": P * (mib << 20), "wall_s": round(wall, 4),
                              "proc_s": [round(r[0], 4) for r in res],
                              "span_s": round(max(r[3] for r in res) - min(r[2] for r in res), 4), "osts_used": sorted(used)}), flush=True)


def _meta_worker(args):
    mds_list, prefix, n = args
    Conn._tl.d = {}
    t = {"create": 0.0, "stat": 0.0, "unlink": 0.0}
    for op in ("create", "stat", "unlink"):
        t0 = time.perf_counter()
        for i in range(n):
            path = "%s/f%06d" % (prefix, i)
            mds = mds_list[fnv1a(path) % len(mds_list)]
            if op == "create": code, _ = mds_op(mds, "create", path=path, count=1)
            else: code, _ = mds_op(mds, op, path=path)
            assert code == 200, (op, code)
        t[op] = time.perf_counter() - t0
    return t


def fnv1a(name):
    # like a Lustre DNE striped directory: a hash of the entry's name picks the metadata server that owns it
    h = 0xcbf29ce484222325
    for b in name.encode():
        h = ((h ^ b) * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return h


def bench_meta(a):
    """--procs clients, each creating, stat-ing, then unlinking --files empty files in its own directory."""
    from multiprocessing import Pool
    mds_list = a.mds.split(",")
    for P in [int(x) for x in a.procs_list.split(",")]:
        for rep in range(a.reps):
            jobs = [(mds_list, "/meta/p%d_r%d_c%02d" % (P, rep, i), a.files) for i in range(P)]
            t0 = time.perf_counter()
            with Pool(P) as pool: res = pool.map(_meta_worker, jobs)
            wall = time.perf_counter() - t0
            ops = 3 * P * a.files
            print(json.dumps({"exp": "meta", "mds": len(mds_list), "procs": P, "rep": rep, "files_per_proc": a.files, "ops": ops,
                              "wall_s": round(wall, 4), "ops_per_s": round(ops / wall, 1),
                              "per_op_s": {k: round(max(r[k] for r in res), 4) for k in ("create", "stat", "unlink")}}), flush=True)


def main():
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    o = sp.add_parser("ost"); o.add_argument("--port", type=int, default=9000); o.add_argument("--dir", default="/data"); o.add_argument("--mbps", type=float, default=25)
    m = sp.add_parser("mds"); m.add_argument("--port", type=int, default=8000); m.add_argument("--osts", required=True)
    b = sp.add_parser("bench"); b.add_argument("exp"); b.add_argument("--mds", required=True); b.add_argument("--reps", type=int, default=3)
    b.add_argument("--mib", type=int, default=128); b.add_argument("--counts", default="1,2,4"); b.add_argument("--stripe-kib", type=int, default=1024)
    b.add_argument("--procs", type=int, default=4); b.add_argument("--modes", default="fpp_balanced,fpp_ost0,shared_c1,shared_c4")
    b.add_argument("--procs-list", default="1,2,4,8,16"); b.add_argument("--files", type=int, default=300)
    a = ap.parse_args()
    if a.cmd == "ost": run_ost(a)
    elif a.cmd == "mds": run_mds(a)
    else: {"stripe": bench_stripe, "nproc": bench_nproc, "meta": bench_meta}[a.exp](a)


if __name__ == "__main__":
    main()
