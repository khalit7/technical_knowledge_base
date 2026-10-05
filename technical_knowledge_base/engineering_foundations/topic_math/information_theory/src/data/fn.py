# Plug-in conditional entropy of the next byte given the previous N-1 bytes, F_N = H(N-grams) - H((N-1)-grams),
# on the whole of Origin of Species (Project Gutenberg #1228, CRLF to LF, em-dashes to --), and on the 10,376-byte passage the page scores (inputs/darwin_ch3.txt).
# usage: python3 fn.py <path to pg1228.txt>
import sys, math, collections, json, os
raw=open(sys.argv[1],encoding='utf-8').read().replace('\r\n','\n').replace('\u2014','--').encode()
def H(b,n):
    if n==0: return 0.0
    c=collections.Counter(b[i:i+n] for i in range(len(b)-n+1)); T=sum(c.values())
    return -sum(v/T*math.log2(v/T) for v in c.values())
out={}
for name,b in [('book',raw),('sample',open(os.path.join(os.path.dirname(__file__),'..','inputs','darwin_ch3.txt'),'rb').read())]:
    hs=[H(b,n) for n in range(0,13)]
    out[name]={'bytes':len(b),'F':[round(hs[n]-hs[n-1],4) for n in range(1,13)]}
    print(name,len(b),out[name]['F'])
json.dump(out,open(os.path.join(os.path.dirname(__file__),'..','inputs','darwin_fn.json'),'w'),indent=0)
