// ---- Scene: Fig. 2, one edit travelling from the source to the index while the old text is still served (renderer v2).
// Driven by the freshness calculator beside it (section 2): polling interval, documents queued ahead, the embedding model's
// measured throughput and the store's visibility delay; the times on the labels are the calculator's (detect = half the interval,
// queue = documents ÷ throughput, embed = 1 ÷ throughput). Positions and sizes are layout only; the last step's column is to scale. ----
(function(){
  if(!document.getElementById('stg-fresh')||!document.getElementById('prd-fr-p'))return;const {at,off,lerp,mix}=S3;
  const $=id=>document.getElementById(id);
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const h=s=>s<1?fmt(s*1000,0)+' ms':s<120?fmt(s,s<10?1:0)+' s':s<7200?fmt(s/60,1)+' min':fmt(s/3600,1)+' h';
  function vals(){const pm=+$('prd-fr-p').value,q=+$('prd-fr-q').value,r=+$('prd-fr-m').value,v=+$('prd-fr-v').value,det=pm*60/2,queue=q/r,emb=1/r;
    return {pm,q,r,v,det,queue,emb,tot:det+queue+emb+v}}
  const XS=-4.4,XD=-2.4,XQ=-.3,XE=1.7,XI=3.6,ZF=1.7;
  function draw(R,k,e){const P=R.P,V=vals();R.grid(-5.6,5.4,-1.8,2.6,.5);
    const NEW=P.c2,OLD=P.mute;
    // the source: the edited document (v2)
    R.box([XS,0,0],[1.0,.5,.75],{fill:mix(P.paper,NEW,k===0?.15+.35*e:.5)});
    if(k<4)R.label([XS,.5,0],k===0?'09:00 · policy edited (v2)':'source · v2',{fs:12.5,b:1,dy:-12,c:k===0?NEW:P.ink});
    // detect: a glass plate the change waits at until the next poll (or passes at once with a webhook or CDC)
    const da=k===1?1:k===0?.15:.4;
    R.glass([XD-.5,0,-.4],[1.0,0,0],[0,.9,0],{c:P.c1,a:da,nu:4,nv:4});
    if(k===1){R.flowArc([XS+.5,.45,0],[XD-.5,.45,-.4],.35,{c:NEW,a:e,n:4,speed:V.pm?.35:1.6});
      R.label([XD,.9,-.4],V.pm?'poll every '+V.pm+' min':'pushed: webhook or CDC',{fs:12.5,b:1,dy:-12,c:P.c1});
      R.label([XD,0,.2],'detect · '+h(V.det)+(V.pm?' on average':''),{fs:12.5,mono:true,dy:16,c:P.c1,a:e})}
    else if(k>1&&k<4)R.label([XD,.9,-.4],'detect '+h(V.det),{fs:12,mono:true,dy:-10,c:P.c1,a:.8,wide:1});
    // the queue: one slab per 500 documents ahead (at most 40 drawn), the edit waiting on top
    const ns=Math.min(40,Math.ceil(V.q/500)),qa=k===2?1:k<2?.18:.4,sh=.06;
    for(let i=0;i<ns;i++)R.box([XQ,i*sh,0],[.95,sh*.8,.7],{fill:mix(P.paper,P.c4,.35),a:qa,shadow:i===0,lw:.5});
    const topY=ns*sh;
    R.box([XQ,topY+(k===2?.25*(1-e):0),0],[.95,.1,.7],{fill:NEW,a:k<2?0:k===2?e:k===3?1-e:0,shadow:false});
    if(k===2){R.flowArc([XD+.5,.45,-.4],[XQ,topY+.2,0],.35,{c:NEW,a:e,n:4,speed:1.2});
      if(ns)R.flow([[XQ+.5,.15,0],[XE-.5,.15,0]],{c:P.c4,a:e,n:6,speed:Math.min(2.5,.3+V.r/100)});
      R.label([XQ,topY+.12,0],V.q?V.q.toLocaleString('en-US')+' documents ahead':'nothing queued',{fs:12.5,b:1,dy:-14,c:P.c4});
      R.label([XQ,0,.45],'queue · '+(V.q?V.q.toLocaleString('en-US')+' ÷ '+V.r+' docs/s = ':'')+h(V.queue),{fs:12.5,mono:true,dy:16,c:P.c4,a:e})}
    else if(k===3)R.label([XQ,topY,0],'queue '+h(V.queue),{fs:12,mono:true,dy:-10,c:P.c4,a:.8,wide:1});
    // embed: the model as a glass plate; the edit passes through it into the index
    const ea=k===3?1:k<3?.18:.4;
    R.glass([XE,0,-.45],[0,0,.9],[0,.9,0],{c:P.c1,a:ea,nu:5,nv:5});
    if(k===3){R.flowArc([XQ+.5,topY,0],[XE,.5,0],.3,{c:NEW,a:1-e*.3,n:4,speed:1.4});R.flowArc([XE,.5,0],[XI-.5,.45,0],.3,{c:NEW,a:e,n:5,speed:1.4});
      R.label([XE,.9,0],'embed one document · '+h(V.emb),{fs:12.5,mono:true,dy:-12,c:P.c1})}
    // the index: one chunk row that holds v1 until the write, v2 after
    R.glass([XI-.6,.02,-.5],[1.2,0,0],[0,0,1.0],{c:P.c1,a:.8,nu:6,nv:4});
    for(let j=0;j<6;j++){const mine=j===2,cv=mine?(k<3?OLD:k===3?mix(OLD,NEW,e):NEW):P.c1;R.box([XI-.45+j*.18,.03,0],[.08,mine?.7:.5,.08],{fill:cv,a:.95,shadow:false})}
    if(k!==1&&k!==2)R.label([XI,.75,0],k<3?'index · still v1':k===3?'written, not yet visible':'index · v2',{fs:12.5,b:1,dy:-12,c:k<3?P.bad:k===3?P.mute:P.good});
    // the reader: a question answered from the index, from the old text until the new one is visible
    R.box([XI,0,ZF],[1.0,.3,.6],{fill:P.paper});
    const fresh=k===4,fc=fresh?P.good:P.bad;
    const mid=k===1||k===2;
    R.flowArc([XI,.4,.4],[XI,.3,ZF-.3],.35,{c:fc,a:fresh?e:mid?.3:1,n:5,speed:1.1});
    if(!mid)R.label([XI,0,ZF+.3],fresh?'answer quotes v2 · '+h(V.v)+' after the write':'answer quotes v1, with a citation',{fs:12.5,dy:16,c:fc,b:1});
    // the lag, to scale: one column with a band per term, the largest term sets the height
    if(k===4){const parts=[['detect',V.det,P.c1],['queue',V.queue,P.c4],['embed',V.emb,P.c3],['visible',V.v,P.c5]],H=1.7,XL=-4.2,ZL=2.0;let y=0;
      parts.forEach(([n,t,c])=>{const hh=V.tot>0?H*t/V.tot*e:0;if(hh>.001)R.box([XL,.25+y,ZL],[.55,hh,.45],{fill:c,a:.95,shadow:false});
        R.label([XL+.3,.25+y+hh/2,ZL],n+' '+h(t),{al:'left',dx:8,fs:12.5,mono:true,c,grp:'lag',a:e});y+=hh});
      R.box([XL,0,ZL],[.7,.25,.6],{fill:P.paper,a:e});R.label([XL,0,ZL+.3],'lag ≈ '+h(V.tot),{fs:13,b:1,dy:16,a:e})}
  }
  const full={cam:[.3,.62],bounds:[[-5.0,0,-.9],[4.4,1.4,2.1]]};
  const st=S3.stage({id:'stg-fresh',list:'sx-fresh',fig:'Fig. 2 · one edit on its way to the index',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,12,8]:[26,18,26,18],
    // the camera moves in on the station each step is about, then pulls back for the whole lag
    view:k=>k===0?{cam:[.25,.62],bounds:[[-5.0,0,-.9],[4.4,1.0,2.1]]}:k===1?{cam:[.35,.55],bounds:[[-5.0,0,-.8],[.2,1.2,1.0]]}:k===2?{cam:[.3,.5],bounds:[[-3.0,0,-.8],[2.4,1.9,1.0]]}:k===3?{cam:[.3,.55],bounds:[[-.9,0,-.8],[4.4,1.3,2.2]]}:{cam:[.3,.5],bounds:[[-5.0,0,-.9],[4.4,1.9,2.6]]}});
  if(st)['prd-fr-p','prd-fr-q','prd-fr-m','prd-fr-v'].forEach(id=>{$(id).addEventListener('input',()=>st.draw());$(id).addEventListener('change',()=>st.draw())});
})();
