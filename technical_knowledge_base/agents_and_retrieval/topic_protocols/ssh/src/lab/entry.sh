#!/bin/sh
# One cluster machine: fresh host keys on every start (like a rebuilt cloud node),
# users khalid and alice, and sshd with settings from /cfg (mounted read-only).
set -e
for u in khalid alice; do id $u >/dev/null 2>&1 || adduser -D -s /bin/bash $u; passwd -u $u >/dev/null 2>&1 || true; done
# alpine locks accounts with no password; give them an unusable but unlocked one
sed -i 's/^khalid:!/khalid:*/; s/^alice:!/alice:*/' /etc/shadow
ssh-keygen -A >/dev/null
for u in khalid alice; do mkdir -p /home/$u/.ssh; [ -f /cfg/authorized_keys.$u ] && cp /cfg/authorized_keys.$u /home/$u/.ssh/authorized_keys; chown -R $u:$u /home/$u/.ssh; chmod 700 /home/$u/.ssh; chmod 600 /home/$u/.ssh/authorized_keys 2>/dev/null || true; done
cp /cfg/user_ca.pub /etc/ssh/user_ca.pub 2>/dev/null || true
[ -f /cfg/revoked.krl ] && cp /cfg/revoked.krl /etc/ssh/revoked.krl || true
cp /cfg/sshd_config /etc/ssh/sshd_config
[ -n "$NETEM" ] && tc qdisc add dev eth0 root netem delay $NETEM || true
if [ "$NOTEBOOK" = 1 ]; then
  su khalid -c 'python3 /lab/notebook.py 127.0.0.1 8888 >/tmp/nb.log 2>&1 &'
  su khalid -c 'python3 /lab/notebook.py 0.0.0.0 8889 >/tmp/nb2.log 2>&1 &'
  su khalid -c 'python3 /lab/notebook.py unix 0 /home/khalid/.nb/nb.sock >/tmp/nb3.log 2>&1 &'
fi
touch /var/log/sshd.log
exec /usr/sbin/sshd -D -E /var/log/sshd.log
