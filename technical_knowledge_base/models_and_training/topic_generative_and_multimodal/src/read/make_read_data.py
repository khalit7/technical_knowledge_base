"""Write src/read/read_data.json: the small data the Reading tab embeds.

Usage: python3 make_read_data.py <folder with Fashion-MNIST t10k-images-idx3-ubyte.gz and t10k-labels-idx1-ubyte.gz>

- img: Fashion-MNIST test image 1 (label 2, "Pullover"), 28 x 28 uint8, base64. Fashion-MNIST is MIT-licensed
  (Copyright 2017 Zalando SE, https://github.com/zalandoresearch/fashion-mnist).
- lab: numbers copied from the lab tabs' recorded outputs (null until a lab has run; the page shows a TODO then).
The page's JavaScript (parts/22_js_rd_data.js) is regenerated from this JSON by write_js() below.
"""
import base64, gzip, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, '..', 'parts')
IDX = 1


def main(raw):
    img = gzip.open(os.path.join(raw, 't10k-images-idx3-ubyte.gz')).read()[16:][IDX * 784:(IDX + 1) * 784]
    lab = gzip.open(os.path.join(raw, 't10k-labels-idx1-ubyte.gz')).read()[8:][IDX]
    assert len(img) == 784 and lab == 2
    p = os.path.join(HERE, 'read_data.json')
    old = json.load(open(p)) if os.path.exists(p) else {}
    d = {'img': base64.b64encode(img).decode(), 'img_index': IDX, 'img_label': 'Pullover', 'lab': old.get('lab', {})}
    json.dump(d, open(p, 'w'), indent=1)
    write_js(d)


def write_js(d):
    js = ('// ---- Reading tab data: written by src/read/make_read_data.py from src/read/read_data.json; do not edit by hand ----\n'
          'window.RDG=' + json.dumps(d, separators=(',', ':')) + ';\n')
    open(os.path.join(PARTS, '22_js_rd_data.js'), 'w').write(js)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] != '--js':
        main(sys.argv[1])
    else:
        write_js(json.load(open(os.path.join(HERE, 'read_data.json'))))
