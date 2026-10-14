#!/bin/sh
# Find one page in a Common Crawl crawl and fetch only its record (no account, no key), as shown on the page.
# 1. ask the URL index where the capture lives (file, byte offset, length)
CRAWL=CC-MAIN-2026-39
# the index server is busy at times (502/504, or an empty reply): retry a few times
for i in 1 2 3 4 5; do
  curl -s "https://index.commoncrawl.org/$CRAWL-index?url=www.python.org/&output=json&limit=1" > cdx.json
  grep -q '"offset"' cdx.json && break; sleep 5
done
cat cdx.json
# 2. fetch only those bytes from the 1 GB WARC file and decompress the one gzip member
python3 - <<'PY'
import json, subprocess
c = json.loads(open('cdx.json').readline())
off, ln = int(c['offset']), int(c['length'])
url = 'https://data.commoncrawl.org/' + c['filename']
subprocess.run(['curl', '-s', '-r', f'{off}-{off + ln - 1}', url, '-o', 'record.warc.gz'], check=True)
PY
gunzip -c record.warc.gz > record.warc
wc -c record.warc.gz record.warc
head -c 600 record.warc
