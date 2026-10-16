#!/bin/sh
# Launch lab, Ray: run la_ray_train.py as the driver inside the head container, save its output and probe files.
# usage: la_ray.sh RUN "DRIVER_ARGS" [train.py args...]    (LA_EVID: host folder for evidence)
set -u
RUN=$1 DARGS=$2; shift 2
E="$LA_EVID/$RUN"; mkdir -p "$E"
docker exec mi-ray-head python /shared/la/la_ray_train.py --out "/shared/la/runs/$RUN" --name "$RUN" $DARGS -- \
  --ckpt-dir "/shared/la/ckpt/$RUN" --log-dir "/shared/la/runs/$RUN" "$@" > "$E/driver.out" 2>&1
echo "exit $?" >> "$E/driver.out"
docker exec mi-ray-head sh -c "cd /shared/la/runs/$RUN && tar cf - ." | tar xf - -C "$E"
echo "$RUN: $(grep -o '"error": [^,]*' "$E/driver.json" | head -1)"
