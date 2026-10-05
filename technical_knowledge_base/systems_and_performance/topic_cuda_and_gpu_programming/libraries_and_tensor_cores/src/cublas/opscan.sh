#!/bin/sh
# per architecture: for every kernel in libcublasLt, which matrix opcodes its SASS contains
cd /o
for a in sm_80 sm_89 sm_90a sm_100 sm_120; do
  cuobjdump -sass -arch $a /usr/local/cuda/lib64/libcublasLt.so.13.8.0.4 2>/dev/null | awk -v A=$a '
    /Function : /{ if(f!="") print A"\t"f"\t"ops; f=$3; ops=""; next }
    { if (match($0,/(HMMA|HGMMA|IMMA|IGMMA|QMMA|QGMMA|OMMA|UTC[A-Z]*MMA|DMMA|UTMALDG|LDGSTS|LDSM|UTCBAR|USETMAXREG)[.A-Z0-9_]*/)) { o=substr($0,RSTART,RLENGTH); sub(/\..*/,"",o); if (index(" "ops" ", " "o" ")==0) ops=ops" "o } }
    END { if(f!="") print A"\t"f"\t"ops }' > ops_$a.tsv
  echo "$a $(wc -l < ops_$a.tsv)"
done
