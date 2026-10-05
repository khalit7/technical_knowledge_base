# kb-gpu-lab:1 plus Python headers, so that Inductor's CPU back end can build its C++ kernels (it includes Python.h).
FROM kb-gpu-lab:1
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3-dev && rm -rf /var/lib/apt/lists/*
