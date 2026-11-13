// ---- Scene: Fig. 3, why MathArena's ± is too narrow: the problem, not the answer, is the unit (stg-clu, renderer v2) ----
// o1 (medium) on AIME 2025: its 120 released answers (30 problems by 4 runs) from window.MA, graded by window.MC. The two clouds are 200 seeded
// bootstrap rescorings computed here: one draws 120 answers independently, the other draws 30 problems with their four runs. The three intervals
// are the formulas in MC.stats: 1.96·√(p(1−p)/120), 1.96 × the standard error of the 30 per-problem solve rates, and 1.96·√(p(1−p)/30).
(function(){
  if(!document.getElementById('stg-clu')||!window.S3||!window.MA||!window.MC)return;const {mix,cl,lerp}=S3;
  const comp=MA.comps.find(c=>c.k==='aime_2025'),m=comp.models.find(x=>x.n==='o1 (medium)'),st=MC.stats(m,comp.n),D=st.D,n=comp.n;
  const per=D.map(r=>r.filter(x=>x===0).length);
  const order=per.map((c,i)=>[c,i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).map(x=>x[1]),rank=[];order.forEach((p,j)=>rank[p]=j);
  const mixed=per.filter(c=>c>0&&c<4).length;
  // seeded bootstrap (mulberry32), so the clouds are the same on every load
  function rng(s){return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  const flat=[];D.forEach(r=>r.forEach(x=>flat.push(x===0?1:0)));const NB=200;
  const R1=rng(7),R2=rng(11),J=rng(5),bA=[],bP=[],jA=[],jP=[];
  for(let b=0;b<NB;b++){let s=0;for(let i=0;i<flat.length;i++)s+=flat[Math.floor(R1()*flat.length)];bA.push(100*s/flat.length);jA.push(J());
    let t=0;for(let i=0;i<n;i++)t+=per[Math.floor(R2()*n)];bP.push(100*t/(4*n));jP.push(J())}
  const sd=a=>{const mu=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-mu)*(x-mu),0)/(a.length-1))};
  window.MAS=window.MAS||{};MAS.clu={p1:+st.p1.toFixed(2),right:st.corr,answers:st.na,all:st.all,none:st.none,mixed,ciAns:+st.ciAns.toFixed(2),ciClu:+st.ciClu.toFixed(2),ciProb:+st.ciProb.toFixed(2),
    ratio:+(st.ciClu/st.ciAns).toFixed(2),bootSdA:+sd(bA).toFixed(2),bootSdP:+sd(bP).toFixed(2)};
  const CW=.3,RW=.42,FX=j=>(j-(n-1)/2)*CW,FZ=r=>1.1+(r-1.5)*RW;      // the answer field: problems along x, runs in depth
  const SX=v=>-4.6+(v-55)/45*9.2,ZA=-.85,ZP=-2.25,ZB=-3.5,ZX=-4.3,p=st.p1; // the score axis (55% to 100%), the two clouds, the binomial row, the ticks
  function cloud(R,P,vals,jit,z,c,a){vals.forEach((v,i)=>R.ball([SX(v),.1,z+(jit[i]-.5)*.7],.055,{c,a}))}
  // an interval as a tinted band on the floor under its cloud, with posts at p ± hw and its half-width written at the right end
  function band(R,P,z,hw,c,a,txt){R.box([SX(p),0,z],[SX(p+hw)-SX(p-hw),.03,.95],{fill:mix(P.paper,c,.3),a:a*.9,shadow:false,edge:false});
    [-1,1].forEach(s=>R.box([SX(p+s*hw),0,z],[.05,.28,.95],{fill:mix(P.paper,c,.7),a,shadow:false}));R.label([SX(p+hw)+.1,.14,z],txt,{al:'left',dx:6,mono:true,fs:12.5,b:1,c,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.4,-4.6,2.1,.5);
    const fa=k<=1?1:.25;
    // 1 and 2: the answers, then sorted by how many runs are right
    D.forEach((row,j)=>{const x0=FX(j),x1=FX(rank[j]),x=k===0?x0:k===1?lerp(x0,x1,e):x1,c=per[j],mx=c>0&&c<4;
      row.forEach((v,r)=>{const ok=v===0,lift=k===1&&mx?.18*e:0;R.box([x,lift,FZ(r)],[CW*.82,CW*.6,RW*.8],{fill:mix(P.paper,ok?P.good:P.bad,.6),a:fa*(k===1&&!mx?1-.45*e:1),shadow:false,lw:.6})})});
    if(k<=1)R.label([FX(0)-.25,0,FZ(1.5)],'4 runs',{al:'right',dx:-6,fs:12,c:P.mute,wide:1});
    if(k===0){const tw=turn();R.label(tw?[FX(n-1)+.15,0,FZ(3)+.25]:[0,0,FZ(3)+.3],'30 problems · '+st.corr+' of '+st.na+' answers right',{al:tw?'right':'center',fs:12.5,dy:tw?16:14,c:P.mute})} // on wide screens and phones steps 1 and 2 turn the row into depth, so this sits below its near end
    if(k===1){R.label([FX(st.all/2-.5),.2,FZ(0)-.3],st.all+' right on all 4',{fs:12.5,b:1,c:P.good,a:e,dy:-10});
      R.label([FX(st.all+mixed/2-.5),.4,FZ(0)-.3],'only '+mixed+' mixed',{fs:12.5,b:1,c:P.c5,a:e,dy:-10});
      R.label([FX(n-st.none/2-.5),0,FZ(3)+.3],st.none+' wrong on all 4',{fs:12.5,b:1,c:P.bad,a:e,dy:14})}
    // the axis, at the back
    if(k>=2){const aa=k===2?e:1;R.line([[SX(55),0,ZX],[SX(100),0,ZX]],{c:P.mute,w:1,a:aa});
      [60,70,80,90,100].forEach(v=>{R.line([[SX(v),0,ZX],[SX(v),0,ZX+.15]],{c:P.mute,w:1,a:aa});R.label([SX(v),0,ZX],v+'%',{fs:12,dy:-11,c:P.mute,a:aa})});
      R.line([[SX(p),0,ZA+.6],[SX(p),0,ZX]],{c:P.ink,w:1,dash:[4,4],a:aa*.5});R.label([SX(p),0,ZA+.6],'score '+st.p1.toFixed(2)+'%',{fs:12.5,b:1,c:P.ink,dy:12,a:aa})}
    // 3: answers as the unit
    if(k>=2){const t=k===2?e:1,aa=k===3?.4:1;band(R,P,ZA,st.ciAns,P.c1,(k===2?e:1)*aa,'±'+st.ciAns.toFixed(2));cloud(R,P,bA.slice(0,Math.round(NB*t)),jA,ZA,P.c1,aa*.9);
      if(k===2)R.flowArc([0,.2,FZ(0)-.2],[SX(p),.15,ZA+.3],.35,{c:P.c1,a:.7,r:.05});
      R.label([SX(55),0,ZA],'120 answers resampled',{al:'right',dx:-4,fs:12,c:P.c1,a:Math.max(.5,aa),grp:'cl'})}
    // 4: problems as the unit
    if(k>=3){const t=k===3?e:1;band(R,P,ZP,st.ciClu,P.c4,k===3?e:1,'±'+st.ciClu.toFixed(2));cloud(R,P,bP.slice(0,Math.round(NB*t)),jP,ZP,P.c4,.9);
      if(k===3)R.flowArc([0,.2,FZ(0)-.2],[SX(p),.15,ZP+.3],.6,{c:P.c4,a:.7,r:.05});
      R.label([SX(55),0,ZP],'30 problems resampled',{al:'right',dx:-4,fs:12,c:P.c4,grp:'cl'})}
    // 5: the binomial on 30 problems, ignoring the runs
    if(k>=4){band(R,P,ZB,st.ciProb,P.c5,e,'±'+st.ciProb.toFixed(2));R.label([SX(55),0,ZB],'binomial, n = 30',{al:'right',dx:-4,fs:12,c:P.c5,a:e,grp:'cl'})}
  }
  const turn=()=>innerWidth>=1100||innerWidth<520; // where the card is tall for the row (aspect-sized, or a phone), steps 1 and 2 turn it into depth
  const full={cam:[0,1.1],bounds:[[-5,0,-4.6],[5.2,.6,1.9]]};
  S3.stage({id:'stg-clu',list:'sx-clu',fig:'Fig. 3 · o1 (medium), AIME 2025, 120 answers',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,16,16,150],
    view:k=>k<=1?{cam:turn()?[.5,.72]:[0,1.0],bounds:[[-4.8,0,.2],[4.8,.6,2]]}:full});
})();
