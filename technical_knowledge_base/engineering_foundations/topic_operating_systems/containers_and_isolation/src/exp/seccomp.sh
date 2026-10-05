#!/bin/sh
# Run on the Docker host. seccomp_probe.c under three profiles (none, Docker 20.10's built-in default, Docker 25.0's
# default.json passed as a file to this 20.10 daemon), then seccomp_cost.c with and without the default profile.
cd "$(dirname "$0")"
P="docker run --rm --cpus 1 --memory 512m -v $PWD:/exp:ro -v $PWD/../inputs:/inputs:ro"
B='gcc -O2 -o /tmp/p /exp/seccomp_probe.c && grep Seccomp: /proc/self/status | tr "\n" " " && echo && /tmp/p'
echo "### probe: --security-opt seccomp=unconfined"; $P --name os-cont-sc-none --security-opt seccomp=unconfined kb-os-cont:1 sh -c "$B"
echo "### probe: Docker 20.10.17 default profile (no flag)"; $P --name os-cont-sc-d20 kb-os-cont:1 sh -c "$B"
echo "### probe: --security-opt seccomp=inputs/seccomp_moby_v25.0.0_default.json"; $P --name os-cont-sc-d25 --security-opt seccomp=../inputs/seccomp_moby_v25.0.0_default.json kb-os-cont:1 sh -c "$B"
C='gcc -O2 -o /tmp/c /exp/seccomp_cost.c && /tmp/c'
for i in 1 2 3; do
echo "### cost (run $i): --security-opt seccomp=unconfined"; $P --name os-cont-sc-cost0 --security-opt seccomp=unconfined kb-os-cont:1 sh -c "$C"
echo "### cost (run $i): Docker 20.10.17 default profile"; $P --name os-cont-sc-cost1 kb-os-cont:1 sh -c "$C"
done
