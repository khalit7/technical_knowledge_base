# Experiment 6: trust on first use, host-key churn when a node is rebuilt, and host certificates.
import os, pty, time, select, re
from common import *
def pty_run(cmd, answer, timeout=15):
    """Run cmd on a terminal so ssh asks its question; answer it; return the transcript."""
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(S); os.execvp("/bin/sh", ["/bin/sh", "-c", cmd])
    out = b""; sent = False; t = time.time()
    while time.time() - t < timeout:
        r, _, _ = select.select([fd], [], [], 0.5)
        if r:
            try: d = os.read(fd, 4096)
            except OSError: break
            if not d: break
            out += d
            if not sent and b"(yes/no" in out:
                os.write(fd, (answer + "\n").encode()); sent = True
    try: os.waitpid(pid, 0)
    except ChildProcessError: pass
    return out.decode(errors="replace").replace("\r", "")
def restart_node1():
    run("sh lab/down.sh node1"); time.sleep(1); run("sh lab/up.sh node1")
def node1_fp():
    return run("docker exec proto-ssh-node1 ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub")[1]
TOFU = "ssh -F laptop.conf -o BatchMode=no -o StrictHostKeyChecking=ask -o UserKnownHostsFile=./known_hosts_tofu"
run("rm -f known_hosts_tofu; grep '^bastion ' known_hosts > known_hosts_tofu")
# 1. first contact, interactive: ssh shows the fingerprint and asks
t = pty_run(f"{TOFU} gpu-node-01 hostname", "yes")
save("hk_first_contact.txt", "# first contact with gpu-node-01, StrictHostKeyChecking=ask, answered yes\n$ ssh gpu-node-01 hostname\n" + t +
     "\n# the fingerprint to compare it with, read on the node itself (out of band):\n$ ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub\n" + node1_fp())
# 2. unknown host in batch mode with strict checking
rec("hk_strict_unknown.txt", "ssh -F laptop.conf -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/dev/null gpu-node-02 hostname",
    note="StrictHostKeyChecking=yes and an empty known_hosts: refused before authentication")
# 3. the node is rebuilt: new host key
before = node1_fp(); restart_node1(); after = node1_fp()
rec("hk_changed_acceptnew.txt", f"{TOFU.replace('ask','accept-new').replace('BatchMode=no','BatchMode=yes')} gpu-node-01 hostname",
    note=f"gpu-node-01 rebuilt. host key before: {before.strip()} | after: {after.strip()}. accept-new still refuses a CHANGED key")
rec("hk_changed_no.txt", f"{TOFU.replace('ask','no').replace('BatchMode=no','BatchMode=yes')} -o IdentityAgent=a.sock -o ForwardAgent=yes -L 30987:127.0.0.1:8888 gpu-node-01 hostname",
    note="StrictHostKeyChecking=no with a changed key, asking for agent and port forwarding too: what does OpenSSH still do?")
rec("hk_remove.txt", "ssh-keygen -R gpu-node-01 -f known_hosts_tofu", note="remove the stale entry, then connect again and compare the new fingerprint")
# 4. host certificates: the provisioning step signs each node's host key; clients trust the CA once
def sign_node1(names="gpu-node-01"):
    run("docker cp proto-ssh-node1:/etc/ssh/ssh_host_ed25519_key.pub keys/node1_host.pub")
    rc, o, e, _ = run(f"ssh-keygen -s keys/host_ca -h -I gpu-node-01-host -n {names} -V +52w keys/node1_host.pub")
    run("docker cp keys/node1_host-cert.pub proto-ssh-node1:/etc/ssh/ssh_host_ed25519_key-cert.pub")
    run("docker exec proto-ssh-node1 sh -c 'mkdir -p /etc/ssh/sshd_config.d; echo HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub > /etc/ssh/sshd_config.d/hostcert.conf; kill -HUP $(pgrep -o sshd)'")
    time.sleep(1); return o + e
ca = open(os.path.join(S, "keys/host_ca.pub")).read().strip()
open(os.path.join(S, "known_hosts_ca"), "w").write(open(os.path.join(S, "known_hosts_tofu")).read().split("\n")[0] + "\n@cert-authority gpu-node-* " + ca + "\n")
CA = "ssh -F laptop.conf -o StrictHostKeyChecking=yes -o UserKnownHostsFile=./known_hosts_ca -v"
s = sign_node1()
r1 = rec("hk_cert_ok.txt", f"{CA} gpu-node-01 hostname", note="known_hosts holds only the bastion and one @cert-authority line; gpu-node-01 presents a host certificate. Signing: " + s.strip())
restart_node1(); s2 = sign_node1()
r2 = rec("hk_cert_after_rebuild.txt", f"{CA} gpu-node-01 hostname", note="gpu-node-01 rebuilt again (new key), re-signed at boot: no prompt, no warning, nothing to edit. Signing: " + s2.strip())
s3 = sign_node1("gpu-node-99")
r3 = rec("hk_cert_wrong_name.txt", f"{CA} gpu-node-01 hostname", note="a host certificate issued for another name: " + s3.strip())
sign_node1()
for f in ("hk_cert_ok", "hk_cert_after_rebuild", "hk_cert_wrong_name"):
    p = os.path.join(RAW, f + ".txt"); t = open(p).read()
    keep = [l for l in t.splitlines() if not l.startswith("debug1: ") or any(s in l for s in ("certificate", "Certificate", "cert-authority", "Host '", "authority", "Server host"))]
    open(p, "w").write("\n".join(keep) + "\n")
print(open(os.path.join(RAW, "hk_cert_ok.txt")).read()[:1500])
