import subprocess, json, math, collections, heapq
txt=open('sample.txt',encoding='utf-8').read(); B=txt.encode()
book=open('darwin.txt',encoding='utf-8').read().replace('\r\n','\n').replace('\u2014','--').encode()
CMDS={'gzip -9':['gzip','-9','-n','-c'],'bzip2 -9':['bzip2','-9','-c'],'xz -9e':['xz','-9e','-c'],'zstd -19':['zstd','-19','-q','-c'],'zstd --ultra -22':['zstd','--ultra','-22','-q','-c'],'brotli -q 11':['brotli','-q','11','-c']}
def size(cmd,data): return len(subprocess.run(cmd,input=data,capture_output=True,check=True).stdout)
def V(p):
    r=subprocess.run([p,'--version'],capture_output=True,stdin=subprocess.DEVNULL)
    t=(r.stdout+r.stderr).decode('utf-8','replace').strip().splitlines()
    return t[0] if t else ''
ver={k:V(v[0]) for k,v in CMDS.items()}
lens=[500,1000,2000,4000,8000,len(B)]
out={'versions':ver,'lens':lens,'sample_bytes':len(B),'book_bytes':len(book),'comp':{}}
for k,c in CMDS.items():
    out['comp'][k]={'prefix_bytes':[size(c,B[:n]) for n in lens],'book_bytes':size(c,book)}
    out['comp'][k]['prefix_bpb']=[8*s/n for s,n in zip(out['comp'][k]['prefix_bytes'],lens)]
    out['comp'][k]['book_bpb']=8*out['comp'][k]['book_bytes']/len(book)
# order-0 byte entropy and Huffman code on the sample's bytes
cnt=collections.Counter(B); n=len(B)
H=-sum(c/n*math.log2(c/n) for c in cnt.values())
h=[[c,i,{b:''}] for i,(b,c) in enumerate(cnt.items())]; heapq.heapify(h); k=len(h)
while len(h)>1:
    a=heapq.heappop(h); b=heapq.heappop(h)
    d={s:'0'+v for s,v in a[2].items()}; d.update({s:'1'+v for s,v in b[2].items()})
    heapq.heappush(h,[a[0]+b[0],k,d]); k+=1
code=h[0][2]; L=sum(cnt[s]*len(code[s]) for s in cnt)/n
out['order0']={'distinct_bytes':len(cnt),'H_bits_per_byte':H,'huffman_bits_per_byte':L,'top':[[chr(b) if b<128 else b,c,code[b]] for b,c in cnt.most_common(12)]}
json.dump(out,open('comp.json','w'),indent=1)
for k,v in out['comp'].items(): print(k,[round(x,3) for x in v['prefix_bpb']],round(v['book_bpb'],3))
print(out['order0']['H_bits_per_byte'],L,len(cnt));print(ver)
