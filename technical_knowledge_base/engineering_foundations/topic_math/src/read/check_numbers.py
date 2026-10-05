"""Compare every decimal number in the Reading tab (static text plus the animation texts captured by test_read.mjs)
with numbers.json (recompute.py). Prints the numbers not found there, for review by hand."""
import json, re, sys, html
R = json.load(open('numbers.json'))
known = set()
def walk(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        for d in range(0, 5): known.add(f"{abs(v):.{d}f}")
    elif isinstance(v, list): [walk(u) for u in v]
for v in R.values(): walk(v)
page = open('../../index.html').read()
i = page.find('id="t-read"'); j = page.find('<div class="tab" id="t-notation"')
t = page[i:j]
t = re.sub(r'<annotation.*?</annotation>', ' ', t, flags=re.S)
t = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', t, flags=re.S)
t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
extra = open(sys.argv[1]).read() if len(sys.argv) > 1 else ''
nums = re.findall(r'(?<![\w.])\d+\.\d+', t + ' ' + extra)
miss = sorted(set(n for n in nums if n not in known), key=float)
print(len(set(nums)), 'distinct decimals;', len(miss), 'not in numbers.json:')
print(' '.join(miss))
