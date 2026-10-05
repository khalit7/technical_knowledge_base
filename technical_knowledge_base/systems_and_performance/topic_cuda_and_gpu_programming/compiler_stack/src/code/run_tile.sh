#!/bin/sh
# INSIDE kb-gpu-lab:1, /work = src/. Installs cuTile Python (network needed) and compiles one kernel for four targets.
set -u
pip install -q cuda-tile==1.6.0 > /dev/null 2>&1
cd /work/code && python tile_export.py
O=/work/out/tile; tileirdisasm $O/vector_add.tilebc > $O/vector_add.tileir.txt 2>&1 || tileirdisasm --help > $O/tileirdisasm_help.txt 2>&1
tileiras --version > $O/tileiras_version.txt 2>&1
