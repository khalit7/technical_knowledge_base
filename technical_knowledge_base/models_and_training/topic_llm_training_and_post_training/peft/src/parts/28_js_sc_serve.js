// ---- Scene (serving many adapters, Fig. 7): merged copies against one shared base with a small product per request, and S-LoRA's adapter pool (renderer v2) ----
// Five requests, each for a different adapter, in one batch (illustrative: the colours are adapters A to E); the throughputs written on the card are
// S-LoRA Table 3, setting S1 (Llama-7B, rank 8, one A100 80GB), from PF_DATA.slora.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-serve')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const T=PF_DATA.slora.filter(r=>r.s==='S1'),t5=T.find(r=>r.n===5),t2k=T.find(r=>r.n===2000),t100=T.find(r=>r.n===100);
  document.querySelectorAll('[data-sv2]').forEach(e=>{const k=e.dataset.sv2;e.textContent=k==='vp5'?t5.vp.toFixed(2):k==='sl5'?t5.sl.toFixed(2):k==='sl2k'?t2k.sl.toFixed(2):k==='pf100'?t100.pf.toFixed(2):''});
  const COL=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#e15759'],AD='ABCDE';
  const RY=i=>.4+i*.34,RX=-4.1,OX=3.7,BW=2.2,BH=1.9,BX=-1.0,SX=i=>-1.6+i*.42,SZ=1.55,PX=i=>.75+(i%8)*.4,PZ=j=>-2.0-j*.34;
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-3,2.6,.5);
    const cols=COL.map(c=>S3.rgb(c)),io=(i,z)=>[RX+.15,RY(i),z];
    // requests on the left, outputs on the right
    cols.forEach((c,i)=>{R.ball([RX,RY(i),.5],.11,{c});R.label([RX,RY(i),.5],'req '+(i+1)+' · '+AD[i],{mono:true,fs:12,al:'right',dx:-14,c,grp:'req'})});
    // 1. one merged copy per adapter: five full models, stacked in depth
    const ca=k===0?Math.min(1,e*1.5):k===1?1-e:0;
    if(ca>.01){cols.forEach((c,i)=>{const z=-i*.55;R.glass([BX-BW/2,.08,z],[BW,0,0],[0,BH,0],{c,a:ca*(i?.75:1),nu:6,nv:5});
        R.flowArc([RX+.15,RY(i),.5],[BX,.35+i*.3,z],.3,{c,a:ca,r:.05,speed:1.2,n:7})});
      R.label([BX,BH+.08,-2.2],'5 merged copies · '+t5.vp.toFixed(2)+' req/s · OOM at 100',{mono:true,fs:12.5,b:1,c:P.c2,a:k===1?Math.max(0,1-2.5*e):ca,dy:-12})}
    // 2. one shared base: the whole batch goes through one matmul
    const ba=k===0?0:k===1?e:1;
    if(ba>.01){R.glass([BX-BW/2,.08,0],[BW,0,0],[0,BH,0],{c:P.mute,a:ba,nu:6,nv:5});R.label([BX,BH+.08,0],'W₀ · one shared copy',{mono:true,fs:12.5,b:1,c:P.ink,a:k===1?Math.max(0,(e-.6)/.4):ba,dy:-12});
      cols.forEach((c,i)=>{const fb=ba*(k>=2?.4:1);R.flowArc([RX+.15,RY(i),.5],[BX,.35+i*.3,.02],.22,{c,a:fb,r:.05,speed:1.2,n:5});R.flowArc([BX,.35+i*.3,.02],[OX,RY(i),.5],.22,{c,a:fb,r:.05,speed:1.2,n:7});R.ball([OX,RY(i),.5],.09,{c,a:ba})})}
    // 3. each request's own small product x · A_i · B_i, in front of the base
    const sa=k<2?0:k===2?e:1;
    if(sa>.01){cols.forEach((c,i)=>{R.glass([SX(i)-.15,.1,SZ],[.3,0,0],[0,.3,0],{c,a:sa,nu:2,nv:2,th:.03});
        R.flowArc([RX+.15,RY(i),.5],[SX(i),.25,SZ],.15,{c,a:sa*.9,r:.04,speed:1.2,n:5});R.flowArc([SX(i),.25,SZ],[OX,RY(i),.5],.25,{c,a:sa*.9,r:.04,speed:1.2,n:7})});
      R.label([SX(0)-.2,.1,SZ+.1],'x · Aᵢ · Bᵢ per request',{mono:true,fs:12.5,b:1,al:'right',dx:-6,dy:12,c:P.acc,a:sa})}
    // 4. the adapter pool in host memory (right, behind); the running ones are paged onto the GPU, into one pool with the KV cache pages
    const pa=k<3?0:k===3?e:1;
    if(pa>.01){for(let j=0;j<3;j++)for(let i=0;i<8;i++){const on=j===0&&i<5;R.box([PX(i),0,PZ(j)],[.3,.05,.22],{fill:on?cols[i]:mix(P.paper,P.mute,.25),a:pa*(on?1:.85),shadow:false,lw:.5})}
      R.label([PX(3.5),.05,PZ(2)-.1],'adapter pool · host memory · 2,000',{mono:true,fs:12,dy:-14,c:P.ink,a:pa,wide:1});
      if(k===3)cols.forEach((c,i)=>R.flowArc([PX(i),.06,PZ(0)],[SX(i),.1,SZ],.7,{c,a:pa*.9,r:.04,speed:1,n:6}));
      for(let i=0;i<5;i++)R.box([.6,0,SZ-.5+i*.24],[.4,.1,.18],{fill:mix(P.paper,P.c5,.6),a:pa,shadow:i===0,lw:.5});
      R.label([.85,.1,SZ-.5],'KV cache pages',{mono:true,fs:12,al:'left',dx:8,c:P.c5,a:pa,wide:1});
      R.quad([[-1.95,.004,SZ-.7],[1.0,.004,SZ-.7],[1.0,.004,SZ+.35],[-1.95,.004,SZ+.35]],{ec:P.acc,ea:.7*pa,dash:[5,4],lw:1.2})}
    if(k===4){R.label([OX+.3,.05,SZ+.3],'2,000 adapters · '+t2k.sl.toFixed(2)+' req/s',{mono:true,fs:13,b:1,c:P.acc,a:e,al:'right',dy:-14});
      R.label([OX+.3,.05,SZ+.3],'5 adapters · '+t5.sl.toFixed(2)+' req/s',{mono:true,fs:12.5,c:P.ink,a:e,al:'right',dy:4})}
  }
  S3.stage({id:'stg-serve',list:'sx-serve',fig:'Fig. 8 · five requests, five adapters, one batch (illustrative)',cam:[.2,.62],bounds:[[-4.3,0,-2.8],[4.1,.6,2.0]],aspect:.44,dur:1500,hold:4800,draw,view:k=>k===0?{cam:[.25,.45],bounds:[[-4.3,0,-2.6],[1.2,2.2,1]]}:null,
    margin:w=>w<520?[16,10,14,10]:[24,26,18,110]});
})();
