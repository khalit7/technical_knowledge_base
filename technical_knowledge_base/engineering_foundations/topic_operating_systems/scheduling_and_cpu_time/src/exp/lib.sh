# Shared helpers, sourced inside the containers (same conventions as the root's Debug lab).
# sec "label"  starts a named section of the recording; run "cmd" prints "$ cmd" and then its output.
sec() { echo; echo "### $*"; }
run() { echo "\$ $*"; bash -c "$*" 2>&1; }
build() { gcc -O2 -pthread -o /tmp/schedlab /exp/schedlab.c; }
load() { echo "vm_load $(cut -d' ' -f1-4 /proc/loadavg)"; }
