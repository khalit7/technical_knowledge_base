# Inside kb-os-vm:1: build vmlab.c and run every C measurement once. Section headers start with "### ".
set -e
gcc -O2 -pthread -o /tmp/vmlab /exp/vmlab.c
echo "### env"; uname -r; uname -m; getconf PAGESIZE; nproc; cat /sys/kernel/mm/transparent_hugepage/enabled /sys/kernel/mm/transparent_hugepage/defrag
for c in faults bloat pte fork shoot mlock commit; do echo "### $c"; /tmp/vmlab $c; done
