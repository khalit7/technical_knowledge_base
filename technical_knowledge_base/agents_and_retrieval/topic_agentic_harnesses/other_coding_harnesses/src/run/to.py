"""to.py SECONDS CMD...: run CMD in its own process group; on timeout or on SIGTERM/SIGINT to this wrapper,
terminate the whole group (sandboxed harnesses re-launch themselves as children)."""
import subprocess, sys, os, signal
t = float(sys.argv[1])
p = subprocess.Popen(sys.argv[2:], start_new_session=True, stdin=subprocess.DEVNULL)


def stop(*_):
    try:
        os.killpg(p.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass


signal.signal(signal.SIGTERM, lambda *a: (stop(), sys.exit(143)))
signal.signal(signal.SIGINT, lambda *a: (stop(), sys.exit(130)))
try:
    sys.exit(p.wait(timeout=t))
except subprocess.TimeoutExpired:
    stop(); p.wait(); print("TIMEOUT", flush=True); sys.exit(124)
