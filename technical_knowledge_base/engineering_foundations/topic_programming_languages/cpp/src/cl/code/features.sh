#!/bin/bash
# Compile and run features.cpp; compile features_bad.cpp to show the static_assert error.
H="$(cd "$(dirname "$0")" && pwd)"; . $H/env.sh; mkdir -p $CL/feat
CXX="$CLT/usr/bin/clang++ -std=c++20 -O2 -Wall -isysroot $CLT/SDKs/MacOSX.sdk"
cd $H
echo '$ clang++ -std=c++20 -O2 -Wall features.cpp -o features && ./features'
$CXX features.cpp -o $CL/feat/features && $CL/feat/features
echo
echo '$ clang++ -std=c++20 features_bad.cpp'
$CXX features_bad.cpp -o $CL/feat/features_bad 2>&1
