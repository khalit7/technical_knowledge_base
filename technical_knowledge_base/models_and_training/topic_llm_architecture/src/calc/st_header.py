# Read a remote safetensors header with two HTTP range requests (no weights downloaded); print tensors matching a pattern.
import json, struct, sys, urllib.request
url, pat = sys.argv[1], sys.argv[2]
def rng(a, b):
    r = urllib.request.Request(url, headers={'Range': 'bytes=%d-%d' % (a, b)})
    return urllib.request.urlopen(r, timeout=60).read()
n = struct.unpack('<Q', rng(0, 7))[0]
h = json.loads(rng(8, 8 + n - 1))
for k, v in h.items():
    if pat in k: print(k, v.get('dtype'), v.get('shape'))
