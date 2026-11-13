// ---- Scene, Fig. 1 (the idea): one distribution, three things done with it, on the root's tiny model (renderer v2) ----
// Scores z = (2, 1, 0) become the bet p by softmax; it is scored by -ln p(sat); it is sampled through its CDF with u = 0.7;
// it is reshaped by a temperature (T = 2). Every height is computed here from z.
(function(){
  if(!document.getElementById('stg-hero')||!window.PMS)return;const {mix,lerp,at}=S3,NM=PMS.NM;
  const z=[2,1,0],sm=v=>{const m=Math.max(...v),e=v.map(x=>Math.exp(x-m)),s=e.reduce((a,b)=>a+b,0);return e.map(x=>x/s)};
  const p=sm(z),z2=z.map(v=>v/2),p2=sm(z2),loss=-Math.log(p[2]),U=.7,cdf=[0,p[0],p[0]+p[1],1];
  window.PM_HERO={p,p2,loss,cdf:cdf.slice(1)};
  const XS=[-1.7,0,1.7],ZS=2.1,ZG=1.05,ZP=0,ZC=3.15,SY=.55,PY=2.6,LY=.62,SX0=-2.4,SW=4.8;
  const sx=v=>SX0+SW*v;
  function draw(R,k,e){const P=R.P,cols=[0,1,2].map(i=>PMS.wc(P,i));R.grid(-4,4,-3.2,3.2,.5);
    // 1. the scores, on a plinth at the front (halved by the temperature at step 5)
    const zs=k===4?z.map((v,i)=>lerp(v,z2[i],e)):z,sa=k===0?1:k===1?1-.65*e:k===4?1:k===2?.1:.3;
    PMS.bars(R,XS,zs,{z:ZS,y:.25,s:SY,cols,a:sa,bw:.7,bd:.36,lab:v=>'z = '+(k===4?v.toFixed(e<1?2:1):String(v))});
    XS.forEach((x,i)=>R.label([x,0,ZS+.4],NM[i],{serif:true,fs:13.5,b:1,dy:14,c:cols[i],a:k===2?.15:Math.max(.45,sa)}));
    // 2. softmax as a glass plate between scores and bet; dots stream through it, as many as the probability each word gets
    const ga=k===0?0:k===1?e:k===4?1:k===2?0:.15,pp=k===4?p.map((v,i)=>lerp(v,p2[i],e)):p;
    if(ga>.01){R.glass([-2.65,.05,ZG],[5.3,0,0],[0,.6,0],{c:P.acc,a:ga*.7,nu:9,nv:2});R.label([-2.75,.35,ZG],k===4?'softmax(z / T)':'softmax: e^z / Σ e^z',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.acc,a:ga>.5?ga:0,grp:'row'})}
    if(k===1||k===4)XS.forEach((x,i)=>{const n=Math.max(2,Math.round(2+pp[i]*16));R.flowArc([x,.25+zs[i]*SY+.05,ZS],[x,pp[i]*PY+.05,ZP],.45,{c:cols[i],r:.06,n,speed:1.2,a:k===1?e:1})});
    // the bet: three probability bars that add to 1
    const pa=k===0?0:k===1?e:k===2?1:k===3?.3:1,al=k===2?[.18,.18,1]:[1,1,1];
    PMS.bars(R,XS,pp,{z:ZP,s:PY*(k===1?e:1),cols,a:pa,al,bw:.78,lab:v=>v.toFixed(3)});
    // (the bet's name is in the step list; a side label here would collide with the softmax label)
    // 3. score it: the truth was sat, so the loss is -ln p(sat), a column beside sat's bar
    if(k===2){const h=loss*LY*e;R.box([XS[2]+.75,0,ZP],[.42,Math.max(.01,h),.42],{fill:mix(P.bad,P.paper,.15)});
      R.label([XS[2]+.75,h,ZP],'−ln 0.090 = '+(loss*e).toFixed(3),{mono:true,fs:13,b:1,c:P.bad,dy:-10,a:e});
      R.label([XS[2],0,ZP+.4],'truth: sat',{fs:12.5,b:1,c:P.bad,dy:16,a:e})}
    // 4. draw from it: lay the bet end to end as the CDF strip; a uniform number u = 0.7 drops onto dog's slice
    const ca=k===3?e:0;
    if(ca>.01){for(let i=0;i<3;i++){const x0=sx(cdf[i]),x1=sx(cdf[i+1]);R.box([(x0+x1)/2,0,ZC],[x1-x0-.03,.09,.55],{fill:mix(cols[i],P.paper,.25),a:ca,shadow:false});
        R.flowArc([XS[i],pp[i]*PY*.5,ZP],[(x0+x1)/2,.12,ZC],.35,{c:cols[i],r:.05,n:Math.round(3+p[i]*10),a:ca*.9})}
      [[1,'0.665'],[2,'0.910']].forEach(([j,t])=>R.label([sx(cdf[j]),0,ZC+.3],t,{mono:true,fs:12,c:P.mute,dy:15,a:ca}));
      R.label([sx(0),0,ZC+.3],'0',{mono:true,fs:12,c:P.mute,dy:15,a:ca});R.label([sx(1),0,ZC+.3],'1',{mono:true,fs:12,c:P.mute,dy:15,a:ca});
      const by=lerp(1.7,.16,Math.min(1,e*1.2));R.ball([sx(U),by,ZC],.12,{c:P.ink,a:ca});
      R.line([[sx(U),1.75,ZC],[sx(U),.1,ZC]],{c:P.ink,w:1,a:ca*.35,dash:[3,3]});
      R.label([sx(U),1.75,ZC],'u = 0.7 → dog',{mono:true,fs:13,b:1,c:P.ink,dy:-10,a:ca})}
    if(k===4)R.label([XS[2]+.9,1.1,ZS],'T = 2',{mono:true,fs:13,b:1,c:P.acc,al:'left',dx:6,a:e})
  }
  const full={cam:[.4,.6],bounds:[[-2.9,0,-.6],[2.9,2.0,2.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the tiny model’s bet',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1400,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,14,120],
    view:k=>k===0?{cam:[.16,.42],bounds:[[-2.4,0,1.7],[2.4,1.6,2.6]]}:k===2?{cam:[.62,.45],bounds:[[.7,0,-.9],[3.2,1.8,.9]]}:k===3?{cam:[.3,.7],bounds:[[-2.9,0,-.4],[2.9,1.9,3.6]]}:full});
})();
