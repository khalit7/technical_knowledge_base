// ---- Scene (How a batch becomes one number, Fig. 1): per-token losses of a real padded batch, two ways to average them (renderer v2) ----
// LT.batch (src/real_tokens.py via mk_data.py): SmolLM2-135M's cross entropy on every token of four public-domain opening sentences,
// padded to the longest. Rows in depth are the sentences, columns the token positions, height the token's loss; padding tiles are grey.
// The per-token mean (what torch's cross_entropy with ignore_index=-100 returns on the padded batch, checked in real_tokens.py) against
// the mean of the four sentence means (what averaging per micro-batch of one sentence gives). Step-list numbers are static spans (data-bt).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-bt')||!window.S3||!window.LT)return;const {at,off,lerp,mix}=S3;
  const B=LT.batch,RW=B.rows,NR=RW.length,NP=B.padded_length-1,NT=RW.reduce((a,r)=>a+r.ce.length,0);
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,RM=RW.map(r=>mean(r.ce)),MT=RW.reduce((a,r)=>a+r.ce.reduce((x,y)=>x+y,0),0)/NT,MS=mean(RM);
  const short=r=>{const w=r.text.split(' ');return '"'+w.slice(0,3).join(' ')+(w.length>3?' …"':'"')};
  const pc=v=>(100*v).toFixed(1)+'%',F={T:String(B.padded_length),N:String(NT),mt:MT.toFixed(2),ms:MS.toFixed(2),wt:pc(1/NT),
    hi:Math.max(...RW[0].ce).toFixed(2),hit:RW[0].tokens[1+RW[0].ce.indexOf(Math.max(...RW[0].ce))].trim()};
  F.ratio=Math.round(100*(MS/MT-1))+'%';
  RW.forEach((r,i)=>{F['n'+i]=String(r.ce.length);F['m'+i]=RM[i].toFixed(2);F['w'+i]=pc(1/(NR*r.ce.length))});
  document.querySelectorAll('[data-bt]').forEach(e=>{e.textContent=F[e.dataset.bt]!=null?F[e.dataset.bt]:'?'});
  window.BTT=F;
  const XS=.3,x=j=>(j-(NP-1)/2)*XS,ZR=i=>(i-(NR-1)/2)*1.0-.5,cmax=Math.max(...RW.map(r=>Math.max(...r.ce))),HC=1.8/cmax;
  const XM=x(NP-1)+.8,XT1=-1.3,XT2=1.3,ZT=2.6,WT=.9;
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-4.4,5,-2.6,3.4,.5);
    // four sentences, four colours; the two averages get colours of their own (ink and the warning orange)
    const RC=[P.c1,P.c3,P.c4,P.c6],padA=k===0?1:k===1?lerp(1,.15,e):.15;
    const fieldA=k===4?.45:k>=5?.08:1,rowA=k>=5?0:1,MC=P.bad;
    for(let i=0;i<NR;i++){const r=RW[i],z=ZR(i),n=r.ce.length;
      for(let j=0;j<NP;j++){if(j<n){const h=Math.max(.015,r.ce[j]*HC);R.box([x(j),0,z],[XS*.72,h,.5],{fill:mix(P.paper,RC[i],.55),a:fieldA,shadow:false,lw:.45})}
        else R.box([x(j),0,z],[XS*.72,.02,.5],{fill:mix(P.paper,P.mute,.45),a:padA*fieldA,shadow:false,lw:.4,ea:.5})}
      if(k<5)R.label([x(0)-.3,.1,z],short(r),{fs:12.5,al:'right',dx:-6,c:RC[i],b:1,grp:'row',a:Math.max(.6,fieldA)});
      if(k===1)R.label([x(n-1)+.2,.05,z],n+' tokens',{mono:true,fs:12,al:'left',dx:6,c:P.ink,a:e})}
    // the highest loss in the batch: " Ishmael" after "Call me"
    if(k===0){const j=RW[0].ce.indexOf(Math.max(...RW[0].ce));R.label([x(j),RW[0].ce[j]*HC,ZR(0)],F.hit+' · '+F.hi+' nats',{mono:true,fs:12.5,b:1,al:'left',dx:8,dy:-8,c:RC[0]})}
    // the per-token mean: every real token streams into one bar in front, each with weight 1/N
    const tA=at(k,e,2);
    if(tA>0){R.box([XT1,0,ZT],[WT,MT*HC,WT],{fill:mix(P.paper,P.ink,.75),a:tA,lw:.6});if(k<5&&!narrow)R.label([XT1,MT*HC,ZT],'per token '+F.mt,{mono:true,fs:12.5,b:1,dy:-26,c:P.ink,a:tA});
      if(k===2)for(let i=0;i<NR;i++){const r=RW[i];for(let j=0;j<r.ce.length;j+=2)R.flowArc([x(j),r.ce[j]*HC+.03,ZR(i)],[XT1,MT*HC,ZT],.7,{c:RC[i],a:e*.75,r:.045,n:3,speed:1.3})}}
    // the sentence means at the end of each row, then their mean in front
    const mA=at(k,e,3);
    if(mA>0)for(let i=0;i<NR;i++){const z=ZR(i),h=RM[i]*HC;R.box([XM,0,z],[.5,h,.5],{fill:RC[i],a:mA*rowA,lw:.6});
      R.label([XM,h,z],F['m'+i],{mono:true,fs:12,al:'left',dx:14,dy:-4,c:RC[i],b:1,a:mA*rowA,grp:'rm'});
      if(k===3){const r=RW[i];R.flow([[x(0),.12,z],[x(r.ce.length-1),.12,z],[XM-.3,.12,z]],{c:RC[i],a:e*.85,r:.055,n:Math.max(3,Math.round(r.ce.length/2)),speed:1.4})}}
    const sA=at(k,e,4);
    if(sA>0){R.box([XT2,0,ZT],[WT,MS*HC,WT],{fill:MC,a:sA,lw:.6});if(k<5&&!narrow)R.label([XT2,MS*HC,ZT],'mean of means '+F.ms,{mono:true,fs:12.5,b:1,dy:-26,c:MC,a:sA});
      if(k===4)for(let i=0;i<NR;i++)R.flowArc([XM,RM[i]*HC+.03,ZR(i)],[XT2,MS*HC,ZT],.5,{c:RC[i],a:e,r:.08,n:7,speed:1})}
    if(k<5&&narrow){if(tA>0)R.label([XT1,0,ZT+WT/2],F.mt,{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a:tA});if(sA>0)R.label([XT2,0,ZT+WT/2],F.ms,{mono:true,fs:12.5,b:1,dy:14,c:MC,a:sA})}
    if(k===5){R.label([XT1,0,ZT+WT/2],'per token '+F.mt,{mono:true,fs:13,b:1,dy:16,c:P.ink});R.label([XT1,0,ZT+WT/2],'sum ÷ all '+F.N+' tokens',{mono:true,fs:12,dy:32,c:P.ink});
      R.label([XT2,0,ZT+WT/2],'mean of means '+F.ms,{mono:true,fs:13,b:1,dy:16,c:MC});R.label([XT2,0,ZT+WT/2],'one mean per micro-batch',{mono:true,fs:12,dy:32,c:MC})}
  }
  const full={cam:[.22,.7],bounds:[[-4.2,0,-2.1],[5.3,1.9,3.2]]};
  S3.stage({id:'stg-bt',list:'sx-bt',fig:'Fig. 1 · a real padded batch, SmolLM2-135M',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1700,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[24,16,14,150],
    view:k=>k===5?{cam:[.1,.42],bounds:[[-2.6,0,2],[2.6,.8,3.2]]}:full});
})();
