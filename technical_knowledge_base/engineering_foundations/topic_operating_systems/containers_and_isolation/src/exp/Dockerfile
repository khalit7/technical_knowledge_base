# kb-os-cont:1, the containers page's image: the shared lab image plus busybox (a root file system for the
# hand-built container), tini and dumb-init (init processes for the stop experiments) and libcap tools.
FROM kb-os-lab:1
RUN apt-get update && apt-get install -y --no-install-recommends busybox-static tini dumb-init libcap2-bin \
    && rm -rf /var/lib/apt/lists/* \
    && dpkg-query -W busybox-static tini dumb-init libcap2-bin > /lab/cont_versions.txt
