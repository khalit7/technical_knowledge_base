# Source this: sets the lab's environment. MP_SCRATCH must point at a scratch folder (not committed).
# Usage: MP_SCRATCH=<scratch>/mi/mp . ./env.sh
: "${MP_SCRATCH:?set MP_SCRATCH}"
export PATH="$MP_SCRATCH/venv/bin:$PATH"
export MP_DATA="$MP_SCRATCH/../data/input.txt"        # TinyShakespeare, sha256 86c4e6aa...565ed
export MP_WORK="$MP_SCRATCH/work"
export MLFLOW_TRACKING_URI="http://127.0.0.1:5077"
export MLFLOW_DISABLE_AGENT_HINT=1
export METAFLOW_DEFAULT_DATASTORE=local METAFLOW_DEFAULT_METADATA=local
export METAFLOW_DATASTORE_SYSROOT_LOCAL="$MP_SCRATCH/mf"
export METAFLOW_USER=mp-lab USER=mp-lab LOGNAME=mp-lab   # keep the login name out of run metadata
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
