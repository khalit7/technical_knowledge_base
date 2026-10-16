# mi-slurm: the running example image plus Slurm 24.11.5 (Debian 13 packages), munge and MariaDB.
# One image for every role; the entrypoint picks the role from its first argument (ctl or node).
FROM mi-train:1
ARG SLURM_V=24.11.5-4+deb13u1
RUN apt-get update && apt-get install -y --no-install-recommends \
      slurmctld=$SLURM_V slurmd=$SLURM_V slurmdbd=$SLURM_V slurm-client=$SLURM_V \
      munge mariadb-server procps iproute2 iputils-ping \
 && rm -rf /var/lib/apt/lists/*
# One munge key baked into the image, so every container trusts every other (lab only; real clusters distribute a secret key).
RUN dd if=/dev/urandom of=/etc/munge/munge.key bs=1 count=1024 2>/dev/null \
 && chown munge:munge /etc/munge/munge.key && chmod 400 /etc/munge/munge.key
# Lab users: alice and carol bill to account teama, bob to teamb (same uids on every node).
RUN for u in alice:2001 bob:2002 carol:2003; do useradd -m -u ${u#*:} -s /bin/bash ${u%:*}; done
RUN rm -rf /etc/slurm/plugstack.conf /etc/slurm/plugstack.conf.d
COPY slurm.conf gres.conf cgroup.conf slurmdbd.conf entrypoint.sh /opt/mi-slurm/
RUN chmod +x /opt/mi-slurm/entrypoint.sh
ENTRYPOINT ["/opt/mi-slurm/entrypoint.sh"]
