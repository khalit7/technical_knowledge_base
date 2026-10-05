# The same job as the container's main process: when it is killed, the container exits.
. /exp/lib.sh
exec python /exp/hog.py 128 2048
