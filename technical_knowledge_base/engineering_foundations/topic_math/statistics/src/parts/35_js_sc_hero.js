// ---- Scene, Fig. 1 (the idea): the population, samples of 30 drawn from it, their means landing on a value axis, the 20,000-sample
// distribution of the mean, and one sample's interval (renderer v2). Data: SD.tiny (the root's tiny model), SD.stage.hero (the first
// eight seeded samples of sims_anim.json and the 20,000 simulated means of sims_clt.json on their lattice; mk_stage.py), SD.boot.tiny30
// (the sample whose interval the page quotes). ----
(function(){
  if(!document.getElementById('stg-hero')||!window.STS)return;const {at,lerp,mix}=S3;
  const T=SD.tiny,Hd=SD.stage.hero,B=SD.boot.tiny30,mu=T.mu,sd=T.sd,se=sd/Math.sqrt(30),ci=B.ci.t;
  const mean=r=>r.reduce((s,v)=>s+v,0)/r.length,means=Hd.samples.map(mean);
  window.ST_HERO={means,se,ci,mean:mean(B.x)};
  const NB=30,XS=.2,xi=i=>(i-(NB-1)/2)*XS,HP=.5,HS=.3;          // bars: 30 slots; height = loss x 0.5 (population), x 0.3 (rows)
  const ZP=-2.6,ZR=j=>-1.85+j*.34,ZY=.15,ZF=1.85;                   // population, sample rows, your sample, front axis
  const X=v=>(v-mu)*7;                                               // the front value axis: 0.45 to 1.2 nats over about 5 units
  const SX=[];{let x0=-2.9;T.p.forEach((p,i)=>{SX[i]=x0+2.9*p;x0+=5.8*p})}
  const hmax=Math.max(...Hd.front.map(f=>f[1])),HF=1.5/hmax;
  // land the eight means as balls on the axis, stacked where two samples gave the same mean
  const land=means.map((m,j)=>[X(m),.09+.17*means.slice(0,j).filter(v=>Math.abs(v-m)<1e-9).length]);
  const cols=(P,r)=>r.map(v=>STS.wc(P,STS.wordOf(v)));
  function draw(R,k,e){const P=R.P;R.grid(-3.6,3.6,-3.1,2.6,.5);
    // 1. the population: one strip, each word's width its probability, its height its loss
    const pa=k===0?1:k===1?.9:k===2?.3:.12,pl=k<=1?1:k===2?.5:0;
    T.p.forEach((p,i)=>{const c=[SX[i],0,ZP];R.box(c,[5.8*p-.05,T.L[i]*HP,.5],{fill:mix(P.paper,STS.wc(P,i),.55),a:pa});
      R.label([c[0],T.L[i]*HP,ZP],STS.WORD[i]+' '+p.toFixed(3),{dy:-11,fs:13,b:1,c:STS.wc(P,i),a:pl})});
    if(k===0){R.label([0,1.5,ZP],'population: width = probability, height = loss',{mono:true,fs:12,c:P.mute,a:e,wide:1});R.label([0,1.5,ZP],'μ = '+mu.toFixed(3)+' nats · σ = '+sd.toFixed(3),{dy:20,mono:true,fs:13,b:1,c:P.good,a:e})}
    // 2. sample 1, then 3. samples 2 to 8: each a row of 30 bars; dots flow from the population into the row being drawn
    const nr=k<1?0:k===1?1:8;
    for(let j=0;j<nr;j++){const appear=k===2&&j>0?Math.max(0,Math.min(1,e*8-j+1)):k===1?e:1;if(appear<=0)continue;
      const r=Hd.samples[j],ra=k===3?.2:k>=4?.2*(1-e):k===2&&j<7?.55:1;
      STS.row(R,r.map((_,i)=>xi(i)),r.map(v=>v*HS),ZR(j),{cols:cols(P,r),a:ra*Math.min(1,appear*1.5),bw:.15,gi:i=>Math.max(0,Math.min(1,appear*1.6-i/NB*.6))});
      if((k===1||k===2&&j>0)&&appear<1){[0,1,2].forEach(w=>{const cnt=r.filter(v=>STS.wordOf(v)===w).length;if(cnt)R.flowArc([SX[w],T.L[w]*HP+.05,ZP],[0,.2,ZR(j)],.5,{c:STS.wc(P,w),n:Math.max(2,Math.round(cnt/3)),r:.06,speed:1.5,a:.9})})}
      if(k<=2)R.label([xi(NB-1)+.15,.1,ZR(j)],(j===0?'sample 1 · mean ':'')+means[j].toFixed(3),{al:'left',dx:6,mono:true,fs:12,c:P.acc,b:j===0,grp:'means',a:Math.max(.6,ra)*appear});
      // the sample's mean flows to the value axis and lands there
      if(k>=2){const ma=k===2?appear:1;if(k===2&&appear<1&&appear>.3)R.flowArc([0,.35,ZR(j)],[land[j][0],land[j][1],ZF],.6,{c:P.acc,n:4,r:.06,speed:1.8});
        if(ma>.6)R.ball([land[j][0],land[j][1],ZF],.08,{c:P.acc,a:k>=4?.25:1})}}
    // the value axis at the front
    if(k>=2){STS.ticks(R,X,[.5,.75,1],ZF+.35,1);STS.truth(R,X(mu),ZF-.6,ZF+.2,k>=3?1.75:.9,{a:1,text:k===2||k===3?'μ = '+mu.toFixed(3):null})}
    // 4. the means of 20,000 samples: a bell centred on μ, one standard error wide
    if(k>=3){const g=k===3?e:1,ha=k===3?1:.14;STS.hist(R,Hd.front,X,ZF,HF,{c:mix(P.paper,P.acc,.6),a:ha,grow:g,bw:.19});
      if(k===3){STS.bracket(R,X,mu,se,1.62,ZF,{a:e,text:'±1 SE = σ/√30 = '+se.toFixed(3)});R.label([X(1.2),.25,ZF],'20,000 means of 30',{al:'left',dx:8,mono:true,fs:12,c:P.mute,a:e,wide:1})}}
    // 5. what you actually have: one sample, its mean and its 95% interval, on the same axis as the faded bell
    if(k>=4){const a=e,r=B.x,m=mean(r),yi=.05,zi=ZF+.12;
      STS.row(R,r.map((_,i)=>xi(i)),r.map(v=>v*HS),ZY,{cols:cols(P,r),a,bw:.15});
      R.label([0,.75,ZY],'your sample · 22 cat, 5 dog, 3 sat',{mono:true,fs:12.5,c:P.ink,b:1,a});
      R.flowArc([0,.4,ZY],[X(m),yi+.1,zi],.5,{c:P.acc,n:5,r:.06,speed:1.6,a});
      R.box([(X(ci[0])+X(ci[1]))/2,yi,zi],[X(ci[1])-X(ci[0]),.06,.14],{fill:P.ink,a,shadow:false});
      [ci[0],ci[1]].forEach(v=>R.box([X(v),yi,zi],[.05,.22,.14],{fill:P.ink,a,shadow:false}));
      R.ball([X(m),yi+.1,zi],.11,{c:P.acc,a,top:1});
      R.label([X(m),yi+.1,zi],'mean '+m.toFixed(3),{dy:-18,mono:true,fs:12.5,b:1,c:P.acc,a});
      R.label([X(ci[1]),yi,zi],'95% interval ('+ci[0].toFixed(3)+', '+ci[1].toFixed(3)+')',{al:'left',dx:8,dy:2,mono:true,fs:12.5,b:1,c:P.ink,a})}
  }
  const full={cam:[.14,.68],bounds:[[-3.1,0,-2.9],[3.1,1.4,2.3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · samples of 30 words from the tiny model',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,26,10]:[18,84,26,16],
    view:k=>k===0?{cam:[.08,.45],bounds:[[-3.1,0,-3],[3.1,1.6,-2.1]]}:k===1?{cam:[.1,.6],bounds:[[-3.1,0,-3],[3.1,1.3,-1.5]]}:k===3?{cam:[.08,.36],bounds:[[-3,0,.6],[3,1.8,2.3]]}:k===4?{cam:[.08,.7],bounds:[[-3,0,-.3],[3,1,2.4]]}:null});
})();
