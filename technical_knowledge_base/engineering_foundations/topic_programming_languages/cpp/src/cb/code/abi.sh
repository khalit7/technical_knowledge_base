#!/bin/bash
# Compile abi.cpp, list its exported symbols, then demangle them.
. "$(dirname "$0")/env.sh"
$CXX -O2 -c abi.cpp -o "$B/abi.o"
echo "$ nm abi.o   (symbols defined in the text section)"
nm "$B/abi.o" | grep ' T '
echo "$ nm abi.o | c++filt   (demangled)"
nm "$B/abi.o" | grep ' T ' | awk '{print $3}' | /Library/Developer/CommandLineTools/usr/bin/c++filt
