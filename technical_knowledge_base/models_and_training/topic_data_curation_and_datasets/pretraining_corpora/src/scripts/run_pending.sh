#!/bin/sh
# Runs left out of the page on purpose (none needs the GPU). Each is optional; the page says "not run here" where it applies.
# 1. Nemotron-CC v1 pages from the running example's WARC file (Reading section 4): read every CC-MAIN-2024-30 file of
#    Nemotron-CC (722 files, about 260 GB streamed from data.commoncrawl.org) and keep records whose warc_record_id is in
#    the WARC file. Network-bound: about 6 to 10 hours at 10 MB/s; disk: nothing kept but the matches.
#    Command (after this file's directory is the working directory and DC_SCRATCH is set):
#      gunzip -c "$DC_SCRATCH/data/nemotron_cc/data-jsonl.paths.gz" | grep CC-MAIN-2024-30 > nemo_2024_30.txt
#      while read p; do curl -s "https://data.commoncrawl.org/$p" | zstd -dc | grep -F -f warc_ids.txt; done < nemo_2024_30.txt > nemo_matches.jsonl
#    (warc_ids.txt: the 20,617 WARC-Record-IDs written by what_each_kept.py; then rerun what_each_kept.py nemo_matches.jsonl)
# 2. Score every document of every sample with the FineWeb-Edu classifier (the page scores up to 300 per sample on CPU):
#      rm -r "$DC_SCRATCH/data/pc/scores"; python -I score_samples.py 100000     # about 75 minutes on 4 CPU threads (about 7 documents per second measured here), a few minutes on a GPU
echo "nothing runs by default; read the comments"
