"""Start every local server the failure lab needs, run the chosen case modules, stop everything.
python run_cases.py [module ...]   (default: all, in order)"""
import os, signal, sys, time, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lab

ORDER = ["meta", "conn", "dns", "tls", "http", "h2", "tcp", "auth", "agent"]


def nginx_up():
    src = open(os.path.join(lab.HERE, "conf", "nginx.conf.in")).read()
    conf = src.replace("@WORK@", lab.WORK).replace("@PKI@", lab.PKI).replace("@NGX@", lab.NGX)
    for d in ("body", "proxy", "fcgi", "uwsgi", "scgi"):
        os.makedirs(os.path.join(lab.WORK, "ngx_tmp", d), exist_ok=True)
    p = os.path.join(lab.WORK, "nginx.conf"); open(p, "w").write(conf)
    open(os.path.join(lab.WORK, "nginx_error.log"), "w").close()
    lab.start([lab.ENV["NGINX_BIN"], "-c", p, "-p", lab.WORK], log="nginx.log", port=27100)


def main(mods):
    try:
        lab.wire_server(27080, 27480)
        lab.wire_server(27081, 27481, TOKEN_GAP=2.5)
        for name, port in [("rst", 27090), ("empty", 27091), ("short", 27092), ("kadrop", 27093), ("ratelimit", 27095), ("silent", 27098)]:
            lab.start([lab.PY, "toys.py", name, str(port)], log=f"toy_{name}.log", port=port)
        lab.start([lab.PY, "tls_noalpn.py", "27451", lab.PKI + "/server.pem", lab.PKI + "/server.key"], log="noalpn.log", port=27451)
        lab.start([lab.PY, "tls_noalpn.py", "27452", lab.PKI + "/server.pem", lab.PKI + "/server.key", lab.PKI + "/ca.pem"], log="mtls.log", port=27452)
        nginx_up()
        for m in mods:
            print(f"===== {m}", flush=True)
            importlib.import_module("cases." + m).main()
    finally:
        lab.stop_all()


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *a: sys.exit(1))  # so finally: stops every server
    main(sys.argv[1:] or ORDER)
