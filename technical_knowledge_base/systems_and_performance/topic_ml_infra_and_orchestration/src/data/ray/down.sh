#!/bin/sh
# Stop and remove the mi Ray cluster. Add "all" to also delete the shared volume and the network.
docker rm -f mi-ray-w1 mi-ray-w2 mi-ray-head 2>/dev/null
[ "$1" = all ] && { docker volume rm mi-ray-shared; docker network rm mi-ray-net; }
true
