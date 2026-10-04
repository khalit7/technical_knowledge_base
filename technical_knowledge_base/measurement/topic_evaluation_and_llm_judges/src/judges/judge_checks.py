"""Resolve a reading's `chk` pointer to the value printed in inputs/ (used by mk_judges.py and recompute.py)."""
import os, re, json, csv
H = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(H, 'inputs')
ROCKET = os.path.join(H, '..', '..', '..', '..', 'reference', 'papers', 'rocketeval', 'src', 'tables.json')
_cache = {}

def tsv(f):
    if f not in _cache:
        _cache[f] = [l.rstrip('\n').split('\t') for l in open(os.path.join(I, f + '.tsv')) if not l.startswith('#')]
    return _cache[f]

def num(s):
    m = re.search(r'-?\d+(?:,\d{3})*(?:\.\d+)?', s)
    if not m: raise ValueError('no number in %r' % s)
    return float(m.group(0).replace(',', ''))

def resolve(chk):
    """Return (value, verbatim cell or quote) for a pointer."""
    t = chk[0]
    if t == 'tsv':
        f, lab, col = chk[1], chk[2], chk[3]
        for r in tsv(f):
            if isinstance(lab, list):
                if r and r[0].strip() == lab[0] and len(r) > 1 and r[1].strip() == lab[1]: return num(r[col]), r[col]
            elif r and r[0].strip() == lab: return num(r[col]), r[col]
        raise KeyError('row %r not in %s' % (lab, f))
    if t == 'csv':
        for r in csv.DictReader(open(os.path.join(I, chk[1]))):
            if r['Model'] == chk[2]: return float(r[chk[3]]), r[chk[3]]
        raise KeyError(chk)
    if t == 'q':
        q = json.load(open(os.path.join(I, 'quotes.json')))[chk[1]]['text']
        if chk[2] not in q: raise KeyError('%r not in quote %s' % (chk[2], chk[1]))
        v = num(chk[2]); return (v * 100 if v < 1 and '.' in chk[2] and chk[1] == 'pandalm_t2' else v), q
    if t == 'qnum':  # label followed by seven numbers in the EvalBiasBench table text; the 7th is the total
        q = json.load(open(os.path.join(I, 'quotes.json')))[chk[1]]['text']
        m = re.search(re.escape(chk[2]) + r'((?: \d+\.\d)+)', q)
        nums = m.group(1).split()
        if len(nums) != 7: raise ValueError(chk)
        return float(nums[6]), chk[2] + m.group(1)
    if t in ('rocket_t2', 'rocket_t3'):
        tb = json.load(open(ROCKET))['t2' if t == 'rocket_t2' else 't3']
        if t == 'rocket_t2' and chk[2] is None: return num(tb['base'][chk[1]]), tb['base'][chk[1]]
        row = next(r for r in tb['rows'] if r[0] == chk[1])
        if chk[2] is None:  # value must appear in the row
            return None, ' | '.join(row)
        return num(row[1 + chk[2]]), row[1 + chk[2]]
    if t == 'ljb':
        m = None
        for r in tsv('longjudgebench_T3')[2:]:
            if len(r) == 11: m = r[0]; r = r[1:]
            if len(r) == 10 and m == chk[1] and r[0] == chk[2]: return num(r[8]), r[8]
        raise KeyError(chk)
    raise ValueError(chk)
