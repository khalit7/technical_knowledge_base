raw=open('hugo.txt',encoding='utf-8').read().replace('\r\n','\n')
i=raw.index('En 1815, M. Charles-Fran')
paras=[' '.join(p.split()) for p in raw[i:].split('\n\n') if p.strip()]
out=[];n=0
for p in paras:
    if n+len(p.encode())>6000: break
    out.append(p);n+=len(p.encode())+2
txt=('\n\n'.join(out)+'\n').replace('\u2014','--')
open('sample_fr.txt','w',encoding='utf-8').write(txt)
print(len(out),len(txt.encode()),len(txt),sorted(set(c for c in txt if ord(c)>127)))
