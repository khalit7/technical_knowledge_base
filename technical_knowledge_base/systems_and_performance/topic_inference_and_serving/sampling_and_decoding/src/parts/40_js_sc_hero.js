// ---- Scene, Fig. 1 (the idea): one real next-token distribution through the decoder (renderer v2) ----
// Qwen2.5-0.5B-Instruct, lighthouse story, second token (SD.LAB, story, position 2), run through the page's own sampler (25_js_sampler.js):
// logits, processors (none in this request), temperature 1.5 and softmax, min-p 0.1, renormalise, one seeded draw.
// Every height comes from SD.run; src/check_stages.mjs checks the numbers in the step list against window.SD_STG.hero.
(function(){
  if(!document.getElementById('stg-hero')||!window.SD||!SD.run||!window.S3)return;const {at,off,lerp,mix}=S3;
  const pos=SD.LAB.prompts.find(p=>p.k==='story').pos[1],E=SD.entries(pos),base={k:0,p:1,minp:0,typ:1,order:'first'};
  const R1=SD.run(E,Object.assign({},base,{T:1})),RT=SD.run(E,Object.assign({},base,{T:1.5})),RM=SD.run(E,Object.assign({},base,{T:1.5,minp:0.1}));
  const N=12,V=E.reduce((a,e)=>a+e.n,0),sum=(a,n)=>a.slice(0,n).reduce((x,y)=>x+y,0);
  const t1=1-sum(R1.pre,N),tT=1-sum(RT.pre,N);                 // the other tokens together, T 1 and T 1.5
  let keptTail=0;for(let i=N;i<E.length;i++)keptTail+=RT.pre[i]*RM.keep[i]/E[i].n;   // the tail's kept mass before renormalising
  const finTail=1-sum(RM.fin,N),thr=0.1*RT.pre[0],pick=+Object.keys(SD.draw(RM,1,7))[0];
  window.SD_STG=window.SD_STG||{};
  window.SD_STG.hero={V,top:E[0].t,l0:E[0].l,l12:E[N].l,p1:R1.pre[0],pT:RT.pre[0],tail1:t1,tailT:tT,thr,kept:RM.kept,mass:RM.mass,fin0:RM.fin[0],finTail,pick:E[pick].t,
    keptTop:RM.keep.slice(0,N).every(k=>k>0),topp:SD.run(E,Object.assign({},base,{T:1.5,p:0.9})).kept};
  const xs=i=>-3.6+i*.62,XT=4.55,WT=.95,ZL=-1.7,ZG=-.45,ZP=.85,YL=.3,SY=8;
  const lmax=E[0].l,lmin=9,hl=l=>.04+Math.max(0,l-lmin)/(lmax-lmin)*1.1;
  const nm=t=>t.replace(/^ /,'');
  function draw(R,k,e){const P=R.P,W=R.W;R.grid(-5,6.2,-2.8,2,.5);
    const blue=P.acc,grey=mix(P.paper,P.mute,.45);
    // 1. the logits on a plinth at the back; they recede once the probabilities exist
    const la=k<=1?1:.28;
    R.box([(xs(0)+XT+WT/2)/2-.05,YL-.05,ZL],[XT+WT/2-xs(0)+.6,.05,.5],{a:la,shadow:false});
    [xs(0)-.3,XT+WT/2+.2].forEach(x=>R.box([x,0,ZL],[.04,YL-.05,.04],{a:la*.9}));
    for(let i=0;i<N;i++){const h=hl(E[i].l);R.box([xs(i),YL,ZL],[.4,h,.3],{a:la,shadow:false});
      if(k===0&&i<3)R.label([xs(i),YL+h,ZL],E[i].l.toFixed(2),{mono:true,fs:12,dy:-10,c:P.ink})}
    R.box([XT,YL,ZL],[WT,.05,.3],{fill:grey,a:la,shadow:false});
    if(k<=1)R.label([XT,YL+.05,ZL],SD.fmtN(V-N)+' more',{fs:12,dy:-11,c:P.mute,a:la});
    if(k<=1)for(let i=0;i<N;i++){if(W<520&&i>=4)continue;R.label([xs(i),0,ZL+.3],nm(E[i].t),{mono:true,fs:12,dy:i%2?30:14,c:P.ink,a:la})}
    // 2. the processors (step 2) and the softmax with temperature (step 3) as one glass plate between the rows
    const ga=k===1?Math.min(1,e*1.6):k===2?1:k===3?off(k,e,3)*.6:0,gc=k===1?P.c4:blue;
    if(ga>.01){R.glass([xs(0)-.45,.04,ZG],[XT+WT/2-xs(0)+.9,0,0],[0,.95,0],{c:gc,a:ga*.75,nu:12,nv:2});
      R.label([xs(0)-.5,.5,ZG],k===1?'processors':'softmax(z / 1.5)',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:gc,a:ga,grp:'row'})}
    if(k===1){for(let i=0;i<N;i+=2)R.flowArc([xs(i),YL+hl(E[i].l)+.02,ZL],[xs(i),.6,ZG],.3,{c:P.c4,r:.05,n:4,speed:1.1,a:e});
      R.label([xs(N-1),.95,ZG],'no penalty, bias or mask here: logits unchanged',{al:'right',fs:12.5,b:1,dy:-12,c:P.c4,a:e,wide:1})}
    // 3. the probabilities on the floor at the front: T 1 first (ghost caps stay), then T 1.5; the tail block holds every other token
    const pa=k<2?0:k===2?Math.min(1,e*2.5):1,tw=k===2?Math.max(0,e*1.6-.6):1,mt=Math.min(1,tw);
    if(pa>.01){
      for(let i=0;i<N;i++){const p1=R1.pre[i],pT=RT.pre[i],pf=RM.fin[i];
        let p=lerp(p1,pT,mt);if(k===4)p=lerp(pT,pf,e);else if(k>=5)p=pf;
        const isPick=k===5&&i===pick;
        R.box([xs(i),0,ZP],[.42,Math.max(.012,p*SY),.42],{fill:mix(blue,P.paper,isPick?.0:.25),a:pa});
        if(k===2&&mt>.05&&i<6)R.box([xs(i),p1*SY,ZP],[.46,.012,.46],{fill:P.ink,a:.45*mt,shadow:false,edge:false});
        if(i<1){const f1=v=>(v*100).toFixed(1)+'%',lab=k===2&&mt<.5?f1(p1):k<=3?f1(pT):f1(k===4?lerp(pT,pf,e):pf);
          R.label([xs(i),p*SY,ZP],(k===2&&mt>.5&&i===0?'T 1: '+(p1*100).toFixed(1)+'% → ':'')+lab,{mono:true,fs:12.5,b:i===0,dy:-11,c:blue,a:pa})}}
      for(let i=0;i<N;i++){if(W<520&&i>=4)continue;R.label([xs(i),0,ZP+.25],nm(E[i].t),{mono:true,fs:12,dy:i%2?30:14,c:P.ink,a:pa})}
      // the tail: every other token together (77.3% of the mass at T 1.5); min-p cuts all but 10 of them
      const hT=lerp(t1,tT,mt)*SY,hK=keptTail*SY,hF=finTail*SY;
      if(k<=2)R.box([XT,0,ZP],[WT,hT,.6],{fill:grey,a:pa});
      else if(k===3){R.box([XT,0,ZP],[WT,hK,.6],{fill:mix(blue,P.paper,.45)});R.box([XT,hK,ZP],[WT,Math.max(.01,(hT-hK)*(1-e)),.6],{fill:grey,a:Math.max(.08,1-e),shadow:false})}
      else R.box([XT,0,ZP],[WT,k===4?lerp(hK,hF,e):hF,.6],{fill:mix(blue,P.paper,.45)});
      const tl=k<=2?'other '+SD.fmtN(V-N)+': '+SD.fmtP(lerp(t1,tT,mt)):k===3?'10 more kept':'10 more: '+SD.fmtP(k===4?lerp(keptTail,finTail,e):finTail);
      R.label([XT,k<=2?hT:k===3?hK:(k===4?lerp(hK,hF,e):hF),ZP],tl,{fs:12.5,b:1,dy:-11,c:k<=2?P.mute:blue,a:pa,al:'center'})}
    if(k===2)for(let i=0;i<N;i+=1){const p=lerp(R1.pre[i],RT.pre[i],mt);R.flowArc([xs(i),.6,ZG],[xs(i),p*SY+.03,ZP],.25,{c:blue,r:.045,n:Math.max(2,Math.round(2+p*40)),speed:1.1,a:.8})}
    if(k===2)R.flowArc([XT,.6,ZG],[XT,lerp(t1,tT,mt)*SY*.6,ZP],.3,{c:P.mute,r:.07,n:Math.round(4+lerp(t1,tT,mt)*14),speed:1.1});
    // 4. min-p: a cut at 0.1 times the top token's probability
    if(k===3){const y=thr*SY;R.glass([xs(0)-.35,y,ZP-.4],[xs(N-1)-xs(0)+.7,0,0],[0,0,.8],{c:P.c5,a:e*.55,nu:12,nv:1,th:.004});
      R.label([xs(0)-.4,y,ZP],'min-p cut 0.54%',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.c5,a:e,grp:'row'});
      R.label([xs(5),.75,ZP-.3],RM.kept+' of '+SD.fmtN(V)+' kept · top-p 0.9 would keep '+SD.fmtN(window.SD_STG.hero.topp),{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
    // 5. renormalise: the survivors are rescaled to sum to 1
    if(k===4)for(let i=0;i<N;i+=2)R.flowArc([XT,.2,ZP],[xs(i),lerp(RT.pre[i],RM.fin[i],e)*SY+.05,ZP],.5,{c:blue,r:.045,n:3,speed:1.2,a:.7});
    // 6. choose: one draw from the final distribution
    if(k===5){const p=RM.fin[pick]*SY,by=lerp(p+1.4,p+.12,Math.min(1,e*1.3));R.ball([xs(pick),by,ZP],.11,{c:P.good});R.glow([xs(pick),p+.1,ZP],.5,{c:P.good,a:e});
      R.label([xs(pick)+.3,p*.55,ZP],'drawn: "'+E[pick].t+'"',{fs:13,b:1,c:P.good,al:'left',dx:12,a:e})}
    if(k<=1)R.label([xs(0)-.5,YL+.3,ZL],'logits z',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink,grp:'row'});
    if(k>=2)R.label([xs(0)-.5,.25,ZP],k>=4?'renormalised':'probability',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:blue,grp:'row'})
  }
  const full={cam:[.32,.5],bounds:[[-4.1,0,-2.1],[5.3,2.4,1.4]]};  // per-step views below: close on the logits, tall for the tail's 77%, close on the cut
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one real distribution through the decoder',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[18,14,14,120],
    view:k=>k===0?{cam:[.3,.42],bounds:[[-4.1,0,-2.1],[5.3,1.5,-1.0]]}:k===1?{cam:[.32,.45],bounds:[[-4.1,0,-2.1],[5.3,1.5,.3]]}:k===2?{cam:[.32,.38],bounds:[[-4.1,0,-1.0],[5.3,6.3,1.4]]}:
      k===3?{cam:[.3,.3],bounds:[[-4.1,0,.3],[5.3,.8,1.4]]}:{cam:[.32,.38],bounds:[[-4.1,0,0],[5.3,2.0,1.4]]}});
})();
