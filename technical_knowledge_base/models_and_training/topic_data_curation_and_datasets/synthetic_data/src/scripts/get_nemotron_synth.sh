#!/bin/sh
# Stream the first N rows of Nemotron-CC files for crawl CC-MAIN-2024-30 (the running example's crawl),
# so synthetic rows can be matched to the real documents they were made from (same warc_record_id).
# Usage: DC_SCRATCH=<scratch>/dc sh get_nemotron_synth.sh [N]
# Output: $DC_SCRATCH/data/syn/nemo/<quality>__<kind2>__part<P>.jsonl (first N lines, uncompressed)
# Files are pinned by name; Common Crawl contrib has no revision ids.
set -e
N=${1:-3000}
OUT="$DC_SCRATCH/data/syn/nemo"; mkdir -p "$OUT"
BASE=https://data.commoncrawl.org/contrib/Nemotron/Nemotron-CC/data-jsonl
for spec in \
  "low synthetic wrap_medium 00000" "low actual actual 00000" \
  "high synthetic wrap_medium 00000" "high synthetic distill 00000" \
  "high synthetic extract_knowledge 00000" "high synthetic knowledge_list 00000" \
  "high synthetic diverse_qa_pairs 00000" "high actual actual 00000"; do
  set -- $spec
  f="$OUT/$1__$3__part$4.jsonl"
  [ -s "$f" ] && { echo "have $f"; continue; }
  url="$BASE/quality=$1/kind=$2/kind2=$3/CC-MAIN-2024-30-part-$4.jsonl.zstd"
  # head closes the pipe early; curl then exits with an error that is expected
  (curl -sS --max-time 600 "$url" | zstd -dc 2>/dev/null | head -n "$N" > "$f") || true
  echo "$url -> $(wc -l < "$f") rows, $(wc -c < "$f") bytes, sha256 $(shasum -a 256 "$f" | cut -c1-64)"
done
