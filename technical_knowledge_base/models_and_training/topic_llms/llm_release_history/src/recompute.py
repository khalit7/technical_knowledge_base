import json,collections,statistics as st
L=json.load(open('live_rows.json'));J=json.load(open('../../src/data/release_history.json'))['rows']
R=[dict(l,**{'k':j['kind'],'o':j['open_weights'],'t':j['total_params_B'],'a':j['active_params_B'],'lic':j['licence']}) for l,j in zip(L,J)]
print('rows',len(R),'open',sum(r['o'] for r in R),'closed',sum(not r['o'] for r in R))
print('month-only',[r['model'] for r in R if len(r['date'])==7])
labs=collections.Counter(r['lab'] for r in R);print(labs.most_common())
print('years',collections.Counter(r['date'][:4] for r in R))
for y in '2023 2024 2025 2026'.split():
    rs=[r for r in R if r['date'][:4]==y];print(y,len(rs),'open',sum(r['o'] for r in rs))
for tag in ['open','moe','reasoning','hybrid-attention','multimodal']:
    seen={}
    for r in sorted(R,key=lambda r:r['date']):
        ok = r['o'] if tag=='open' else tag in r['k']
        if ok and r['lab'] not in seen: seen[r['lab']]=(r['date'],r['model'])
    print('\nFIRST',tag,len(seen)); [print('  ',v,k) for k,v in sorted(seen.items(),key=lambda x:x[1])]
sz=[r for r in R if r['t'] is not None];print('\nwith size',len(sz),'open with size',sum(r['o'] for r in sz))
print('null size open',[r['model'] for r in R if r['o'] and r['t'] is None])
print('closed with size',[r['model'] for r in R if not r['o'] and r['t'] is not None])
moe=[r for r in sz if r['a'] is not None and r['a']!=r['t']]
print('moe with both',len(moe))
for r in sorted(moe,key=lambda r:r['t']/r['a']): print('  %-28s %s %7.1f/%6.1f  x%.1f'%(r['model'],r['date'],r['t'],r['a'],r['t']/r['a']))
for y in '2023 2024 2025 2026'.split():
    o=[r for r in sz if r['o'] and r['date'][:4]==y]
    if o: print(y,'open sized',len(o),'max total',max(r['t'] for r in o),'median total',st.median(r['t'] for r in o),'median active',st.median((r['a'] or r['t']) for r in o))
print(collections.Counter(r['lic'] for r in R if r['o']).most_common())
print('total only, active missing',[r['model'] for r in sz if r['a'] is None])
