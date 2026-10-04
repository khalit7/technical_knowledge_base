"""Python port of parts/30_js_engine.js, line by line (same LCG, same event order).

recompute.py runs it on the presets and on random settings; check_engine.mjs runs the
page's JavaScript on the same inputs and compares every number.
"""
import math

DEF = dict(T=40000, slowFrom=10000, slowTo=15000, rate=100, pA=1, W=0, own=0, maxQ=0, Tu=0,
           Kd=4, dmaxQ=0, Ld=25, Ls=100, Td=100, att=3, back='none', base=100, cap=2000, budget=0,
           tokMax=10, tokRatio=0.1, brk=0, brkN=20, brkF=50, brkOpen=5000, brkHalf=5, fb=0, drop=0, seed=1)


def lcg(seed):
    st = [seed & 0xffffffff]

    def f():
        st[0] = (st[0] * 1103515245 + 12345) & 0x7fffffff
        return st[0] / 2147483648
    return f


def sim(cfg):
    c = dict(DEF)
    c.update(cfg)
    rnd = lcg(c['seed'] * 7919 + 17)
    jit = lcg(c['seed'] * 104729 + 3)
    NS = math.ceil(c['T'] / 1000) + 6
    END = c['T'] + 6000
    S = {k: [0] * NS for k in ('arr', 'good', 'deg', 'fail', 'att', 'q', 'dq', 'open', 'waste', 'depdone', 'shed', 'failB', 'wdep')}

    def sec(t):
        return min(NS - 1, int(math.floor(t / 1000)))
    ev = {}

    def at(t, e):
        ev.setdefault(t, []).append(e)
    Q = []; DQ = []
    g = dict(qh=0, dqh=0, busyW=0, busyD=0, tokens=c['tokMax'], inDep=0, bst=0, bopenUntil=0, bhalfLeft=0,
             nReq=0, nA=0, nGood=0, nDeg=0, nFail=0, nAtt=0, nDepDone=0, nWaste=0, nShed=0, nBrkRej=0, nLate=0)
    bwin = []; bhalf = []
    unlimitedW = c['W'] <= 0
    lat = []

    def brkAllow(t):
        if not c['brk']:
            return True
        if g['bst'] == 1:
            if t >= g['bopenUntil']:
                g['bst'] = 2; g['bhalfLeft'] = c['brkHalf']; bhalf.clear()
            else:
                return False
        if g['bst'] == 2:
            if g['bhalfLeft'] > 0:
                g['bhalfLeft'] -= 1
                return True
            return False
        return True

    def brkRecord(t, okk):
        if not c['brk']:
            return
        if g['bst'] == 0:
            bwin.append(0 if okk else 1)
            if len(bwin) > c['brkN']:
                bwin.pop(0)
            if len(bwin) >= c['brkN']:
                f = sum(bwin)
                if f * 100 >= c['brkF'] * len(bwin):
                    g['bst'] = 1; g['bopenUntil'] = t + c['brkOpen']; bwin.clear()
        elif g['bst'] == 2:
            bhalf.append(0 if okk else 1)
            if len(bhalf) >= c['brkHalf']:
                f = sum(bhalf)
                if f * 100 >= c['brkF'] * len(bhalf):
                    g['bst'] = 1; g['bopenUntil'] = t + c['brkOpen']
                else:
                    g['bst'] = 0; bwin.clear()
                bhalf.clear()

    def finish(t, r, kind):
        if r['done']:
            return
        r['done'] = 1
        if not unlimitedW:
            g['busyW'] -= 1
        if r.get('inDep'):
            g['inDep'] -= 1; r['inDep'] = 0
        if kind != 'fail' and c['Tu'] > 0 and t - r['t0'] > c['Tu']:
            g['nLate'] += 1; kind = 'late'
        if kind == 'good':
            g['nGood'] += 1; S['good'][sec(t)] += 1; lat.append(t - r['t0'])
        elif kind == 'deg':
            g['nDeg'] += 1; S['deg'][sec(t)] += 1; lat.append(t - r['t0'])
        elif kind == 'late':
            g['nFail'] += 1; S['fail'][sec(r['t0'] + c['Tu'])] += 1
            if not r['A']:
                S['failB'][sec(r['t0'] + c['Tu'])] += 1
        else:
            g['nFail'] += 1; S['fail'][sec(t)] += 1
            if not r['A']:
                S['failB'][sec(t)] += 1

    def attempt(t, r):
        if not brkAllow(t):
            g['nBrkRej'] += 1
            finish(t, r, 'deg' if c['fb'] else 'fail')
            return
        a = dict(r=r, k=r['k'], dl=(t + c['Td']) if c['Td'] > 0 else float('inf'), over=0)
        g['nAtt'] += 1; S['att'][sec(t)] += 1
        if c['dmaxQ'] > 0 and len(DQ) - g['dqh'] >= c['dmaxQ']:
            g['nShed'] += 1; S['shed'][sec(t)] += 1
            attemptEnd(t, a, False)
            return
        DQ.append(a)
        if c['Td'] > 0:
            at(t + c['Td'], dict(y=3, a=a))

    def attemptEnd(t, a, okk):
        if a['over']:
            return
        a['over'] = 1
        r = a['r']
        brkRecord(t, okk)
        if c['budget']:
            if okk:
                g['tokens'] = min(c['tokMax'], g['tokens'] + c['tokRatio'])
            else:
                g['tokens'] = max(0, g['tokens'] - 1)
        if okk:
            finish(t, r, 'good')
            return
        if r['k'] + 1 >= c['att'] or (c['budget'] and g['tokens'] <= c['tokMax'] / 2):
            finish(t, r, 'deg' if c['fb'] else 'fail')
            return
        r['k'] += 1
        if c['back'] == 'none':
            attempt(t, r)
            return
        rng = min(c['cap'], c['base'] * math.pow(2, r['k']))
        d = max(1, int(math.floor(jit() * rng)))
        at(t + d, dict(y=4, r=r))

    def startReq(t, r):
        if c['drop'] and c['Tu'] > 0 and t - r['t0'] > c['Tu']:
            finish(t, r, 'fail')
            return
        if c['own'] > 0:
            at(t + c['own'], dict(y=1, r=r))
        else:
            afterOwn(t, r)

    def afterOwn(t, r):
        if r['A']:
            r['inDep'] = 1; g['inDep'] += 1
            attempt(t, r)
            return
        finish(t, r, 'good')
    thr = c['rate'] / 1000
    for t in range(END):
        if t < c['T'] and rnd() < thr:
            r = dict(t0=t, A=rnd() < c['pA'], k=0, done=0)
            g['nReq'] += 1
            if r['A']:
                g['nA'] += 1
            S['arr'][sec(t)] += 1
            if unlimitedW:
                startReq(t, r)
            elif c['maxQ'] > 0 and len(Q) - g['qh'] >= c['maxQ']:
                g['nShed'] += 1; S['shed'][sec(t)] += 1; r['done'] = 1; g['nFail'] += 1; S['fail'][sec(t)] += 1
                if not r['A']:
                    S['failB'][sec(t)] += 1
            else:
                Q.append(r)
        es = ev.pop(t, None)
        if es:
            i = 0
            while i < len(es):
                e = es[i]; i += 1
                y = e['y']
                if y == 1:
                    afterOwn(t, e['r'])
                elif y == 2:
                    g['busyD'] -= 1; g['nDepDone'] += 1; S['depdone'][sec(t)] += 1
                    a = e['a']
                    if a['over']:
                        g['nWaste'] += 1; S['waste'][sec(t)] += 1
                    else:
                        attemptEnd(t, a, True)
                elif y == 3:
                    if not e['a']['over']:
                        attemptEnd(t, e['a'], False)
                elif y == 4:
                    attempt(t, e['r'])
        while g['busyD'] < c['Kd'] and g['dqh'] < len(DQ):
            a = DQ[g['dqh']]; g['dqh'] += 1
            if c['drop'] and a['dl'] <= t:
                continue
            g['busyD'] += 1
            L = c['Ls'] if (c['slowFrom'] <= t < c['slowTo']) else c['Ld']
            at(t + L, dict(y=2, a=a))
        if not unlimitedW:
            while g['busyW'] < c['W'] and g['qh'] < len(Q):
                r = Q[g['qh']]; g['qh'] += 1; g['busyW'] += 1
                startReq(t, r)
        s = sec(t)
        ql = len(Q) - g['qh']; dql = len(DQ) - g['dqh']
        if ql > S['q'][s]:
            S['q'][s] = ql
        if g['inDep'] > S['wdep'][s]:
            S['wdep'][s] = g['inDep']
        if dql > S['dq'][s]:
            S['dq'][s] = dql
        if c['brk'] and g['bst'] == 1 and t < g['bopenUntil']:
            S['open'][s] += 1
    tot = g['nGood'] + g['nDeg'] + g['nFail']
    unfinished = g['nReq'] - tot
    s0 = int(c['slowTo'] // 1000); sN = int(c['T'] // 1000); rec = None
    for s in range(s0, sN):
        okk = True
        for x in range(s, sN):
            if S['arr'][x] > 0 and S['good'][x] + S['deg'][x] < 0.9 * S['arr'][x]:
                okk = False
                break
        if okk:
            rec = s - s0
            break
    lat.sort()
    n = g['nReq']
    return dict(S=S, tot=dict(
        req=n, A=g['nA'], good=g['nGood'], deg=g['nDeg'], fail=g['nFail'] + unfinished, late=g['nLate'], att=g['nAtt'],
        depDone=g['nDepDone'], waste=g['nWaste'], shed=g['nShed'], brkRej=g['nBrkRej'],
        success=(g['nGood'] + g['nDeg']) / n if n else 0, full=g['nGood'] / n if n else 0,
        attPerA=g['nAtt'] / g['nA'] if g['nA'] else 0,
        useful=(g['nDepDone'] - g['nWaste']) / g['nDepDone'] if g['nDepDone'] else 0, recovery=rec,
        p50=lat[int(math.floor(len(lat) * 0.5))] if lat else None,
        p99=lat[int(math.floor(len(lat) * 0.99))] if lat else None))
