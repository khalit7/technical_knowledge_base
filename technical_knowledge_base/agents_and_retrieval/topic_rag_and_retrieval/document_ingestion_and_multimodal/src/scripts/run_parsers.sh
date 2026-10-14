#!/bin/sh
# Parse the QASPER PDFs (latest versions), the two single-page view PDFs and the olmOCR-bench sample with each
# model-based parser, CPU only, one parser at a time, at low priority (wall times are indicative: no bench lock,
# shared machine, load average recorded). Docling ran first on its own (parse_models.py docling).
# usage: sh run_parsers.sh <ING_DIR> <this src/scripts dir> [group ...]   groups: unst tess marker mineru
I=$1; SD=$2; shift 2; G=${*:-unst tess marker mineru}
export HF_HOME=$I/hf OMP_NUM_THREADS=4 OMP_THREAD_LIMIT=4 TORCH_DEVICE=cpu
cd $I
for g in $G; do
 for pair in "qasper_pdf/latest out_qasper" "view_pdf view_out" "olmocr/pdfs out_olm"; do
  set -- $pair; IN=$1; OUT=$2
  case $g in
  unst) unenv/bin/python -I $SD/parse_models.py unst_fast $IN $OUT; unenv/bin/python -I $SD/parse_models.py unst_hires $IN $OUT;;
  tess) venv/bin/python -I $SD/parse_models.py tesseract $IN $OUT;;
  marker) venv/bin/python -I $SD/run_marker.py $I $IN $OUT;;
  mineru) venv/bin/python -I $SD/run_mineru.py $I $IN $OUT basic; venv/bin/python -I $SD/run_mineru.py $I $IN $OUT flash;;
  esac
  echo "$g $IN done $(date '+%H:%M:%S') load $(sysctl -n vm.loadavg)"
 done
done
echo ALLPARSED
