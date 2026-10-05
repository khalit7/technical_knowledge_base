# Cut a passage from Darwin, Origin of Species (Project Gutenberg #1228), chapter III, unwrap lines.
raw=open('darwin.txt',encoding='utf-8').read().replace('\r\n','\n')
i=raw.index('Before entering on the subject of this chapter')
body=raw[i:]
paras=[' '.join(p.split()) for p in body.split('\n\n') if p.strip()]
out=[];n=0
for p in paras:
    if n+len(p.encode())>12000: break
    out.append(p);n+=len(p.encode())+2
txt=('\n\n'.join(out)+'\n').replace('\u2014','--')
open('sample.txt','w',encoding='utf-8').write(txt)
b=txt.encode()
print('paras',len(out),'bytes',len(b),'chars',len(txt),'nonascii chars',sum(1 for c in txt if ord(c)>127), sorted(set(c for c in txt if ord(c)>127)))
