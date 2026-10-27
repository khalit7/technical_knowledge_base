"""How far is the toy test set from the training stream? Exact pixel duplicates, attribute combinations, captions.
  DATA=$DATA python3 overlap.py   -> model/overlap.json"""
import hashlib, json, os
import numpy as np
D = os.environ['DATA']; HERE = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(D, 'meta.json')))
R, L = M['R'], M['LMAX']
ld = lambda f: np.memmap(os.path.join(D, f), dtype=np.uint8, mode='r').reshape(-1, R)
tr = ld('web.u8'); out = {}
hs = set(hashlib.md5(bytes(tr[i, 5 + L:])).hexdigest() for i in range(len(tr)))
caps = set(bytes(tr[i, 5:5 + L]) for i in range(len(tr)))
combos = set(tuple(tr[i, :5]) for i in range(len(tr)))
for f in ('test_photo.u8', 'test_drawing.u8'):
    te = ld(f)
    out[f] = {'n': len(te), 'pixel_duplicates': sum(hashlib.md5(bytes(te[i, 5 + L:])).hexdigest() in hs for i in range(len(te))),
              'caption_in_train': round(sum(bytes(te[i, 5:5 + L]) in caps for i in range(len(te))) / len(te), 4),
              'attribute_combo_in_train': round(sum(tuple(te[i, :5]) in combos for i in range(len(te))) / len(te), 4)}
out['train'] = {'n': len(tr), 'distinct_captions': len(caps), 'attribute_combos': len(combos), 'drawings': int((tr[:, 4] == 1).sum())}
json.dump(out, open(os.path.join(HERE, 'model', 'overlap.json'), 'w'), indent=1); print(json.dumps(out, indent=1))
