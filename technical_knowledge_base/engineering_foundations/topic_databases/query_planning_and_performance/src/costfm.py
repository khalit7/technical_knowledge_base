"""PostgreSQL 16 cost formulas for one range predicate `col BETWEEN a AND b` on a single table, transcribed from
src/backend/optimizer/path/costsize.c (cost_seqscan, cost_index, index_pages_fetched, cost_bitmap_heap_scan,
compute_bitmap_pages) and src/backend/utils/adt/selfuncs.c (ineq_histogram_selectivity, genericcostestimate,
btcostestimate). Mirrors the page's JavaScript (parts/31_js_cm_model.js); recompute.py checks both against EXPLAIN."""
import math
def hist_frac(hist, v):
    # position of v in the equi-depth histogram, linear inside its bin (ineq_histogram_selectivity, interior bins only)
    nv = len(hist); lo, hi = 0, nv
    while lo < hi:
        p = (lo + hi) // 2
        if hist[p] < v: lo = p + 1
        else: hi = p
    i = lo
    low, high = hist[i - 1], hist[i]
    binfrac = 0.5 if high <= low else min(1.0, max(0.0, (v - low) / (high - low)))
    return i, ((i - 1) + binfrac) / (nv - 1)
def selectivity(d, a, b):
    nd = -d['n_distinct'] * d['reltuples'] if d['n_distinct'] < 0 else d['n_distinct']
    eq = 1.0 / nd
    _, fa = hist_frac(d['hist'], a); fa -= eq            # col >= a: isgt == iseq, so subtract one value's share
    lo = 1 - fa
    _, fb = hist_frac(d['hist'], b)                      # col <= b
    s = fb + lo - 1.0
    return max(s, 1e-10) * (1 - d['null_frac'])
def clamp_rows(r):
    return 1.0 if r <= 1.0 else float(round(r))
def ml_pages(T, N, b):
    # index_pages_fetched: Mackert and Lohman
    if T <= b:
        p = 2 * T * N / (2 * T + N)
        return T if p >= T else math.ceil(p)
    lim = 2 * T * b / (2 * T - b)
    p = 2 * T * N / (2 * T + N) if N <= lim else b + (N - lim) * (T - b) / T
    return math.ceil(p)
def costs(d, s, c, corr=None):
    """d: preset (pg_class, index and stats values); s: selectivity; c: cost settings. Returns dict of three paths."""
    corr = d['correlation'] if corr is None else corr
    T = max(d['relpages'], 1); tup = d['reltuples']
    sp, rp, ct, cit, co = c['seq_page_cost'], c['random_page_cost'], c['cpu_tuple_cost'], c['cpu_index_tuple_cost'], c['cpu_operator_cost']
    rows = clamp_rows(s * tup)
    seq = {'startup': 0.0, 'total': sp * d['relpages'] + (ct + 2 * co) * tup}
    # index side (genericcostestimate + btcostestimate), two index quals
    nit = max(1.0, min(round(s * tup), d['idxtuples']))
    nip = math.ceil(nit * d['idxpages'] / d['idxtuples'])
    idx_total = nip * rp + nit * (cit + 2 * co)
    descent = math.ceil(math.log(d['idxtuples']) / math.log(2)) * co + (d['fastlevel'] + 1) * 50 * co
    idx_startup = descent; idx_total += descent
    # cost_index: heap pages, interpolated by correlation squared
    tf = rows
    b = c['effective_cache_size'] * T / (T + d['idxpages'])
    b = 1.0 if b <= 1 else math.ceil(b)
    pf = ml_pages(T, tf, b)
    max_io = pf * rp
    pmin = math.ceil(s * T)
    min_io = (rp + (pmin - 1) * sp) if pmin > 1 else (rp if pmin > 0 else 0)
    io = max_io + corr * corr * (min_io - max_io)
    index = {'startup': idx_startup, 'total': idx_total + io + ct * tf, 'heap_pages': pf, 'heap_pages_corr': pmin, 'io': io}
    # bitmap: index cost plus 0.1 cpu_operator_cost per row, heap pages by plain Mackert and Lohman, cost per page between random and seq
    bix = idx_total + 0.1 * co * rows
    p0 = 2 * T * tf / (2 * T + tf)
    p = T if p0 >= T else math.ceil(p0)
    # work_mem caps the bitmap: about work_mem / 64 bytes page entries (tbm_calculate_entries); past that, pages go lossy
    # and every row on a lossy page is rechecked
    maxentries = c['work_mem'] * 1024 // 64
    heap_pages = min(p0, d['relpages']); tfb = tf; lossy = 0
    if maxentries < heap_pages:
        lossy = max(0, heap_pages - maxentries / 2); exact = heap_pages - lossy
        if lossy > 0: tfb = clamp_rows(s * (exact / heap_pages) * tup + (lossy / heap_pages) * tup)
    cpp = rp - (rp - sp) * math.sqrt(p / T) if p >= 2 else rp
    bitmap = {'startup': bix, 'total': bix + p * cpp + (ct + 2 * co) * tfb, 'heap_pages': p, 'cost_per_page': cpp, 'inner_total': idx_total, 'lossy_pages': lossy, 'rechecked': tfb}
    return {'rows': rows, 'seq': seq, 'index': index, 'bitmap': bitmap}
