// ---- The offloaded optimizer step, CPU Adam against the bucket stream (Eq. 5, Algorithm 4), in explained stretches (2026-11-13 rollout) ----
(function(){
const G=26,TCPU=3.95,BMAX=142.076e6;
// per-bucket stage times in units of the upload: up 1, update 0.25, write-back 0.75 (bytes 16 : 12); scaled so 2 slots take 1.93 s
function sim(s,a){const up=a,ud=.25*a,dn=.75*a,h=[],u=[],d=[];
  for(let g=0;g<G;g++){const slot=g>=s?d[g-s][1]:0,h0=Math.max(g?h[g-1][1]:0,slot);h.push([h0,h0+up]);
    const u0=Math.max(h[g][1],g?u[g-1][1]:0);u.push([u0,u0+ud]);const d0=Math.max(u[g][1],g?d[g-1][1]:0);d.push([d0,d0+dn])}
  return {h,u,d,T:d[G-1][1]}}
const A0=1.93/sim(2,1).T,R={s1:sim(1,A0),s2:sim(2,A0),s3:sim(3,A0)};
const lanes={s1:1,s2:2,s3:3};
// four explained stretches for the stream (#sx-osx: the first upload, the fill, the steady state, the drain) and two for CPU Adam (#sx-osx-cpu);
// each stretch plays its part of the time axis during its step. tEnd(m,k) is where step k ends.
function tEnd(m,k){if(m==='cpu')return TCPU;const r=R[m];return [r.h[0][1],r.d[1][1],r.h[G-1][1],r.T][k]}
const tAt=(m,k,e)=>{const a=k?tEnd(m,k-1):0;return a+(tEnd(m,k)-a)*e};
const modes={s2:[0,1,2,3],s1:[0,1,2,3],s3:[0,1,2,3],cpu:[0,1]};
function draw(m,k,e,w){const t=tAt(m,k,e),pl=92,X=v=>pl+(w-pl-8)*v/4.2,lh=22;let s='',y=8;
  [0,1,2,3,4].forEach(v=>{s+=ln2(X(v),4,X(v),4+lh*4+8,'var(--line)')+tx(X(v),lh*4+26,v+' s',{fs:11,a:'middle',c:'var(--mute)'})});
  const bar=(row,a,b,c,lab)=>{if(t<=a)return '';const bb=Math.min(b,t);return rc(X(a),8+row*lh,Math.max(1,X(bb)-X(a)-.6),lh-6,c,{r:1,op:.9})};
  const lab=(row,n)=>tx(pl-6,8+row*lh+12,n,{fs:11,a:'end'});
  if(m==='cpu'){s+=lab(0,'CPU AdamW')+lab(1,'GPU')+bar(0,0,TCPU,'var(--c2)')+(t>0?tx(X(Math.min(t,TCPU))-4,8+lh+12,'idle',{fs:11,a:'end',c:'var(--mute)'}):'')}
  else{const r=R[m];s+=lab(0,'to GPU')+lab(1,'GPU AdamW')+lab(2,'to host');
    for(let g=0;g<G;g++){const c=g%2?'var(--c1)':'var(--c6)';s+=bar(0,r.h[g][0],r.h[g][1],c)+bar(1,r.u[g][0],r.u[g][1],c)+bar(2,r.d[g][0],r.d[g][1],c)}}
  s+=ln2(X(1.93),4,X(1.93),lh*4+12,'var(--good)',{da:'3 3'})+tx(X(1.93)-3,lh*3+18,'1.93 s measured',{fs:11,a:'end',c:'var(--good)'});
  s+=ln2(X(TCPU),4,X(TCPU),lh*4+12,'var(--bad)',{da:'3 3'})+tx(X(TCPU)-3,lh*3+18,'3.95 s',{fs:11,a:'end',c:'var(--bad)'});
  s+=ln2(X(t),4,X(t),lh*4+12,'var(--ink)',{sw:1.5});
  return svgW(w,lh*4+32,s,'Optimizer step timeline')}
function counters(m,k,e){const t=tAt(m,k,e);
  const done=m==='cpu'?(t>=TCPU?G:0):R[m].d.filter(x=>x[1]<=t+1e-9).length,busy=m==='cpu'?0:R[m].u.reduce((a,x)=>a+Math.max(0,Math.min(t,x[1])-x[0]),0);
  return stat('Elapsed',t.toFixed(2)+' s',m==='cpu'?'serial host update':'of '+R[m].T.toFixed(2)+' s')+stat('Buckets written back',m==='cpu'?(t>=TCPU?'all':'0 until the end'):done+' of '+G,'about 100M parameters each')+stat('GPU staging memory',m==='cpu'?'0 GiB':fmtBytes(lanes[m]*BMAX*16),m==='cpu'?'nothing on the GPU':lanes[m]+' slots × 142.076M × 16 bytes'+(m==='s2'?' = Table 14\'s 4.234 GiB':m==='s3'?' = 6.351 GiB':''))}
makeAnim({id:'osx',modes,mode:'s2',lists:{s2:'sx-osx',s1:'sx-osx',s3:'sx-osx',cpu:'sx-osx-cpu'},draw,counters,dur:4600,durOf:(m,k)=>m==='cpu'&&k===0?7000:k===2?6400:4600});
window.__osaCheck=()=>({s1:R.s1.T,s2:R.s2.T,s3:R.s3.T});
})();
