# The lab's runs after the first one (see README): three more learning-rate runs and a longer run.
# Usage: MP_SCRATCH=... sh run_sweep.sh   (MLflow server must be up: server_up.sh)
: "${MP_SCRATCH:?}"; cd "$(dirname "$0")" && . ./env.sh
mkdir -p "$MP_SCRATCH/logs"
run() { name=$1; shift; echo "== $name: $*"; /usr/bin/time -p nice -n 15 python flow.py run "$@" > "$MP_SCRATCH/logs/$name.log" 2>&1; tail -1 "$MP_SCRATCH/logs/$name.log"; grep '"promoted"' "$MP_SCRATCH/logs/$name.log" | sed 's/.*\] //'; }
run r2 --lr 0.003
run r3 --lr 0.01
run r4 --lr 0.03
