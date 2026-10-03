"""Fill the header's reading time: words in the Reading tab at 230 words a minute, plus the sum of the
resource times listed in Further reading (each written as (N min) or (N h) / (Nh Mm) in a .rt span)."""
import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r'<div class="tab" id="t-read".*?(?=<div class="tab" id="t-tree")', h, re.S)
txt = re.sub(r"<script.*?</script>|<style.*?</style>", " ", m.group(0), flags=re.S)
txt = re.sub(r"<[^>]+>", " ", txt)
words = len(re.findall(r"[A-Za-z0-9][\w'.,%$-]*", txt))
read = max(1, round(words / 230))
mm = re.search(r'<div class="tab" id="t-more".*', h, re.S).group(0)
tot = 0
for t in re.findall(r'class="rt">\(([^)]*)\)', mm):
    hh = re.search(r"(\d+)\s*h", t); mi = re.search(r"(\d+)\s*min", t)
    tot += (int(hh.group(1)) * 60 if hh else 0) + (int(mi.group(1)) if mi else 0)
res = "%dh %02dm" % (tot // 60, tot % 60) if tot >= 60 else "%d min" % tot
sys.stderr.write("reading words %d -> %d min; resources %s\n" % (words, read, res))
sys.stdout.write(h.replace("RT_READ", str(read)).replace("RT_RES", res))
