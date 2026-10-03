"""Fetch a seeded random sample of LFM2-Terminal-SFT-Processed (CC-BY-4.0, the paper's largest source, Table 12)
from the Hugging Face datasets-server API. 16 pages of 40 consecutive rows at random offsets = 640 trajectories.
usage: python3 fetch_sample.py <outdir>   (raw pages are about 40 MB, kept out of the repo)"""
import json, os, random, sys, time, urllib.request
N, PAGES, LEN = 139841, 16, 40
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
rng = random.Random(20261003)
offs = sorted(rng.randrange(0, N - LEN) for _ in range(PAGES))
json.dump(offs, open(os.path.join(out, 'offsets.json'), 'w'))
for o in offs:
    f = os.path.join(out, 'p%06d.json' % o)
    if os.path.exists(f): continue
    u = 'https://datasets-server.huggingface.co/rows?dataset=gyung/LFM2-Terminal-SFT-Processed&config=default&split=train&offset=%d&length=%d' % (o, LEN)
    for k in range(4):
        try:
            d = urllib.request.urlopen(u, timeout=120).read(); json.loads(d); open(f, 'wb').write(d); break
        except Exception as e:
            print('retry', o, e, flush=True); time.sleep(5)
    print('ok', o, flush=True)
print('done')
