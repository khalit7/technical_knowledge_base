// ---- BM25 and RRF arithmetic shared by the Reading widgets (checked by src/recompute.py) ----
// BM25 as Lucene computes it: idf = ln(1 + (N - n + 0.5) / (n + 0.5)); term score = idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / avgdl)).
// Document length dl = number of lexemes kept after stop words (counting repeats), as in a Postgres tsvector.
window.SV=window.SV||{};
SV.bm25=function(docLex,qlex,k1,b){
  const N=docLex.length,tf=docLex.map(L=>{const m={};L.forEach(([lx,pos])=>m[lx]=(m[lx]||0)+pos.length);return m});
  const dl=tf.map(m=>Object.values(m).reduce((a,c)=>a+c,0)),avg=dl.reduce((a,c)=>a+c,0)/N;
  const df={};qlex.forEach(t=>{df[t]=tf.filter(m=>m[t]).length});
  const idf={};qlex.forEach(t=>{idf[t]=Math.log(1+(N-df[t]+.5)/(df[t]+.5))});
  const parts=tf.map((m,j)=>qlex.map(t=>{const f=m[t]||0;return f?idf[t]*f*(k1+1)/(f+k1*(1-b+b*dl[j]/avg)):0}));
  const scores=parts.map(p=>p.reduce((a,c)=>a+c,0));
  return {N,dl,avg,df,idf,parts,scores,tf}};
// reciprocal rank fusion: score(d) = sum over lists of 1 / (k + rank), rank starting at 1 (Cormack, Clarke and Buettcher 2009)
SV.rrf=function(lists,k){const s={};lists.forEach(L=>L.forEach((d,i)=>{s[d]=(s[d]||0)+1/(k+i+1)}));return Object.keys(s).map(d=>[+d,s[d]]).sort((a,b)=>b[1]-a[1]||a[0]-b[0])};
