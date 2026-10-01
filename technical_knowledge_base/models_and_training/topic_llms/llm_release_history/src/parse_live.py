import re,json
s=open('live.md').read()
rows=re.findall(r'<tr>\s*(.*?)\s*</tr>',s,re.S)
out=[]
for r in rows[1:]:
    c=re.findall(r'<td>(.*?)</td>',r,re.S)
    m=re.match(r'(.*) \[source\]\((.*)\)$',c[5])
    out.append(dict(date=c[0],model=c[1],lab=c[2],weights=c[3],size=c[4],note=m.group(1),url=m.group(2)))
json.dump(out,open('live_rows.json','w'),indent=0,ensure_ascii=False)
J=json.load(open('../../src/data/release_history.json'))['rows']
print(len(out),len(J))
def fmtsz(x):
    t,a=x['total_params_B'],x['active_params_B']
    if t is None: return 'not disclosed' if not x['open_weights'] else 'n/a'
    f=lambda v: (('%g'%(v/1000))+'T') if v>=1000 else '%g'%v
    return f(t) if (a is None or a==t) else f(t)+' / '+f(a)
for L,x in zip(out,J):
    w='open ('+x['licence']+')' if x['open_weights'] else 'closed'
    for k,v in [('date',x['date']),('model',x['model']),('lab',x['lab']),('weights',w),('size',fmtsz(x)),('note',x['note']),('url',x['source_url'])]:
        if L[k].replace('\\$','$')!=v: print(L['model'],k,repr(L[k]),'| json',repr(v))
