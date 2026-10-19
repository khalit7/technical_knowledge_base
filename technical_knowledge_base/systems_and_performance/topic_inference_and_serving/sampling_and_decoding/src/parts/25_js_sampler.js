// ---- The sampler: one next-token distribution through penalties, temperature and truncation ----
// Same algorithm as recompute.py (checked there against the exact full-vocabulary result).
// A position holds the top 100 tokens exactly and the rest of the vocabulary as [logit, count] bins.
SD.entries=function(pos){
  const E=pos.t.map((t,i)=>({t,l:pos.l[i],n:1,c:pos.c[i],tail:false,r:i}));
  pos.tl.forEach(([l,n])=>E.push({t:'',l,n,c:0,tail:true,r:999}));
  return E;
};
SD.vis=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/ /g,'␣').replace(/\n/g,'↵').replace(/\t/g,'⇥')||'(empty)';
// cfg: {T, k, p, minp, typ, rep, pres, freq, order:'first'|'last'}
SD.run=function(E,cfg){
  const N=E.length,T=cfg.T,greedy=!(T>0.0001);
  const keep=E.map(e=>e.n),cut=E.map(()=>'');
  // 1. penalties on logits (only tokens already in the context: c > 0)
  let a=E.map(e=>{let l=e.l;if(e.c>0){if(cfg.rep&&cfg.rep!==1)l=l>0?l/cfg.rep:l*cfg.rep;l-=(cfg.pres||0)+(cfg.freq||0)*e.c}return l});
  let z=(cfg.order==='last'||greedy)?a.slice():a.map(v=>v/T);
  const probs=()=>{let m=-1e9;for(let i=0;i<N;i++)if(keep[i]>0&&z[i]>m)m=z[i];const w=z.map((v,i)=>keep[i]*Math.exp(v-m));const s=w.reduce((x,y)=>x+y,0);return w.map(x=>x/s)};
  const order=()=>[...Array(N).keys()].sort((i,j)=>z[j]-z[i]);
  const drop=(i,why)=>{if(keep[i]>0&&!cut[i])cut[i]=why;keep[i]=0};
  const partial=(i,k,why)=>{if(k<keep[i]){if(!cut[i]&&k===0)cut[i]=why;keep[i]=k}};
  const pre=probs(); // the distribution the truncation sees first (after temperature when it comes first)
  if(greedy){const o=order();o.forEach((i,j)=>{if(j===0)keep[i]=1;else drop(i,'greedy')});}
  else{
    const fK=()=>{if(!cfg.k)return;let left=cfg.k;order().forEach(i=>{const k=Math.min(keep[i],left);partial(i,k,'top-k');left-=k})};
    const fP=()=>{if(!(cfg.p<1))return;const P=probs();let cum=0;order().forEach(i=>{if(!keep[i])return;const per=P[i]/keep[i];if(cum>=cfg.p){drop(i,'top-p');return}
      const k=Math.min(keep[i],Math.max(1,Math.ceil((cfg.p-cum)/per-1e-9)));cum+=per*k;partial(i,k,'top-p')})};
    const fM=()=>{if(!(cfg.minp>0))return;const P=probs();let pm=0;for(let i=0;i<N;i++)if(keep[i])pm=Math.max(pm,P[i]/keep[i]);for(let i=0;i<N;i++)if(keep[i]&&P[i]/keep[i]<cfg.minp*pm)drop(i,'min-p')};
    const fY=()=>{if(!(cfg.typ<1))return;const P=probs();let H=0;for(let i=0;i<N;i++)if(keep[i])H-=P[i]*Math.log(P[i]/keep[i]);
      const ix=[...Array(N).keys()].filter(i=>keep[i]).sort((i,j)=>Math.abs(-Math.log(P[i]/keep[i])-H)-Math.abs(-Math.log(P[j]/keep[j])-H));let cum=0;
      ix.forEach(i=>{const per=P[i]/keep[i];if(cum>=cfg.typ){drop(i,'typical');return}const k=Math.min(keep[i],Math.max(1,Math.ceil((cfg.typ-cum)/per-1e-9)));cum+=per*k;partial(i,k,'typical')})};
    (cfg.order==='last'?[fK,fY,fP,fM]:[fK,fP,fM,fY]).forEach(f=>f());
    if(cfg.order==='last')z=a.map(v=>v/T);
  }
  const fin=probs();
  let kept=0,mass=0,H=0,top10=0;
  for(let i=0;i<N;i++){kept+=keep[i];mass+=pre[i]*keep[i]/E[i].n;if(keep[i])H-=fin[i]*Math.log(fin[i]/keep[i]);if(E[i].r>=10)top10+=fin[i]}
  // raw T=1 probability for reference
  const raw=(()=>{let m=Math.max(...E.map(e=>e.l));const w=E.map(e=>e.n*Math.exp(e.l-m));const s=w.reduce((x,y)=>x+y,0);return w.map(x=>x/s)})();
  return {keep,cut,pre,fin,raw,kept,mass,H,eff:Math.exp(H),out10:top10,z};
};
// draw n samples (seeded) from a run's final distribution; returns counts by entry index (tail bins grouped)
SD.draw=function(R,n,seed){const rnd=mulberry32(seed||1);const c={};const cdf=[];let s=0;R.fin.forEach((p,i)=>{s+=p;cdf.push(s)});
  for(let k=0;k<n;k++){const u=rnd()*s;let lo=0,hi=cdf.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cdf[m]<u)lo=m+1;else hi=m}c[lo]=(c[lo]||0)+1}return c};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
SD.fmtP=p=>p>=0.995?(p*100).toFixed(0)+'%':p>=0.1?(p*100).toFixed(1)+'%':p>=0.001?(p*100).toFixed(2)+'%':p>0?'<0.1%':'0';
SD.fmtN=v=>Math.round(v).toLocaleString('en-GB');
