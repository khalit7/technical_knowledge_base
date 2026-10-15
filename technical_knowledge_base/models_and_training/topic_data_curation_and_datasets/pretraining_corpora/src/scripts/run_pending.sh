#!/bin/sh
# Runs left out of the page on purpose (none needs the GPU). Each is optional; the page says "not run here" where it applies.
# 1. Nemotron-CC v1 pages from the running example's WARC file (Reading section 4). PARTLY RUN on 2026-10-15: 168 of 722
#    files for CC-MAIN-2024-30 (all real-text buckets round-robin, the low bucket complete) in about 2 hours of streaming.
#    The rest (about 554 files, about 8.5 hours at about 55 s per file) resumes where it stopped:
#      DC_SCRATCH=... nice -n 15 python -I nemo_scan.py <seconds> <path to the shared lock.sh>
#    then rebuild: python -I ../make_measured.py && sh ../build.sh
# 2. Every document of every sample scored with the FineWeb-Edu classifier: RUN on 2026-10-15 (score_samples.py 100000, CPU).
echo "nothing runs by default; read the comments"
