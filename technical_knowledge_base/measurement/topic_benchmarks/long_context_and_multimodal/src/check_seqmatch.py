"""Check the JS SequenceMatcher port (parts/35_js_mrcr.js) against Python difflib on 64 mutated MRCR texts. Needs node."""
import json, random, subprocess, tempfile, os
from difflib import SequenceMatcher
T = json.load(open('inputs/mrcr_row.json'))['texts']; base = list(T.values())
random.seed(1); cases = []
for _ in range(60):
    a = random.choice(base); b = random.choice(base); s = list(a)
    for _ in range(random.randint(0, 40)):
        p = random.randrange(len(s)); op = random.random()
        if op < .4: del s[p]
        elif op < .8: s.insert(p, random.choice('abc xyz\n.'))
        else: s[p] = random.choice('eto ')
    a2 = ''.join(s)[:random.randint(50, len(s))]
    cases.append([a2, b, SequenceMatcher(None, a2, b).ratio()])
for x in ['', 'a', 'abc', 'short text vs another']: cases.append([x, 'short one', SequenceMatcher(None, x, 'short one').ratio()])
f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(cases, f); f.close()
js = "const fs=require('fs');global.window=global;eval(fs.readFileSync('parts/35_js_mrcr.js','utf8').split('(function(){')[0]);" \
     "const cs=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));let mx=0;for(const [a,b,r] of cs){mx=Math.max(mx,Math.abs(window.SeqMatch(a,b).ratio-r))}console.log('cases',cs.length,'max abs diff',mx)"
print(subprocess.run(['node', '-e', js, f.name], capture_output=True, text=True).stdout.strip()); os.unlink(f.name)
