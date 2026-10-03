"""Build the toy corpus for the routing experiment: four domains standing in for The Pile subsets
the paper measured (section 5). Writes model/data/<domain>.txt (not committed; rerun this script).

  python3 data.py

Domains (each about 1.2 MB of text):
  github      Python source of the local CPython standard library (stands in for Pile "Github")
  gutenberg   five public-domain novels from Project Gutenberg (stands in for "Gutenberg (PG-19)")
  wikipedia   plain-text extracts of named English Wikipedia articles via the MediaWiki API, taken
              in list order until 1.2 MB (cached in model/data/_wiki_cache.json) ("Wikipedia (en)")
  dm_math     question/answer pairs from our own generator in the style of DeepMind Mathematics
              ("DM Mathematics"); it is synthetic and narrow, like the original, which is the point
Every domain is split by document into train (90%) and held-out test (10%) before tokenising.
"""
import json, os, random, re, sys, sysconfig, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'model', 'data')
os.makedirs(OUT, exist_ok=True)
TARGET = 1_200_000
UA = {'User-Agent': 'kb-toy-corpus/1.0 (research page build)'}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read().decode('utf-8', 'replace')


def github():
    root = sysconfig.get_paths()['stdlib']
    files = sorted(os.path.join(d, f) for d, _, fs in os.walk(root) for f in fs
                   if f.endswith('.py') and 'test' not in d and 'site-packages' not in d and 'idlelib' not in d)
    docs, n = [], 0
    for p in files:
        t = open(p, encoding='utf-8', errors='replace').read()
        if len(t) < 2000: continue
        docs.append(t[:20000]); n += len(docs[-1])
        if n > TARGET: break
    return docs


def gutenberg():
    docs = []
    for bid in (1342, 2701, 1661, 84, 98):
        t = get('https://www.gutenberg.org/cache/epub/%d/pg%d.txt' % (bid, bid))
        a = t.find('*** START'); a = t.find('\n', a) + 1; b = t.find('*** END')
        t = t[a:b].replace('\r\n', '\n')
        # one document per ~8 KB chunk, cut at paragraph breaks
        paras, cur = t.split('\n\n'), ''
        for p in paras:
            cur += p + '\n\n'
            if len(cur) > 8000: docs.append(cur); cur = ''
    random.Random(1).shuffle(docs)
    out, n = [], 0
    for d in docs:
        out.append(d); n += len(d)
        if n > TARGET: break
    return out


TITLES = ['Photosynthesis', 'French Revolution', 'Volcano', 'Jazz', 'Roman Empire', 'Black hole', 'Football',
          'Printing press', 'Amazon rainforest', 'Industrial Revolution', 'DNA', 'Mount Everest', 'Byzantine Empire',
          'Coffee', 'Electricity', 'Ancient Egypt', 'Olympic Games', 'Plate tectonics', 'Renaissance', 'Honey bee',
          'Ottoman Empire', 'Moon', 'Cricket', 'Great Wall of China', 'Vaccine', 'Silk Road', 'Tea', 'Earthquake',
          'Chess', 'Mongol Empire', 'Climate', 'Bicycle', 'Antarctica', 'Opera', 'Railway', 'Shark', 'Venice',
          'Penicillin', 'Tokyo', 'Dinosaur', 'Cathedral', 'Hurricane', 'Wine', 'Steam engine', 'Coral reef',
          'Library of Alexandria', 'Glacier', 'Tennis', 'Telescope', 'Inca Empire', 'Rice', 'Whale', 'Paper',
          'Sahara', 'Violin', 'Aztecs', 'Bread', 'Lightning', 'Lion', 'Nile', 'Castle', 'Comet', 'Cotton',
          'Elephant', 'Desert', 'Fishing', 'Gold', 'Horse', 'Island', 'Mathematics', 'Agriculture', 'Bridge',
          'Cheese', 'Rainbow', 'Salt', 'Telephone', 'Wolf', 'Iceland', 'Beer', 'Sugar']


def wikipedia():
    """Plain-text extracts of a fixed list of English Wikipedia articles (one request per article, polite pace)."""
    import time
    cache = os.path.join(OUT, '_wiki_cache.json')
    docs = json.load(open(cache)) if os.path.exists(cache) else {}
    for t in TITLES:
        if t in docs: continue
        if sum(map(len, docs.values())) > TARGET: break   # enough text; stop asking the API
        q = {'action': 'query', 'format': 'json', 'titles': t, 'prop': 'extracts', 'explaintext': 1, 'redirects': 1}
        for k in range(5):
            try:
                j = json.loads(get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(q))); break
            except Exception as e:
                print('retry', t, e, file=sys.stderr); time.sleep(10 * (k + 1))
        docs[t] = t + '\n\n' + next(iter(j['query']['pages'].values())).get('extract', '')
        json.dump(docs, open(cache, 'w')); time.sleep(1.5)
    out, n = [], 0
    for t in TITLES:
        if t not in docs: break
        d = docs[t]
        for i in range(0, len(d), 8000):           # ~8 KB documents, like the other domains
            out.append(d[i:i + 8000]); n += len(out[-1])
        if n > TARGET: break
    return out


def dm_math():
    """Our own generator in the style of DeepMind Mathematics (question line, answer line)."""
    R = random.Random(7)
    def num(a=-50, b=50): return R.randint(a, b)
    def q_add():
        a, b = num(-999, 999), num(-999, 999); return 'What is %d + %d?' % (a, b), str(a + b)
    def q_sub():
        a, b = num(-999, 999), num(-999, 999); return 'Calculate %d - %d.' % (a, b), str(a - b)
    def q_mul():
        a, b = num(-99, 99), num(-99, 99); return 'Multiply %d and %d.' % (a, b), str(a * b)
    def q_lin():
        x, a, b = num(-20, 20), R.choice([i for i in range(-12, 13) if i]), num(-99, 99)
        v = R.choice('xyzabcdfgkmnpqrstuvw'); return 'Solve %d*%s + %d = %d for %s.' % (a, v, b, a * x + b, v), str(x)
    def q_der():
        a, n, b = R.randint(1, 30), R.randint(2, 6), num(-40, 40); v = R.choice('xyzabcdklmnrstw')
        return 'What is the derivative of %d*%s**%d + %d*%s wrt %s?' % (a, v, n, b, v, v), '%d*%s**%d + %d' % (a * n, v, n - 1, b) if n > 2 else '%d*%s + %d' % (a * n, v, b)
    def q_rem():
        a, b = R.randint(100, 9999), R.randint(2, 97); return 'What is the remainder when %d is divided by %d?' % (a, b), str(a % b)
    def q_cmp():
        a, b = R.randint(-999, 999) / 10, R.randint(-999, 999) / 10; return 'Which is bigger: %s or %s?' % (a, b), str(max(a, b))
    def q_round():
        a = R.randint(-999999, 999999) / 1000; return 'Round %s to the nearest integer.' % a, str(round(a))
    def q_gcd():
        import math
        a, b = R.randint(2, 999), R.randint(2, 999); return 'Calculate the greatest common divisor of %d and %d.' % (a, b), str(math.gcd(a, b))
    def q_let():
        v, w = R.sample('abcdfghjkmnpqrstuvwxyz', 2); a, b, c = num(-9, 9), num(-9, 9), num(-9, 9)
        return 'Let %s = %d + %d. Let %s = %s - %d. What is %s?' % (v, a, b, w, v, c, w), str(a + b - c)
    gens = [q_add, q_sub, q_mul, q_lin, q_der, q_rem, q_cmp, q_round, q_gcd, q_let]
    docs, n = [], 0
    while n < TARGET:
        lines = []
        for _ in range(40):
            q, a = R.choice(gens)()
            lines.append(q + '\n' + a + '\n')
        docs.append(''.join(lines)); n += len(docs[-1])
    return docs


if __name__ == '__main__':
    meta = {}
    for name, fn in (('github', github), ('gutenberg', gutenberg), ('wikipedia', wikipedia), ('dm_math', dm_math)):
        docs = fn()
        R = random.Random(11); R.shuffle(docs)
        k = max(1, len(docs) // 10)
        json.dump({'train': docs[k:], 'test': docs[:k]}, open(os.path.join(OUT, name + '.json'), 'w'))
        meta[name] = {'docs': len(docs), 'chars': sum(map(len, docs)), 'test_docs': k}
        print(name, meta[name])
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
