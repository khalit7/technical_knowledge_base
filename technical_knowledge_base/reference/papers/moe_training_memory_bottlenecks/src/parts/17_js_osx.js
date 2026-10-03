// ---- Live 4: the offloaded optimizer step, CPU Adam against the bucket stream (Eq. 5, Algorithm 4) ----
(function(){
const G=26,TCPU=3.95,BMAX=142.076e6,NSTEP=8;
// per-bucket stage times in units of the upload: up 1, update 0.25, write-back 0.75 (bytes 16 : 12); scaled so 2 slots take 1.93 s
function sim(s,a){const up=a,ud=.25*a,dn=.75*a,h=[],u=[],d=[];
  for(let g=0;g<G;g++){const slot=g>=s?d[g-s][1]:0,h0=Math.max(g?h[g-1][1]:0,slot);h.push([h0,h0+up]);
    const u0=Math.max(h[g][1],g?u[g-1][1]:0);u.push([u0,u0+ud]);const d0=Math.max(u[g][1],g?d[g-1][1]:0);d.push([d0,d0+dn])}
  return {h,u,d,T:d[G-1][1]}}
const A0=1.93/sim(2,1).T,R={s1:sim(1,A0),s2:sim(2,A0),s3:sim(3,A0)};
const lanes={s1:1,s2:2,s3:3};
function steps(m){const A=[];for(let i=1;i<=NSTEP;i++){const T=m==='cpu'?TCPU:R[m].T,t=T*i/NSTEP;
  A.push({t:(i<NSTEP?'Up to t = ':'Done at ')+t.toFixed(2)+' s',c:m==='cpu'?(i<NSTEP?'The host CPU runs AdamW over all of this GPU\'s 2.6B parameters in one serial pass (ZeRO-Offload\'s AVX kernel). The GPU has released its activations and waits, nearly empty.':'3.95 s, measured (Table 4). The GPU was idle for all of it.'):
   i<NSTEP?(m==='s1'?'One staging slot: bucket g+1 cannot upload until bucket g has been written back, so upload, update and write-back take turns and the link is busy only half the time.':'Bucket g+1 uploads while bucket g is updated and bucket g−1 is written back; the upload stream is never idle, so the step runs at the transfer floor.'):
   'Done: '+R[m].T.toFixed(2)+' s'+(m==='s2'?', the measured 1.93 s by construction.':m==='s3'?', the same as two slots up to the fill (Table 14 measured 1.951 s against 1.930).':', about twice the two-slot time: the overlap, not the GPU, is what buys the speed. (One slot was not measured.)')})}
  return A}
const modes={s2:steps('s2'),s1:steps('s1'),s3:steps('s3'),cpu:steps('cpu')};
function draw(m,k,e,w){const T=m==='cpu'?TCPU:R[m].T,t=T*(k+e)/NSTEP,pl=92,X=v=>pl+(w-pl-8)*v/4.2,lh=22;let s='',y=8;
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
function counters(m,k,e){const T=m==='cpu'?TCPU:R[m].T,t=T*(k+e)/NSTEP;
  const done=m==='cpu'?(t>=TCPU?G:0):R[m].d.filter(x=>x[1]<=t+1e-9).length,busy=m==='cpu'?0:R[m].u.reduce((a,x)=>a+Math.max(0,Math.min(t,x[1])-x[0]),0);
  return stat('Elapsed',t.toFixed(2)+' s',m==='cpu'?'serial host update':'of '+R[m].T.toFixed(2)+' s')+stat('Buckets written back',m==='cpu'?(t>=TCPU?'all':'0 until the end'):done+' of '+G,'about 100M parameters each')+stat('GPU staging memory',m==='cpu'?'0 GiB':fmtBytes(lanes[m]*BMAX*16),m==='cpu'?'nothing on the GPU':lanes[m]+' slots × 142.076M × 16 bytes'+(m==='s2'?' = Table 14\'s 4.234 GiB':m==='s3'?' = 6.351 GiB':''))}
makeAnim({id:'osx',modes,mode:'s2',draw,counters,dur:2000});
window.__osaCheck=()=>({s1:R.s1.T,s2:R.s2.T,s3:R.s3.T});
})();
