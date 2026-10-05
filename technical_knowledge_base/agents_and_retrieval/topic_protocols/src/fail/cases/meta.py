"""Record the machine and tool versions every run was made with (out/_meta.json)."""
from lab import run, save


def main():
    save("_meta", [
        run("sysctl -n machdep.cpu.brand_string; sw_vers -productVersion; uname -m"),
        run("uptime"),
        run("curl --version | head -1"),
        run("$OPENSSL version; nginx_v=$($NGINX_BIN -v 2>&1); echo $nginx_v; node --version; dig -v 2>&1"),
        run("$PY -c \"import sys, importlib.metadata as m; print('Python', sys.version.split()[0]); "
            "print(', '.join(p + ' ' + m.version(p) for p in ['requests', 'httpx', 'grpcio', 'h2', 'hypercorn', 'dnspython', 'PyJWT', 'mcp', 'cryptography']))\""),
    ])
