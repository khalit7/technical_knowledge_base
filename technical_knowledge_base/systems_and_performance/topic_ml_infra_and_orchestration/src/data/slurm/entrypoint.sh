#!/bin/bash
# Role "ctl": MariaDB + slurmdbd + slurmctld (+ accounts on first start). Role "node": slurmd (configless).
set -e
mkdir -p /run/munge /var/log/slurm /var/spool/slurmctld /var/spool/slurmd /run/slurm
chown munge:munge /run/munge; chown slurm:slurm /var/log/slurm /var/spool/slurmctld
[ -d /shared ] && chmod 1777 /shared
runuser -u munge -- /usr/sbin/munged
role=${1:-node}
if [ "$role" = ctl ]; then
  [ -f /etc/slurm/slurm.conf ] || cp /opt/mi-slurm/slurm.conf /opt/mi-slurm/gres.conf /opt/mi-slurm/cgroup.conf /etc/slurm/
  install -o slurm -g slurm -m 600 /opt/mi-slurm/slurmdbd.conf /etc/slurm/slurmdbd.conf
  mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld
  [ -d /var/lib/mysql/mysql ] || mariadb-install-db --user=mysql >/dev/null
  mariadbd --user=mysql --bind-address=127.0.0.1 --innodb-buffer-pool-size=16M --performance-schema=OFF \
           --key-buffer-size=1M --max-connections=20 >/var/log/slurm/mariadb.log 2>&1 &
  for i in $(seq 60); do mariadb -e 'select 1' >/dev/null 2>&1 && break; sleep 1; done
  mariadb -e "CREATE DATABASE IF NOT EXISTS slurm_acct_db; CREATE USER IF NOT EXISTS 'slurm'@'localhost' IDENTIFIED BY 'lab-only-password'; GRANT ALL ON slurm_acct_db.* TO 'slurm'@'localhost';"
  /usr/sbin/slurmdbd
  for i in $(seq 60); do sacctmgr -n show cluster >/dev/null 2>&1 && break; sleep 1; done
  sacctmgr -i add cluster mi >/dev/null 2>&1 || true
  /usr/sbin/slurmctld
  sacctmgr -i add account teama,teamb Description=lab Organization=lab Fairshare=1 >/dev/null 2>&1 || true
  sacctmgr -i add user alice,carol Account=teama >/dev/null 2>&1 || true
  sacctmgr -i add user bob Account=teamb >/dev/null 2>&1 || true
  echo "ctl ready"
  exec sleep infinity
else
  for i in $(seq 60); do getent hosts ctl >/dev/null && break; sleep 1; done
  for g in 0 1 2 3; do touch /dev/mi_gpu$g; done   # fake GPU placeholders (see gres.conf)
  echo "node $(hostname) starting slurmd"
  exec /usr/sbin/slurmd -D --conf-server ctl
fi
