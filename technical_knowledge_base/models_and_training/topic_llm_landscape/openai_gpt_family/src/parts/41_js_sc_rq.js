// ---- Scene (Fig. 3, what one request costs): one column per request, stacked by what the bill charges for: uncached input (blue), input read from
// the prompt cache (green), output (purple; on the index task split into hidden reasoning and the visible answer). Heights in tokens or in dollars,
// each step on its own scale. Every number comes from the page's own price table and rule (PR and reqCost, 12_js_req.js) and, for the index task,
// from Artificial Analysis' run totals (AA, 16a_aa.js) with the cached share back-solved as in the closed "one task taken apart" view (17_js_cost.js).
// window.OGRQ holds the numbers, checked by check_stages.mjs. ----
window.OGRQ=(function(){
  if(typeof PR==='undefined'||typeof reqCost!=='function'||typeof AA==='undefined')return null;
  const by=id=>PR.find(p=>p[0]===id),A=by('astra'),S=by('sol61'),L=by('luna');
  // the bill split into its parts, by the same rule as reqCost (standard tier, nothing written to the cache)
  function split(p,I,O,h){const lg=I>LONG,mi=lg?2:1,mo=lg?1.5:1;return {in:I*(1-h)*p[2]*mi/1e6,cache:I*h*p[3]*mi/1e6,out:O*p[5]*mo/1e6}}
  // one index task: run totals scaled to one task (cost per task over the run's cost); cached share h back-solved from the run's total
  function task(name){const r=AA.find(x=>x[0]===name),[,,ix,cpt,pi,pc,po,I,O,R,C]=r,h=Math.max(0,Math.min(1,(I*pi+O*po-C*1e6)/(I*(pi-pc)))),sc=cpt/C;
    const It=I*sc,Ot=O*sc,Rt=R*sc;return {name,ix,cpt,h,I:It,O:Ot,R:Rt,V:Ot-Rt,usd:{in:It*(1-h)*pi/1e6,cache:It*h*pc/1e6,rsn:Rt*po/1e6,vis:(Ot-Rt)*po/1e6},rs:R/O}}
  const T={A:task('GPT-6 Astra (max)'),S:task('GPT-6.1 Sol (max)'),L:task('GPT-6 Luna (max)')};
  const r1=split(A,50000,5000,0),r2=split(S,50000,5000,0),r3=split(L,50000,5000,0),b300=split(A,300000,10000,0),b272=split(A,272000,10000,0),
    std300=(300000*A[2]+10000*A[5])/1e6,ag=split(A,200000,5000,.75),ag0=split(A,200000,5000,0);
  const tot=o=>Object.values(o).reduce((a,b)=>a+b,0);
  return {A,S,L,split,task,T,r1,r2,r3,b300,b272,std300,ag,ag0,tot};
})();
(function(){
  if(!document.getElementById('stg-rq')||!window.OGRQ||!window.S3)return;const {lerp,mix}=S3,Q=OGRQ,tot=Q.tot;
  const X=[-2.3,0,2.3],CW=1,CD=1,HMAX=3;
  const u2=v=>usd(v,v<.01?4:v<.1?3:2);
  // the steps: slot columns [{name, segs:[[part, value]], ghost}] and the unit
  const K={in:'c1',cache:'good',out:'c4',rsn:'c4',vis:'vis'};
  const tk=t=>[['in',t.I*(1-t.h)],['cache',t.I*t.h],['rsn',t.R],['vis',t.V]],td=t=>[['in',t.usd.in],['cache',t.usd.cache],['rsn',t.usd.rsn],['vis',t.usd.vis]];
  const S=[
    {u:'tok',cols:[{name:'one request',segs:[['in',50000],['out',5000]]}]},
    {u:'usd',cols:[{name:'GPT-6 Astra',segs:[['in',Q.r1.in],['out',Q.r1.out]]}]},
    {u:'usd',cols:[{name:'GPT-6 Astra',segs:[['in',Q.r1.in],['out',Q.r1.out]]},{name:'GPT-6.1 Sol',segs:[['in',Q.r2.in],['out',Q.r2.out]]},{name:'GPT-6 Luna',segs:[['in',Q.r3.in],['out',Q.r3.out]]}]},
    {u:'usd',cols:[{name:'272,000 in',segs:[['in',Q.b272.in],['out',Q.b272.out]]},{name:'300,000 at base rates',ghost:1,segs:[['in',300000*Q.A[2]/1e6],['out',10000*Q.A[5]/1e6]]},{name:'300,000 in, as billed',segs:[['in',Q.b300.in],['out',Q.b300.out]]}]},
    {u:'usd',cols:[{name:'75% read from cache',segs:[['in',Q.ag.in],['cache',Q.ag.cache],['out',Q.ag.out]]},{name:'nothing cached',segs:[['in',Q.ag0.in],['out',Q.ag0.out]]}]},
    {u:'tok',cols:[Q.T.A,Q.T.S,Q.T.L].map((t,i)=>({name:['GPT-6 Astra','GPT-6.1 Sol','GPT-6 Luna'][i],segs:tk(t)}))},
    {u:'usd',cols:[Q.T.A,Q.T.S,Q.T.L].map((t,i)=>({name:['GPT-6 Astra','GPT-6.1 Sol','GPT-6 Luna'][i],segs:td(t)}))}];
  S.forEach(s=>{const m=Math.max(...s.cols.map(c=>c.segs.reduce((a,x)=>a+x[1],0)));s.sc=HMAX/m});
  // world heights of each segment of slot i at step k (0 where the slot or part is absent)
  const H=(k,i,part)=>{const c=S[k].cols[i];if(!c)return 0;const g=c.segs.find(x=>x[0]===part);return g?g[1]*S[k].sc:0};
  const has=(k,i)=>!!S[k].cols[i];
  const ORD=['in','cache','out','rsn','vis'];
  function draw(R,k,e,st){const P=R.P,pk=st.pk,t=pk===k?1:e,vis=mix(P.paper,P.c4,.42);R.grid(-4.6,4.2,-2.2,1.6,.5);
    const colr=p=>p==='vis'?vis:P[K[p]];
    const tops=[];
    for(let i=0;i<3;i++){const a0=has(pk,i),a1=has(k,i),a=pk===k?(a1?1:0):a0&&a1?1:a0?Math.max(0,1-2*t):Math.max(0,2*t-1);
      if(a<=.01){tops.push(null);continue}
      const gp=a0&&S[pk].cols[i].ghost?1:0,gk=a1&&S[k].cols[i].ghost?1:0,g=a0&&a1?lerp(gp,gk,t):a1?gk:gp;
      let y=0;ORD.forEach(p=>{const h0=a0?H(pk,i,p):H(k,i,p),h1=a1?H(k,i,p):h0,h=pk===k?h1:lerp(h0,h1,t);if(h<.004)return;
        R.box([X[i],y,0],[CW,h,CD],{fill:colr(p),fa:lerp(1,.12,g),ea:lerp(.78,.9,g),ec:g>.5?colr(p):null,lw:lerp(.7,1.2,g),a,shadow:y===0&&g<.5});y+=h});
      tops.push([X[i],y,a])}
    // the model and the prompt cache as glass plates behind the first column, with the tokens flowing through them
    const pa=k===0?t:pk===0?1-t:0,PX=X[0]+1.05,PZ=-.5;
    if(pa>.01){R.glass([PX,.3,PZ],[1.3,0,0],[0,1.4,0],{c:P.c4,a:pa,nu:6,nv:6});R.label([PX+.65,1.7,PZ],'GPT-6 Astra · reasoning hidden',{dy:-10,fs:12.5,b:1,c:P.c4,a:pa});
      const hi=H(0,0,'in'),ho=H(0,0,'out');
      R.flow([[X[0]+CW/2,hi*.45,.1],[PX+.2,hi*.45,PZ+.3],[PX+.45,.75,PZ+.02]],{c:P.c1,a:pa,r:.07,n:7,speed:1.1});
      R.flow([[PX+.85,1.35,PZ+.02],[PX+.3,hi+ho*.5,PZ+.3],[X[0]+CW/2,hi+ho*.5,.1]],{c:P.c4,a:pa,r:.07,n:7,speed:1.1})}
    const ca=k===4?t:pk===4?1-t:0;
    if(ca>.01){const hi=H(4,0,'in'),hc=H(4,0,'cache');R.glass([X[0]-.8,.25,-1.7],[1.6,0,0],[0,1.2,0],{c:P.good,a:ca,nu:8,nv:4});
      R.label([X[0],1.65,-1.7],'prompt cache · 150,000 tokens',{fs:12.5,b:1,c:P.good,a:ca});
      R.flow([[X[0],.8,-1.65],[X[0],hi+hc*.5,-1.1],[X[0],hi+hc*.5,-.5]],{c:P.good,a:ca,r:.07,n:8,speed:1.1})}
    // labels: one set per step, the outgoing set gone by mid-transition
    const la=s=>{const a=k===s?t:pk===s?1-e:0;return a>.5?(a-.5)*2:0};
    for(let s=0;s<S.length;s++){const a=la(s);if(a<=.01)continue;
      S[s].cols.forEach((c,i)=>{const h=c.segs.reduce((q,x)=>q+x[1],0);
        R.label([X[i],0,CD/2],c.name,{fs:12.5,b:1,dy:16,c:c.ghost?P.mute:P.ink,a});
        R.label([X[i],h*S[s].sc,-CD/2],S[s].u==='tok'?fmt(Math.round(h))+' tokens':u2(h),{mono:true,fs:13,b:1,dy:-12,c:c.ghost?P.mute:P.ink,a})});
      // the parts of the first column, named on its left
      const c=S[s].cols[0];let y=0;const sc=S[s].sc,nm={in:s>=5?'uncached input':'input',cache:'read from cache',out:'output, reasoning included',rsn:'hidden reasoning',vis:'visible answer'};
      c.segs.forEach(([p,v])=>{const h=v*sc;if(h>.004){const tx=nm[p]+' · '+(S[s].u==='tok'?fmt(Math.round(v)):u2(v));
          R.label([X[0]-CW/2,y+h/2,CD/2],tx,{al:'right',dx:-10,fs:12.5,mono:true,c:p==='vis'?P.c4:P[K[p]],a,grp:'segs'+s})}y+=h});
    }
  }
  const full={cam:[.34,.34],bounds:[[-4.9,0,-1.8],[3.3,3.5,.9]]};
  S3.stage({id:'stg-rq',list:'sx-rq',fig:'Fig. 3 · what one request costs, part by part',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1700,hold:5200,draw,
    margin:w=>w<520?[22,8,32,8]:[24,20,34,20],
    view:k=>k<=1?{cam:[.42,.36],bounds:[[-5.2,0,-1.9],[.6,3.5,.9]]}:k===4?{cam:[.36,.34],bounds:[[-5.2,0,-1.9],[1.4,3.5,.9]]}:full});
})();
