# Experiment 7: port forwarding for a notebook on a compute node: -L (TCP and Unix socket), -D (SOCKS), -R,
# who else can reach the notebook, and the silent failure when the local port is taken.
import subprocess, time, json
from common import *
TOK = "lab-token-0001"
PY = "python3 -c \"import sys,urllib.request as u\ntry:\n r=u.urlopen(sys.argv[1],timeout=3);print(r.status,r.read().decode().strip())\nexcept u.HTTPError as e: print(e.code,e.read().decode().strip())\nexcept Exception as e: print('no connection:',e)\""
def bg(cmd):
    p = subprocess.Popen(cmd, shell=True, cwd=S, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True); time.sleep(2.5); return p
def stop(p):
    p.terminate()
    try: so, se = p.communicate(timeout=5)
    except subprocess.TimeoutExpired: p.kill(); so, se = p.communicate()
    return so, se
out = []
# 1. -L to the notebook bound on the node's loopback, through the bastion
p = bg(f"{SSH} -vvv -N -L 30988:127.0.0.1:8888 gpu-node-01")
r1 = run(f"curl -sS -m 5 'http://127.0.0.1:30988/?token={TOK}'")[1]
r0 = run(f"curl -sS -m 5 -o /dev/null -w '%{{http_code}}' 'http://127.0.0.1:30988/'")[1]
so, se = stop(p)
keep = [l for l in se.splitlines() if any(s in l for s in ("forward", "Forward", "direct-tcpip", "Local connections", "channel 2: new", "channel 3: new", "listening"))]
save("fwd_L.txt", "# ssh -N -L 30988:127.0.0.1:8888 gpu-node-01 (ProxyJump bastion), then curl on the laptop\n"
     f"$ curl 'http://127.0.0.1:30988/?token=...'\n{r1}\n$ curl -w '%{{http_code}}' http://127.0.0.1:30988/   (no token)\n{r0}\n--- ssh -vvv, forwarding lines ---\n" + "\n".join(keep[:40]))
print("L:", r1.strip(), r0)
# 2. who else reaches it: another user on the same node, and another node
probes = {
  "alice on gpu-node-01 -> 127.0.0.1:8888 (loopback)": f"docker exec -u alice proto-ssh-node1 {PY} http://127.0.0.1:8888/",
  "alice on gpu-node-01 -> 127.0.0.1:8888 with the token": f"docker exec -u alice proto-ssh-node1 {PY} 'http://127.0.0.1:8888/?token={TOK}'",
  "gpu-node-02 -> gpu-node-01:8888 (loopback-bound)": f"docker exec proto-ssh-node2 {PY} http://gpu-node-01:8888/",
  "gpu-node-02 -> gpu-node-01:8889 (bound to 0.0.0.0)": f"docker exec proto-ssh-node2 {PY} http://gpu-node-01:8889/",
  "alice on gpu-node-01 -> Unix socket in khalid's 0700 directory": "docker exec -u alice proto-ssh-node1 python3 -c \"import socket;s=socket.socket(socket.AF_UNIX)\ntry:\n s.connect('/home/khalid/.nb/nb.sock');print('connected')\nexcept Exception as e: print('refused:',e)\"",
}
res = {k: run(v)[1].strip() for k, v in probes.items()}
json.dump(res, open(os.path.join(RAW, "fwd_who_reaches.json"), "w"), indent=1); print(json.dumps(res, indent=1))
# 3. -L to a Unix socket on the node
p = bg(f"{SSH} -N -L 30986:/home/khalid/.nb/nb.sock gpu-node-01")
r = run(f"curl -sS -m 5 'http://127.0.0.1:30986/?token={TOK}'")[1]; stop(p)
save("fwd_L_unix.txt", f"# ssh -N -L 30986:/home/khalid/.nb/nb.sock gpu-node-01: a TCP port on the laptop to a Unix socket on the node\n$ curl http://127.0.0.1:30986/?token=...\n{r}")
# 4. -D: a SOCKS proxy on the laptop; names resolve on the far side only with socks5h
p = bg(f"{SSH} -N -D 30989 bastion")
a = run(f"curl -sS -m 5 --socks5-hostname 127.0.0.1:30989 'http://gpu-node-01:8889/?token={TOK}'")
b = run(f"curl -sS -m 5 --socks5 127.0.0.1:30989 'http://gpu-node-01:8889/?token={TOK}'")
c = run(f"curl -sS -m 5 -x socks5h://127.0.0.1:30989 'http://gpu-node-01:8888/?token={TOK}'")
stop(p)
save("fwd_D.txt", "# ssh -N -D 30989 bastion: one SOCKS proxy reaches every service the bastion can reach\n"
     f"$ curl --socks5-hostname 127.0.0.1:30989 http://gpu-node-01:8889/?token=...   (name resolved by the bastion)\n[exit {a[0]}] {a[1]}{a[2]}\n"
     f"$ curl --socks5 127.0.0.1:30989 http://gpu-node-01:8889/?token=...   (name resolved on the laptop)\n[exit {b[0]}] {b[1]}{b[2]}\n"
     f"$ curl -x socks5h://127.0.0.1:30989 http://gpu-node-01:8888/?token=...   (the loopback-bound notebook)\n[exit {c[0]}] {c[1]}{c[2]}\n")
# 5. -R: expose a laptop service on the bastion
os.makedirs(os.path.join(S, "www"), exist_ok=True); open(os.path.join(S, "www/hello.txt"), "w").write("served from the laptop\n")
w = subprocess.Popen("python3 -m http.server 30990 --bind 127.0.0.1", shell=True, cwd=os.path.join(S, "www"), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
r = rec("fwd_R.txt", f"{SSH} -R 30991:127.0.0.1:30990 bastion 'wget -qO- http://127.0.0.1:30991/hello.txt; netstat -ltn | grep 30991'",
        note="ssh -R: a port on the bastion's loopback that leads back to the laptop (GatewayPorts no keeps it on loopback)")
w.terminate()
# 6. the local port is already taken: ssh warns and carries on, unless ExitOnForwardFailure=yes
HOLD4 = "s=socket.socket();s.bind(('127.0.0.1',30985));s.listen();"
HOLD6 = "s6=socket.socket(socket.AF_INET6);s6.bind(('::1',30985));s6.listen();"
txt = ""
for label, hold_code in (("only 127.0.0.1:30985 is taken (::1 is free)", HOLD4), ("both 127.0.0.1:30985 and [::1]:30985 are taken", HOLD4 + HOLD6)):
    hold = subprocess.Popen(["python3", "-c", "import socket,time;" + hold_code + "time.sleep(20)"]); time.sleep(0.5)
    a = run(f"{SSH} -L 30985:127.0.0.1:8888 gpu-node-01 'echo session ran anyway'")
    b = run(f"{SSH} -o ExitOnForwardFailure=yes -L 30985:127.0.0.1:8888 gpu-node-01 'echo session ran anyway'")
    c = run("curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:30985/ || true")
    hold.terminate(); hold.wait()
    txt += (f"## {label}\n$ ssh -L 30985:127.0.0.1:8888 gpu-node-01 'echo session ran anyway'\n[exit {a[0]}]\n{a[1]}{a[2]}\n"
            f"$ ssh -o ExitOnForwardFailure=yes -L 30985:127.0.0.1:8888 gpu-node-01 'echo session ran anyway'\n[exit {b[0]}]\n{b[1]}{b[2]}\n")
save("fwd_port_taken.txt", "# port 30985 on the laptop is already held by another program. -L with no bind address listens on localhost: 127.0.0.1 and ::1\n" + txt)
for f in ("fwd_port_taken.txt",): print(open(os.path.join(RAW, f)).read())
