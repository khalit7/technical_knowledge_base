import re,html,sys,json
def clean(x):
    x=re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>',lambda m:' '+html.unescape(m.group(1))+' ',x,flags=re.S)
    x=re.sub(r'<[^>]+>',' ',x);x=html.unescape(x);return ' '.join(x.split())
def tables(p):
    s=open(p,errors='ignore').read()
    out=[]
    for m in re.finditer(r'<figure[^>]*class="[^"]*ltx_table[^"]*"[^>]*>(.*?)</figure>',s,re.S):
        f=m.group(1);cap=re.search(r'<figcaption[^>]*>(.*?)</figcaption>',f,re.S)
        rows=[]
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>',f,re.S):
            rows.append([clean(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>',tr,re.S)])
        out.append({'cap':clean(cap.group(1)) if cap else '','rows':rows})
    return out
if __name__=='__main__':
    T=tables(sys.argv[1])
    sel=sys.argv[2] if len(sys.argv)>2 else None
    for i,t in enumerate(T):
        if sel is None: print(i,t['cap'][:200],len(t['rows']))
        elif str(i)==sel:
            print(t['cap']);[print(' | '.join(r)) for r in t['rows']]
