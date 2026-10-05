#!/bin/bash
# Build the pybind11 and nanobind extensions for $PY into $OUT (no CMake: plain clang++).
# Compile times go to $OUT/pb_time.txt and $OUT/nb_time.txt.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${PY:?set PY to the python that will import the modules}" "${OUT:?set OUT}" "${RO:?set RO to rosetta/code/cpp}"
INC=$($PY -m pybind11 --includes)
SUF=$($PY -c "import sysconfig;print(sysconfig.get_config_var('EXT_SUFFIX'))")
NB=$($PY -c "import nanobind;print(nanobind.source_dir()+'/..')")
FL="-I$HERE -I$RO -O3 -std=c++20 -shared -fPIC -undefined dynamic_lookup -fvisibility=hidden -DNDEBUG"
/usr/bin/time -p clang++ $FL $INC "$HERE/ct_pb.cpp" -o "$OUT/ct_pb$SUF" 2> "$OUT/pb_time.txt"
/usr/bin/time -p clang++ $FL -DNB_COMPACT_ASSERTIONS $INC -I$NB/include -I$NB/ext/robin_map/include "$HERE/ct_nb.cpp" $NB/src/nb_combined.cpp -o "$OUT/ct_nb$SUF" 2> "$OUT/nb_time.txt"
