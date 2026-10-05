# kb-os-conc:1, the concurrency page's lab image: the shared kb-os-lab:1 plus liburing (io_uring) headers.
FROM kb-os-lab:1
RUN apt-get update && apt-get install -y --no-install-recommends liburing-dev && rm -rf /var/lib/apt/lists/*
