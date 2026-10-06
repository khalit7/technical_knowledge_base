#!/usr/bin/env python3
"""Build parts/26_js_hsec_data.js for the Agent security page. DEFENSIVE ONLY.

All evidence on this page is a control doing its job on benign or clearly-dangerous actions, with no
model and no attack performed:
  1. gate_cases  : the root Loop lab's real gate check() run on a fixed action set (reused verbatim
                   from ../../../src/loop/gate_cases.json, the root's approved table; not re-recorded).
  2. sandbox     : a benign Seatbelt demonstration run here (sb_probe.py under net.sb/write.sb): a
                   benign command tries to open a local socket and to write outside its directory;
                   the kernel refuses both, and an in-tree write succeeds. The only bytes ever sent
                   are the fixed marker '/sandbox-demo-ping'.
  3. egress      : egress_policy.decide() on representative outbound requests (a destination
                   allow-list policy simulation; no network).
  4. listener    : what the local listener recorded during the sandbox demo (only the benign marker).

No prompt-injection payload, no exfiltration command, and no model run appears anywhere in the output.
"""
import json, os, socket, subprocess, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)                    # .../agent_security/src
ROOT_GATE = os.path.normpath(os.path.join(SRC, "..", "..", "src", "loop", "gate_cases.json"))
OUT = os.path.join(SRC, "parts", "26_js_hsec_data.js")

sys.path.insert(0, HERE)
import egress_policy  # noqa: E402

HOST_LABEL = "macOS 27.0.1 (26A434), Apple M1 Pro"
DATE = "2026-10-06"
PORT = 8744
MARKER = "/sandbox-demo-ping"


def load_gate_cases():
    cases = json.load(open(ROOT_GATE))
    # add a small family tag so the tab can filter; purely by the gate's own verdict and target.
    out = []
    for o in cases:
        tgt = o["args"].get("cmd") or o["args"].get("path") or ""
        fam = "allow" if o["verdict"] == "allow" else "deny"
        out.append({"tool": o["tool"], "args": o["args"], "note": o.get("note", ""),
                    "verdict": o["verdict"], "why": o["why"], "family": fam, "target": tgt})
    return out


def run_sandbox_demo():
    """Start a tiny local listener, run the benign probe with and without a Seatbelt profile."""
    hits = []
    stop = threading.Event()

    def serve():
        srv = socket.socket()
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("127.0.0.1", PORT))
        srv.listen(5)
        srv.settimeout(0.5)
        while not stop.is_set():
            try:
                c, _ = srv.accept()
            except socket.timeout:
                continue
            data = c.recv(256).decode("latin1")
            path = data.split(" ")[1] if " " in data else "?"
            hits.append(path)
            c.close()
        srv.close()

    t = threading.Thread(target=serve, daemon=True)
    t.start()
    time.sleep(0.4)

    work = os.path.join(HERE, "_sbwork")
    os.makedirs(work, exist_ok=True)
    env = dict(os.environ, HSEC_WORK=work)
    probe = os.path.join(HERE, "sb_probe.py")
    net_sb = os.path.join(HERE, "net.sb")
    write_sb = os.path.join(HERE, "write.sb")

    def run(cmd):
        return subprocess.run(cmd, capture_output=True, text=True, env=env).stdout.strip()

    cases = [
        {"op": "connect to a local socket and send a benign marker", "profile": "none (unsandboxed)",
         "result": run(["python3", probe, "net", str(PORT)])},
        {"op": "connect to a local socket and send a benign marker", "profile": "(deny network*)",
         "result": run(["sandbox-exec", "-f", net_sb, "python3", probe, "net", str(PORT)])},
        {"op": "write a file to /tmp (outside the work dir)", "profile": "none (unsandboxed)",
         "result": run(["python3", probe, "write_out"])},
        {"op": "write a file to /tmp (outside the work dir)", "profile": "(deny file-write*) + allow subpath WORK",
         "result": run(["sandbox-exec", "-D", "WORK=" + work, "-f", write_sb, "python3", probe, "write_out"])},
        {"op": "write a file inside the work dir", "profile": "(deny file-write*) + allow subpath WORK",
         "result": run(["sandbox-exec", "-D", "WORK=" + work, "-f", write_sb, "python3", probe, "write_in"])},
    ]
    time.sleep(0.3)
    stop.set()
    t.join(timeout=2)
    # tidy the throw-away write targets
    for p in ("/tmp/hsec_wtest.txt", os.path.join(work, "ok.txt")):
        try:
            os.remove(p)
        except OSError:
            pass
    try:
        os.rmdir(work)
    except OSError:
        pass

    sandbox = {
        "tool": "sandbox-exec (macOS Seatbelt), the same sandbox mechanism Claude Code and Codex use on macOS",
        "host": HOST_LABEL, "date": DATE,
        "note": "The only bytes sent in the network case are the fixed marker '" + MARKER
                + "'. No secret and no attack: this shows the sandbox refusing benign operations it is told to refuse.",
        "cases": cases,
        "deny_net_sb": open(net_sb).read().strip(),
        "deny_write_sb": open(write_sb).read().strip(),
    }
    listener = {"total": len(hits), "paths": sorted(set(hits)), "secret_seen": False}
    return sandbox, listener


def main():
    data = {
        "meta": {"date": DATE, "host": HOST_LABEL},
        "gate_cases": load_gate_cases(),
        "egress": egress_policy.run(),
    }
    sandbox, listener = run_sandbox_demo()
    data["sandbox"] = sandbox
    data["listener"] = listener

    js = "/* 26_js_hsec_data.js: defensive evidence (gate decisions, benign sandbox demo, egress policy). Built by src/sec/build_data.py. */\nwindow.HSEC=" \
         + json.dumps(data, separators=(",", ":")) + ";\n"
    open(OUT, "w").write(js)

    # privacy grep: nothing identifying may enter the repo copy.
    bad = [s for s in ("/Users/", "Users-", "khalid", "glpat", "sk-ant") if s in js]
    if bad:
        print("PRIVACY LEAK:", bad)
        sys.exit(1)
    print("wrote", OUT, len(js), "bytes; gate_cases", len(data["gate_cases"]),
          "egress", len(data["egress"]), "sandbox cases", len(sandbox["cases"]),
          "listener", listener)


if __name__ == "__main__":
    main()
