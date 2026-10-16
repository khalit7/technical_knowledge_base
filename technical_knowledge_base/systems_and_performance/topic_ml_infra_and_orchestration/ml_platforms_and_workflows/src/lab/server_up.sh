# Start a local MLflow tracking server: sqlite metadata + a local artifact folder, proxied (clients see mlflow-artifacts:/ URIs).
# Usage: MP_SCRATCH=... sh server_up.sh   (writes $MP_SCRATCH/srv/server.pid)
: "${MP_SCRATCH:?set MP_SCRATCH}"
mkdir -p "$MP_SCRATCH/srv" && cd "$MP_SCRATCH/srv" || exit 1
MLFLOW_DISABLE_AGENT_HINT=1 nice -n 15 "$MP_SCRATCH/venv/bin/mlflow" server \
  --backend-store-uri sqlite:///mlflow.db --artifacts-destination ./artifacts \
  --host 127.0.0.1 --port 5077 --workers 1 > server.log 2>&1 &
echo $! > server.pid
for i in $(seq 1 60); do curl -sf http://127.0.0.1:5077/health >/dev/null && { echo "mlflow server up (pid $(cat server.pid)) after ${i}x0.5 s"; exit 0; }; sleep 0.5; done
echo "server did not come up"; tail -20 server.log; exit 1
