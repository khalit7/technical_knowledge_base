"""reading_time.py: measure the Reading tab at 220 words a minute (closed <details> counted apart) and write the two
numbers into the built page's #fo-rt and #fo-rtd spans. Run by build.sh after assembly."""
import re, sys
p = sys.argv[1]; s = open(p, encoding="utf8").read()
i = s.find('id="t-read"'); j = s.find('<div class="tab" id="t-mask"', i)
r = re.sub(r"<script.*?</script>|<style.*?</style>", "", s[i:j], flags=re.S)
det = re.findall(r"<details.*?</details>", r, flags=re.S)
words = lambda x: len(re.sub(r"<[^>]+>", " ", x).split())
wd = sum(words(d) for d in det); wm = words(r) - wd
m, md = max(1, round(wm / 220)), max(1, round(wd / 220))
s = re.sub(r'<span id="fo-rt">\d+</span>', f'<span id="fo-rt">{m}</span>', s)
s = re.sub(r'<span id="fo-rtd">\d+</span>', f'<span id="fo-rtd">{md}</span>', s)
open(p, "w", encoding="utf8").write(s)
print(f"reading time {m} min ({wm} words) + {md} min in details ({wd} words)")
