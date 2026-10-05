#!/bin/sh
# User namespaces, the basis of rootless containers. Inside
#   docker run --rm --user 1000:1000 --security-opt seccomp=unconfined kb-os-cont:1 sh /exp/userns.sh
# (Docker's default seccomp profile blocks unshare(CLONE_NEWUSER) for a process without CAP_SYS_ADMIN.)
echo "### outside: an ordinary user"; id; grep CapEff /proc/self/status
echo "### unshare --user --map-root-user: root inside"
mkdir -p /tmp/u
unshare --user --map-root-user sh -c '
  id; echo "uid_map: $(cat /proc/self/uid_map)"; grep CapEff /proc/self/status
  touch /tmp/u/made-by-namespace-root; ls -ln /tmp/u
  echo "\$ cat /etc/shadow"; cat /etc/shadow 2>&1 | head -1
  echo "\$ hostname x (the UTS namespace belongs to the host user namespace)"; hostname x 2>&1
  echo "\$ unshare --uts --mount: new namespaces owned by this user namespace"
  unshare --uts --mount sh -c "hostname inner && hostname; mount -t tmpfs none /mnt && echo mounted tmpfs; grep \" /mnt \" /proc/self/mounts"
  echo "\$ unshare --time --boottime 86400 --monotonic 86400 --fork (a time namespace, uptime shifted one day)"
  echo "uptime before: $(awk "{print \$1}" /proc/uptime)"; unshare --time --boottime 86400 --monotonic 86400 --fork awk "{print \"uptime inside: \" \$1}" /proc/uptime
'
echo "### back outside: the file is owned by the real UID"; ls -ln /tmp/u
