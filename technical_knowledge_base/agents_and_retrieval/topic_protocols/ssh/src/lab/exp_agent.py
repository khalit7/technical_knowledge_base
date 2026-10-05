# Experiment 3: agent forwarding (-A) against ProxyJump, and what root on the bastion can do with each.
import subprocess, time, json
from common import *
A = {"SSH_AUTH_SOCK": "a.sock"}
AG = f"{SSH} -o IdentityAgent=a.sock"
run("ssh-add -D", env=A); run("ssh-add keys/id_ed25519", env=A)
# bastion needs to know the nodes' host keys for the hop it makes itself
run(f"{SSH} bastion 'mkdir -p ~/.ssh; ssh-keyscan -t ed25519 gpu-node-01 gpu-node-02 > ~/.ssh/known_hosts 2>/dev/null'")
ROOTSPY = ("docker exec proto-ssh-bastion sh -c 'for s in $(find /home/khalid/.ssh/agent /tmp -type s 2>/dev/null); do "
           "echo socket: $s; SSH_AUTH_SOCK=$s ssh-add -l; "
           "for h in gpu-node-01 gpu-node-02; do SSH_AUTH_SOCK=$s ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR khalid@$h \"echo root on bastion logged in to \\$(hostname) as \\$(id -un)\" || echo root on bastion refused at $h; done; done; echo done'")
def scenario(name, sess_cmd, note):
    p = subprocess.Popen(sess_cmd, shell=True, cwd=S, env=dict(os.environ, **A), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    time.sleep(2.5)
    rc, o, e, ms = run(ROOTSPY)
    so, se = p.communicate(timeout=30)
    save(f"agent_{name}.txt", f"# {note}\n$ {sess_cmd}\n--- session stdout ---\n{so}--- session stderr ---\n{se}\n"
         f"# meanwhile, as root on the bastion:\n$ {ROOTSPY}\n[exit {rc}]\n{o}{e}")
    print(name, "->", o.strip().replace("\n", " | ")[:300])
# 1: ssh -A to the bastion, then hop from there (the forwarded agent is used by the bastion's ssh)
scenario("forward", f"{AG} -o ForwardAgent=yes bastion 'echo SSH_AUTH_SOCK=$SSH_AUTH_SOCK; ssh -o BatchMode=yes gpu-node-01 hostname; sleep 5'",
         "agent forwarding: the laptop's agent is reachable from the bastion while the session lasts")
# 2: ProxyJump: the bastion relays bytes only
scenario("proxyjump", f"{AG} gpu-node-01 'echo SSH_AUTH_SOCK=${{SSH_AUTH_SOCK:-unset}}; hostname; sleep 5'",
         "ProxyJump: the bastion only forwards an encrypted TCP stream; no agent socket exists there")
# 3: destination-constrained key (ssh-add -h): forwarded, but usable only for bastion -> gpu-node-01
run("ssh-add -D", env=A)
rc, o, e, ms = run("ssh-add -H known_hosts -h bastion -h 'bastion>gpu-node-01' keys/id_ed25519", env=A)
save("agent_constrain_add.txt", f"$ ssh-add -H known_hosts -h bastion -h 'bastion>gpu-node-01' keys/id_ed25519\n[exit {rc}]\n{o}{e}")
# the bastion's own ssh needs the node keys in its known_hosts for the agent to check the hop; the agent uses the laptop's list
run(f"{SSH} bastion 'true'")
scenario("constrained", f"{AG} -o ForwardAgent=yes bastion 'ssh -o BatchMode=yes gpu-node-01 hostname; ssh -o BatchMode=yes gpu-node-02 hostname; sleep 5'",
         "destination-constrained key: forwarded, but the agent only signs for laptop->bastion and bastion->gpu-node-01")
run("ssh-add -D", env=A)
