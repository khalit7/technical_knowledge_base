# Experiment 8: smaller failures and diagnostics: the post-quantum warning against an old node, too many
# authentication failures, keepalives when the far end freezes, sshd's effective defaults, PerSourcePenalties, ssh -Z, ssh -G.
import subprocess, time, json, re
from common import *
A = {"SSH_AUTH_SOCK": "a.sock"}
# a. WarnWeakCrypto
a = run(f"{SSH} -o LogLevel=INFO gpu-node-02 hostname")
b = run(f"{SSH} -o LogLevel=INFO -o WarnWeakCrypto=no-pq-kex gpu-node-02 hostname")
c = run(f"{SSH} -v gpu-node-02 true")
kex = [l for l in c[2].splitlines() if "kex: algorithm" in l or "remote software version" in l]
save("pq_warning.txt", f"# gpu-node-02 runs OpenSSH 9.7p1 configured with KexAlgorithms curve25519-sha256,ecdh-sha2-nistp256 (an old login node)\n"
     f"$ ssh gpu-node-02 hostname\n[exit {a[0]}]\n{a[1]}{a[2]}\n$ ssh -o WarnWeakCrypto=no-pq-kex gpu-node-02 hostname\n[exit {b[0]}]\n{b[1]}{b[2]}\n$ ssh -v gpu-node-02 true | grep kex\n" + "\n".join(kex) + "\n")
# b. too many authentication failures: an agent holding seven unrelated keys
run("ssh-add -D", env=A)
for i in range(7):
    if not os.path.exists(os.path.join(S, f"keys/junk{i}")): run(f"ssh-keygen -q -t ed25519 -N '' -C junk{i} -f keys/junk{i}")
    run(f"ssh-add keys/junk{i}", env=A)
a = run(f"{SSH} -o IdentityAgent=a.sock -o IdentitiesOnly=no -v bastion true")
offers = [l for l in a[2].splitlines() if "Offering" in l or "Too many" in l or "Received disconnect" in l or "Authentications that" in l]
b = run(f"{SSH} -o IdentityAgent=a.sock -o IdentitiesOnly=yes bastion 'echo fixed'")
save("too_many_auth.txt", "# the agent holds 7 keys the server does not know; the right key is in IdentityFile. sshd MaxAuthTries is 6 by default\n"
     f"$ ssh -o IdentitiesOnly=no -v bastion true\n[exit {a[0]}]\n" + "\n".join(offers) + f"\n\n$ ssh -o IdentitiesOnly=yes bastion 'echo fixed'\n[exit {b[0]}]\n{b[1]}{b[2]}")
run("ssh-add -D", env=A)
# c. keepalives: the bastion freezes (docker pause) under a live session
def freeze_test(opts, wait=30):
    p = subprocess.Popen(f"exec {SSH} {opts} gpu-node-01 'echo started; sleep 120'", shell=True, cwd=S, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    time.sleep(3); run("docker pause proto-ssh-bastion"); t = time.perf_counter()
    try:
        so, se = p.communicate(timeout=wait); el = time.perf_counter() - t; res = f"ssh exited {p.returncode} after {el:.1f} s"
    except subprocess.TimeoutExpired:
        import signal; os.killpg(p.pid, signal.SIGKILL); so, se = p.communicate(timeout=10); res = f"ssh still waiting after {wait} s (killed by the script)"
    run("docker unpause proto-ssh-bastion"); time.sleep(1)
    return res, so, se
r1 = freeze_test("-o ServerAliveInterval=2 -o ServerAliveCountMax=2")
r2 = freeze_test("-o ServerAliveInterval=0", wait=30)
save("keepalive.txt", "# a session to gpu-node-01 through the bastion; 3 s in, the bastion is frozen (docker pause): packets vanish, nothing is refused\n"
     f"## ssh -o ServerAliveInterval=2 -o ServerAliveCountMax=2 gpu-node-01 'sleep 120'\n{r1[0]}\nstdout: {r1[1]}stderr: {r1[2]}\n"
     f"## ssh -o ServerAliveInterval=0 gpu-node-01 'sleep 120'   (the default)\n{r2[0]}\nstdout: {r2[1]}stderr: {r2[2]}\n")
print(r1[0], "|", r2[0])
# d. sshd's effective settings (OpenSSH 10.5p1, distribution defaults plus the lab's file)
o = run("docker exec proto-ssh-bastion sshd -T")[1]
keys = ["kexalgorithms", "hostkeyalgorithms", "ciphers", "macs", "maxauthtries", "maxstartups", "logingracetime", "persourcepenalties",
        "clientaliveinterval", "clientalivecountmax", "allowagentforwarding", "allowtcpforwarding", "gatewayports", "permitrootlogin",
        "passwordauthentication", "pubkeyauthentication", "trustedusercakeys", "authorizedkeysfile", "rekeylimit", "unusedconnectiontimeout", "channeltimeout"]
lines = [l for l in o.splitlines() if l.split(" ")[0].lower() in keys]
save("sshd_T.txt", "# sshd -T on the bastion (OpenSSH 10.5p1): the effective server settings, defaults included\n$ sshd -T | grep ...\n" + "\n".join(lines) + "\n")
o2 = run("docker exec proto-ssh-node2 sshd -T")[1]
save("sshd_T_legacy.txt", "# sshd -T on gpu-node-02 (OpenSSH 9.7p1)\n" + "\n".join(l for l in o2.splitlines() if l.split(" ")[0].lower() in keys) + "\n")
# e. ssh -G: the client's effective config for one host
o = run(f"{SSH} -G gpu-node-01")[1]
keep = [l for l in o.splitlines() if l.split(" ")[0] in ("hostname", "user", "port", "proxyjump", "identityfile", "identitiesonly", "stricthostkeychecking",
        "userknownhostsfile", "controlmaster", "controlpath", "serveraliveinterval", "serveralivecountmax", "kexalgorithms", "forwardagent", "warnweakcrypto")]
save("ssh_G.txt", "# ssh -G gpu-node-01: what the client will actually use (config resolved, defaults filled in)\n" + "\n".join(keep) + "\n")
# f. ssh -Z (new in 10.5), run with the bastion's 10.5 client
run("docker exec -u khalid proto-ssh-bastion sh -c 'cd ~/.ssh && for t in ed25519 ecdsa; do [ -f id_$t ] || ssh-keygen -q -t $t -N \"\" -f id_$t; done'")
o = run("docker exec -u khalid proto-ssh-bastion ssh -Z khalid@gpu-node-01")
save("ssh_Z.txt", f"# ssh -Z (OpenSSH 10.5): the keys that would be tried, in order, without connecting. Run on the bastion (10.5p1 client); the laptop's 10.3p1 client lacks it\n$ ssh -Z khalid@gpu-node-01\n[exit {o[0]}]\n{o[1]}{o[2]}")
# g. what the banner says against what is installed (distributions backport fixes without changing the version)
b = run(f"{SSH} -v gpu-node-02 true")[2]
ban = [l for l in b.splitlines() if "remote software version" in l]
pk = run("docker exec proto-ssh-node2 sh -c 'apk info -v 2>/dev/null | grep openssh-server'")[1]
save("banner_vs_package.txt", "# gpu-node-02: the version a scanner reads from the banner, and the package actually installed\n" + "\n".join(ban) + "\n$ apk info -v | grep openssh-server\n" + pk)
