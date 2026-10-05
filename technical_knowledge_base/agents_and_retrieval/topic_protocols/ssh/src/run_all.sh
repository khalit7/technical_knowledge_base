#!/bin/sh
# Re-record every lab result on this page (about 12 minutes; needs Docker, OpenSSH 10.x on the laptop, Python 3, curl).
# Usage: sh src/run_all.sh [WORKDIR]   (WORKDIR defaults to a fresh temporary directory)
# The lab runs in WORKDIR: private keys, known_hosts, agent and control sockets never enter the repository and the
# user's ~/.ssh is never read (every ssh call uses -F with the lab's config). Redacted outputs are copied to src/raw/.
# Containers are named proto-ssh-*, started with --rm, --cpus 1, --memory 1g; only they are stopped at the end.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
W=${1:-$(mktemp -d)}
mkdir -p "$W/lab" "$W/tools" "$W/keys" "$W/raw" "$W/cm"
cp "$HERE"/lab/Dockerfile.* "$HERE"/lab/entry.sh "$HERE"/lab/notebook.py "$HERE"/lab/up.sh "$HERE"/lab/down.sh "$W/lab/"
cp "$HERE"/lab/*.py "$W/tools/"; mv "$W/tools/notebook.py" "$W/lab/notebook.py" 2>/dev/null || true
cp "$HERE"/lab/laptop.conf "$HERE"/lab/cert.conf "$W/"
for n in bastion node1 node2; do mkdir -p "$W/cfg_$n"; cp "$HERE/lab/sshd_config.$n" "$W/cfg_$n/sshd_config"; done
export PROTO_SRC=$(cd "$HERE/../.." && pwd)/src
cd "$W/keys"
for k in id_ed25519 user_ca host_ca id_cert_only; do [ -f $k ] || ssh-keygen -q -t ed25519 -N '' -C "lab $k" -f $k; done
for n in bastion node1 node2; do cp user_ca.pub "$W/cfg_$n/"; cp id_ed25519.pub "$W/cfg_$n/authorized_keys.khalid"; done
cd "$W/lab"
docker build -q -t proto-ssh-edge:1 -f Dockerfile.edge . >/dev/null
docker build -q -t proto-ssh-legacy:1 -f Dockerfile.legacy . >/dev/null
sh down.sh; sh up.sh
cd "$W"; rm -f known_hosts
ssh -F laptop.conf bastion true; ssh -F laptop.conf gpu-node-01 true; ssh -F laptop.conf gpu-node-02 true 2>/dev/null
[ -S a.sock ] || { ssh-agent -a a.sock -s > agent.env; }
AGENT_PID=$(sed -n 's/SSH_AGENT_PID=\([0-9]*\).*/\1/p' agent.env)
cd "$W/tools"
for e in exp_kex exp_jump exp_agent exp_mux exp_certs exp_hostkeys exp_fwd exp_misc exp_penalty exp_extra exp_xfer; do
  echo "== $e"
  if [ $e = exp_mux ]; then docker exec proto-ssh-bastion sh -c 'tc qdisc del dev eth0 root 2>/dev/null; tc qdisc add dev eth0 root netem delay 40ms'; fi
  if [ $e = exp_hostkeys ]; then ssh-keygen -R gpu-node-01 -f "$W/known_hosts" >/dev/null 2>&1 || true; fi
  python3 $e.py
  if [ $e = exp_mux ]; then docker exec proto-ssh-bastion tc qdisc del dev eth0 root; fi
  if [ $e = exp_hostkeys ]; then ssh-keygen -R gpu-node-01 -f "$W/known_hosts" >/dev/null 2>&1; ssh -F "$W/laptop.conf" -o StrictHostKeyChecking=accept-new gpu-node-01 true 2>/dev/null || true; fi
done
cd "$W/lab"; sh down.sh; kill "$AGENT_PID" 2>/dev/null || true
mkdir -p "$HERE/raw"; cp "$W"/raw/* "$HERE/raw/"
for k in user_ca host_ca id_ed25519 id_cert_only; do cp "$W/keys/$k.pub" "$HERE/raw/pub_$k.pub"; done
cp "$W"/keys/*-cert.pub "$HERE/raw/" 2>/dev/null || true
python3 "$HERE/make_data.py"
echo "done: raw outputs in src/raw/, data in src/parts/21_js_data.js"
