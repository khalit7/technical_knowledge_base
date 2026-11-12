// ---- Scene, Fig. 3 (section 3): what one training step of Llama 3.1 8B holds on an H100, stacked by kind (renderer v2).
// Model state: 16 bytes per parameter (BF16 weight 2, BF16 gradient 2, FP32 master 4, Adam m 4 and v 4; ZeRO's 2 + 2 + 12) of l8_P parameters;
// sharded over 8 GPUs (FSDP, ZeRO-3). Activations: the counted per-layer bytes of one 8,192-token sequence from window.PMA.memAnim (the same
// engine the FLOP and memory ledger tab uses; check_page.mjs checks it against recompute.py) under FlashAttention, plain attention and full
// recomputation, plus the FP32 logits. Heights are to scale (1 unit = 20 GB; the H100's 80 GB is the glass lid at 4 units); positions are illustrative.
(function(){
  if(!document.getElementById('stg-mem')||!window.PMA||!window.PMD)return;const {at,off,mix,lerp,cl}=S3;
  const D=window.PMD,A=window.PMA,G=1e9,NPm=D.l8_P,HU=1/20,CAP=80;
  const run={flash:A.memAnim('flash'),eager:A.memAnim('eager'),ckpt:A.memAnim('ckpt')};
  const lay=m=>run[m].steps[1].act,post=run.flash.steps[33].post,ST=run.flash.states,ckL=A.actLayerTok(window.CALCX.M.l8,8192,'flash')*8192;
  const KINDS=[['weights BF16',2,'c1',.5],['gradients BF16',2,'c4',.5],['master FP32',4,'c3',.35],['Adam m FP32',4,'c3',.55],['Adam v FP32',4,'c3',.75]];
  const n=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  window.PM_MEM={state:16*NPm,shard:ST,layer:{flash:lay('flash'),eager:lay('eager'),ckpt:lay('ckpt')},post,peak:{flash:run.flash.peak,eager:run.eager.peak,ckpt:run.ckpt.peak},
    rec:ckL,time:{flash:run.flash.total_fl/(989.5e12*.4),eager:run.eager.total_fl/(989.5e12*.4),ckpt:run.ckpt.total_fl/(989.5e12*.4)},hfu:run.ckpt.total_fl/run.flash.total_fl}; // checked by check/check_stages.mjs
  const GP=[];for(let j=0;j<2;j++)for(let i=0;i<4;i++)GP.push([-3.3+i*2.2,0,-1.1+j*2.2]);const G0=GP[4],TW=1.4;
  function gpu(R,c,a,lid){const P=R.P;R.box(c,[TW+.2,.05,TW+.2],{fill:mix(P.paper,P.ink,.1),a,dz:50});
    if(lid>.01){const y=.05+CAP*HU,x0=c[0]-TW/2,x1=c[0]+TW/2,z0=c[2]-TW/2,z1=c[2]+TW/2;
      if(lid>.5)R.glass([x0,y,z0],[TW,0,0],[0,0,TW],{c:P.bad,a:lid*a,nu:4,nv:4,th:.02});
      R.line([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y,z0]],{c:P.bad,w:1.4,dash:[5,4],a:Math.min(1,lid*a*1.4),top:lid>.5});
      [[x0,z0],[x1,z0],[x1,z1],[x0,z1]].forEach(([x,z])=>R.line([[x,.05,z],[x,y,z]],{c:P.bad,w:1,dash:[4,4],a:lid*a*.6}))}}
  // a stack of [bytes, colour] from the board up; returns the top
  function stack(R,c,parts,a,w){let y=.05;w=w||TW*.9;parts.forEach(([b,col,al])=>{const hh=b/G*HU;if(hh>.0015)R.box([c[0],y,c[2]],[w,hh,w],{fill:col,a:a*(al==null?1:al),shadow:false,lw:.5});y+=hh});return y}
  function state(P,scale){return KINDS.map(([nm,b,c,t])=>[b*NPm*scale,mix(P.paper,P[c],t)])}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{})),cAct=mix(P.paper,P.c6,.55),cSc=mix(P.paper,P.c5,.6),cLg=mix(P.paper,P.c2,.6),cRc=mix(P.paper,P.c4,.6);
    R.grid(-5,5,-3,3,.5);
    const others=k===1?e:k===0?0:.25,lidA=1;
    GP.forEach((c,i)=>{const me=i===4;gpu(R,c,me?1:others,me?lidA:k===1?.45*e:0)});
    lab([G0[0]+TW/2,.05+CAP*HU,G0[2]-TW/2],'H100 · 80 GB',{al:'left',dx:8,fs:12,c:P.bad,b:1,grp:'cap'});
    // 1. the whole model state on one GPU; 2. sharded over 8
    if(k<=1){const sc=k===0?1:lerp(1,1/8,e),top=stack(R,G0,state(P,sc),1);
      if(k===0){KINDS.forEach(([nm,b],i)=>{const y0=.05+KINDS.slice(0,i).reduce((s,x)=>s+x[1],0)*NPm/G*HU;lab([G0[0]-TW/2,y0+b*NPm/G*HU/2,G0[2]+TW/2],nm+' · '+b+' B',{al:'right',dx:-10,fs:12,grp:'kind',a:e})});
        lab([G0[0],top,G0[2]],n(16*NPm/G,1)+' GB · 16 bytes per parameter',{dy:-14,b:1,a:e})}
      if(k===1){GP.forEach((c,i)=>{if(i===4)return;stack(R,c,state(P,1/8),e);R.flowArc([G0[0],top+.1,G0[2]],[c[0],ST/G*HU+.1,c[2]],.9,{c:P.c3,a:e*(1-e*.5),r:.06,n:5,speed:1.5})});
        lab([GP[1][0],ST/G*HU,GP[1][2]],n(ST/G,1)+' GB per GPU',{dy:-16,b:1,a:e})}}
    // 3 to 6: one GPU's activations through the step
    const sh=state(P,1/8);
    if(k>=2){const mode=k===4?'eager':k===5?'ckpt':'flash',L=lay(mode),parts=sh.map(x=>[x[0],x[1],.75]);let nl=0,lg=0,rc=0;
      if(k===2||k===4){nl=Math.floor(cl(e*1.15,0,1)*32);lg=e>.93?post:0}
      else if(k===3){const r=Math.floor(e*33);lg=r===0?post:0;nl=32-Math.max(0,r-1)}
      else{nl=32;lg=e<.5?post:0;rc=e>=.5?ckL:0}
      for(let i=0;i<nl;i++){if(mode==='eager'){const sc=L-lay('flash');parts.push([lay('flash'),cAct]);parts.push([sc,cSc,.9])}else parts.push([L,cAct])}
      if(lg)parts.push([lg,cLg]);if(rc)parts.push([rc,cRc]);
      const top=stack(R,G0,parts,1),held=parts.reduce((s,x)=>s+x[0],0);
      // writes going up during forward, reads coming down during backward, the saved input feeding the recomputed layer
      const fl=(a,b,c)=>R.flow([[G0[0]+.55,a,G0[2]+.55],[G0[0]+.55,b,G0[2]+.55]],{c,r:.06,n:6,speed:1.5});
      if(k===2||k===4)fl(.1,top+.15,P.c6);if(k===3)fl(top+.15,.1,P.c4);if(k===5&&rc)R.flowArc([G0[0]-.5,(ST+lay('ckpt')*16)/G*HU,G0[2]+.5],[G0[0]-.1,top,G0[2]+.4],.25,{c:P.c4,r:.06,n:6,speed:1.2});
      lab([G0[0]+TW/2,top,G0[2]-TW/2],n(held/G,held<100*G?1:0)+' GB held',{al:'left',dx:10,b:1,c:held>CAP*G?P.bad:P.ink,grp:'cap'});
      lab([G0[0]-TW/2,.05+ST/G*HU/2,G0[2]+TW/2],'model state '+n(ST/G,1)+' GB',{al:'right',dx:-10,fs:12,grp:'kind'});
      if(nl)lab([G0[0]-TW/2,.05+(ST+nl*L/2)/G*HU,G0[2]+TW/2],k===5?'saved layer inputs':'activations, '+nl+' layers',{al:'right',dx:-10,fs:12,c:P.c6,grp:'kind'});
      if(lg&&k!==4)lab([G0[0]+TW/2,top-lg/G*HU/2,G0[2]+TW/2],'logits FP32 '+n(lg/G,2)+' GB',{al:'left',dx:10,fs:12,c:P.c2,grp:'side'});
      if(rc)lab([G0[0]+TW/2,top-rc/G*HU/2,G0[2]+TW/2],'layer being recomputed',{al:'left',dx:10,fs:12,c:P.c4,grp:'side'});
      if(k===4&&nl>8)lab([G0[0]+TW/2,.05+(ST+nl*L*.6)/G*HU,G0[2]+TW/2],'score matrices',{al:'left',dx:10,fs:12,c:P.c5,grp:'side'})}
  }
  const close={cam:[.5,.5],bounds:[[-2.6,0,-.4],[-.1,4.4,2.2]]};
  const views=[{cam:[.5,.42],bounds:[[-2.8,0,-.4],[-.1,6.6,2.2]]},{cam:[.42,.62],bounds:[[-4.4,0,-2],[4.4,2.2,2]]},close,close,
    {cam:[.5,.22],bounds:[[-6,0,-.4],[3.5,24.6,2.2]]},close];
  const st=S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 3 · what one training step holds, Llama 3.1 8B',cam:views[1].cam,bounds:views[1].bounds,aspect:.66,dur:2600,hold:5400,draw,
    view:k=>views[k]||views[1],margin:w=>w<520?[16,10,16,10]:[26,24,26,24]});
  (window.PMSTG=window.PMSTG||{})['stg-mem']=st;
})();
