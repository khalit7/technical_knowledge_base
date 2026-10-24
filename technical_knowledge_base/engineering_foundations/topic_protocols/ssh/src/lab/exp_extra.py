# Experiment 11: the remaining error messages of the debugging table, each produced on purpose.
from common import *
cases = [
 ("refused", "nothing listens on laptop port 30999", f"{SSH} -o HostName=127.0.0.1 -o Port=30999 -o HostKeyAlias=bastion bastion true"),
 ("no_kex", "the client insists on ML-KEM, the old node offers only classic key exchange", f"{SSH} -o LogLevel=INFO -o KexAlgorithms=mlkem768x25519-sha256 gpu-node-02 true"),
 ("no_node", "ProxyJump to a node name the bastion cannot resolve", f"{SSH} gpu-node-99 true"),
 ("no_user", "a user that does not exist on the node", f"{SSH} -o User=nobody2 gpu-node-01 true"),
]
out = []
for name, note, cmd in cases:
    rc, o, e, ms = run(cmd, timeout=30)
    out.append(f"## {note}\n$ {cmd}\n[exit {rc}]\n{o}{e}")
save("errors_extra.txt", "# error messages produced on purpose\n" + "\n".join(out))
print(open(os.path.join(RAW, "errors_extra.txt")).read())
