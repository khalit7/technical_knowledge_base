#!/bin/sh
# Regenerate every code output shown in the Reading tab. Toolchain paths in env.sh; versions in versions.txt.
cd "$(dirname "$0")"
for d in howrun types values memory ownership errors numtext abstraction concurrency safety llama; do
  echo "== $d"; if [ -f $d/run.sh ]; then (cd $d && sh run.sh); else (cd $d && sh excerpts.sh); fi
done
. ./env.sh
{ echo "date $(date +%F)"; $PY --version; $PYT -c 'import sys; print("free-threaded", sys.version)'; sh -c "$CXX --version" | head -1; sh -c "$CXXSAN --version" | head -1; rustc --version; echo "tsc $(tsc --version)"; echo "node $(node --version)"; sw_vers -productVersion; sysctl -n machdep.cpu.brand_string; } > versions.txt
