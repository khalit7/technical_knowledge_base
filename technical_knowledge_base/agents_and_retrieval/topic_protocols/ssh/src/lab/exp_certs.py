# Experiment 5: SSH user certificates from a local CA: a good one, then the failure modes,
# each seen from the client (-v) and from the node's sshd log.
import time, json
from common import *
K = "keys/id_cert_only"
def nlog_reset(): run("docker exec proto-ssh-node1 sh -c ': > /var/log/sshd.log'")
def nlog(): return run("docker exec proto-ssh-node1 cat /var/log/sshd.log")[1]
def sign(args):
    run(f"rm -f {K}-cert.pub")
    return run(f"ssh-keygen -s keys/user_ca {args} {K}.pub")
def attempt(name, sign_args, note):
    rc, o, e, ms = sign(sign_args)
    rcL, oL, eL, _ = run(f"ssh-keygen -L -f {K}-cert.pub")
    nlog_reset()
    rc2, o2, e2, ms2 = run(f"ssh -F cert.conf -o CertificateFile={K}-cert.pub -v gpu-node-01 'echo logged in as $(id -un) on $(hostname)'")
    time.sleep(0.3)
    keep = [l for l in e2.splitlines() if any(s in l for s in ("Offering", "cert", "Cert", "Server accepts", "Authenticated", "Permission denied", "Authentications that"))]
    save(f"cert_{name}.txt", f"# {note}\n$ ssh-keygen -s user_ca {sign_args} id_cert_only.pub\n{o}{e}\n$ ssh-keygen -L -f id_cert_only-cert.pub\n{oL}\n"
         f"$ ssh -v gpu-node-01 ... (lines about keys and certificates)\n[exit {rc2}]\n{o2}" + "\n".join(keep) + "\n--- gpu-node-01 sshd log ---\n" + nlog())
    print(name, rc2, o2.strip())
now = time.strftime("%Y%m%d")
attempt("good", "-I khalid@2026-10-05 -n khalid -V +8h -z 42", "an 8-hour certificate for principal khalid, serial 42")
attempt("expired", "-I khalid@2026-01 -n khalid -V 20260101:20260102 -z 43", "a certificate that expired on 2 January 2026")
attempt("wrong_principal", "-I khalid@2026-10-05 -n alice -V +8h -z 44", "a certificate for principal alice, used to log in as khalid")
attempt("no_principal", "-I khalid@2026-10-05 -V +8h -z 45", "a certificate with an empty principals list (ssh-keygen warns)")
# revocation: a key revocation list (KRL) that revokes serial 42, pushed to the node
run("ssh-keygen -k -f keys/revoked.krl -s keys/user_ca.pub -z 46 /dev/null 2>/dev/null || true")
open(os.path.join(S, "keys/krl_spec"), "w").write("serial: 46\n")
rc, o, e, _ = run("ssh-keygen -k -f keys/revoked.krl -s keys/user_ca.pub keys/krl_spec")
run("docker cp keys/revoked.krl proto-ssh-node1:/etc/ssh/revoked.krl")
run("docker exec proto-ssh-node1 sh -c 'mkdir -p /etc/ssh/sshd_config.d; echo RevokedKeys /etc/ssh/revoked.krl > /etc/ssh/sshd_config.d/krl.conf; kill -HUP $(cat /var/run/sshd.pid 2>/dev/null || pgrep -o sshd)'")
time.sleep(1)
attempt("revoked", "-I khalid@2026-10-05 -n khalid -V +8h -z 46", "serial 46 is in the node's revocation list (KRL)")
rcq, oq, eq, _ = run("ssh-keygen -Q -f keys/revoked.krl keys/id_cert_only-cert.pub")
save("cert_krl_query.txt", f"$ ssh-keygen -k -f revoked.krl -s user_ca.pub krl_spec   (krl_spec: 'serial: 46')\n{o}{e}\n$ ssh-keygen -Q -f revoked.krl id_cert_only-cert.pub\n[exit {rcq}]\n{oq}{eq}")
run("docker exec proto-ssh-node1 sh -c 'rm /etc/ssh/sshd_config.d/krl.conf; kill -HUP $(pgrep -o sshd)'")
time.sleep(1)
attempt("good_final", "-I khalid@2026-10-05 -n khalid -V +8h -z 47", "a fresh good certificate after the revocation test")
