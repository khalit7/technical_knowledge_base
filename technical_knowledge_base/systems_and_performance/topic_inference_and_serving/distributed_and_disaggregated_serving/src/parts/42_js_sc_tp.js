// ---- Scenes, sections 3 and 4 (Fig. 3a tensor parallel, Fig. 3b pipeline parallel): the running example's 80 layers as eight glass slabs of ten,
// one server's eight H200s. Every number from window.DDC (recompute.py, the Capacity planner's step()): weights per GPU, step times at TP 1, TP 8, PP 8,
// bytes per all-reduce and per token, link speeds (NVLink 4 and a 400 Gb/s card, one direction); Llama 3.1 405B's 126 layers from DDC.kvmods. ----
(function(){
  if(!window.DDS||!window.DDC||!document.getElementById('stg-tp'))return;const {mix,lerp}=S3,{vis,gpu,lab,f0,f1}=DDS,C=window.DDC;
  const row=(k,n,B)=>C.steps.find(r=>r.kind===k&&r.n===n&&r.B===B),t1=row('tp',1,1),t8=row('tp',8,1),p8=row('pp',8,1),p64=row('pp',8,64);
  const bw=k=>C.links.find(l=>l.k===k).Bps/1e9,L405=C.kvmods.find(m=>m.k==='l405').L;
  const N={w1:f1(t1.w_gpu_gb),w8:f1(t8.w_gpu_gb),t1:f1(t1.t_ms),t8:f1(t8.t_ms),sp:f1(t1.t_ms/t8.t_ms),ar:f0(C.tp_bytes['8'].per_allreduce_sent/1024),tok:(C.tp_bytes['8'].per_token_sent/1e6).toFixed(2),
    nar:C.tp_bytes['8'].allreduces,comm:f1(t8.comm_ms),m1:f1(t1.mem_ms),m8:f1(t8.mem_ms),p8:f1(p8.t_ms),p64:f1(p64.t_ms),tps:f0(64*1000/p64.t_ms),nvl:f0(bw('nvl')),nic:f0(bw('nic400')),ratio:f0(bw('nvl')/bw('nic400')),L405};
  window.DD_TP=N; // checked by check_stages.mjs against the step lists
  const XG=g=>-5.25+1.5*g,GS=[1.25,.2,1.0],Y=j=>.32+j*.14,SD=.78;
  const slab=(R,x0,x1,j,c,a,z)=>R.glass([x0,Y(j),(z||0)-SD/2],[x1-x0,0,0],[0,0,SD],{c,a,nu:2,nv:2,th:.035});
  function server(R,z,a,hl){for(let g=0;g<8;g++)gpu(R,[XG(g),0,z],GS,{a,hl:hl&&hl(g)})}
  // ---- Fig. 3a: tensor parallel ----
  function drawTP(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-6.5,9,-3.4,1.8,.5);
    const two=v(q=>q===4);server(R,0,1);for(let g=0;g<8;g++)lab(R,[XG(g),0,.5],'GPU '+g,{dy:14,fs:12,c:P.mute,a:g===0||g===7?1:0,wide:g>0&&g<7?1:0});
    let a=v(q=>q===0);
    if(a>0){for(let j=0;j<8;j++)slab(R,XG(0)-.55,XG(0)+.55,j,P.c1,a);lab(R,[XG(0)+.6,Y(7),0],'all 80 layers · '+N.w1+' GB',{al:'left',dx:10,b:1,c:P.c1,fs:13,a});lab(R,[XG(0)+.6,Y(7),0],N.t1+' ms per token',{al:'left',dx:10,dy:18,c:P.mute,fs:12,a})}
    a=v(q=>q>=1);
    if(a>0){for(let j=0;j<8;j++)for(let g=0;g<8;g++)slab(R,XG(g)-.74,XG(g)+.74,j,P.c1,a*(k===3?.55:1));
      for(let g=0;g<8;g++)R.box([XG(g),GS[1],.42],[.3,.14,.14],{fill:mix(P.paper,P.c4,.7),a:a*v(q=>q===1||q===2),shadow:false,lw:.6});
      if(k===1){const a1=v(q=>q===1);lab(R,[XG(7)+.75,Y(7),0],'1/8 of every layer · '+N.w8+' GB',{al:'left',dx:10,b:1,c:P.c1,fs:13,a:a1,wide:1});lab(R,[XG(7)+.2,.3,.42],'1 of 8 KV heads',{al:'left',dx:12,dy:6,b:1,c:P.c4,fs:12.5,a:a1})}}
    a=v(q=>q===2||q===4);
    if(a>0)[7,4,1].forEach((j,i)=>{const y=Y(j)+.08;R.flow([[XG(0),y,.15],[XG(7),y,.15]],{c:P.c2,a:a*(i?.55:1),r:.07,speed:1.6,top:i===0});R.flow([[XG(7),y,-.15],[XG(0),y,-.15]],{c:P.c2,a:a*(i?.55:1),r:.07,speed:1.6,top:i===0})});
    if(k===2){const a2=v(q=>q===2);lab(R,[XG(7)+.75,Y(7)+.08,0],N.ar+' KiB per all-reduce',{al:'left',dx:10,b:1,c:P.c2,fs:13,a:a2,wide:1});lab(R,[XG(7)+.75,Y(7)+.08,0],N.nar+' per token · '+N.tok+' MB',{al:'left',dx:10,dy:18,c:P.mute,fs:12,a:a2,wide:1})}
    // step 4: one token's time, to scale (0.07 units per ms), one GPU against TP 8
    a=v(q=>q===3);
    if(a>0){const s=.1,bar=(x,segs,name,tot)=>{let y=0;segs.forEach(([ms,c])=>{const h=ms*s*(k===3?e:1);R.box([x,y,-.2],[.7,h,.7],{fill:mix(P.paper,c,.7),a,lw:.7,shadow:y===0});y+=h});
        lab(R,[x,y,-.2],tot+' ms',{dy:-12,b:1,fs:13.5,a});lab(R,[x,0,.15],name,{dy:16,fs:12.5,b:1,a})};
      bar(7.2,[[t1.ovh_ms,P.mute],[t1.mem_ms,P.c1]],'1 GPU',N.t1);bar(8.6,[[t8.ovh_ms,P.mute],[t8.mem_ms,P.c1],[t8.comm_ms,P.c2]],'TP 8',N.t8);
      lab(R,[9.0,t8.ovh_ms*s+t8.mem_ms*s+t8.comm_ms*s/2,-.2],'all-reduces '+N.comm+' ms',{al:'left',dx:8,fs:12,c:P.c2,a,wide:1});lab(R,[9.0,t8.ovh_ms*s+t8.mem_ms*s/2,-.2],'reading '+N.m8+' ms',{al:'left',dx:8,fs:12,c:P.c1,a,wide:1});lab(R,[9.0,t8.ovh_ms*s/2,-.2],'fixed 2.5 ms',{al:'left',dx:8,fs:12,c:P.mute,a,wide:1});
      lab(R,[6.8,t1.ovh_ms*s+t1.mem_ms*s/2,-.2],'reading '+N.m1+' ms',{al:'right',dx:-8,fs:12,c:P.c1,a,wide:1});lab(R,[8.6,(t8.ovh_ms+t8.mem_ms+t8.comm_ms)*s,-.2],N.sp+' times faster, not 8',{dy:-32,b:1,c:P.acc,fs:13,a})}
    // step 5: a second server behind; NVLink inside each, one network card between them
    a=two;
    if(a>0){server(R,-2.6,a);for(let j=0;j<8;j++)for(let g=0;g<8;g++)slab(R,XG(g)-.74,XG(g)+.74,j,P.c1,a*.4,-2.6);
      [0,-2.6].forEach(z=>R.box([0,0,z-.68],[11.9,.08,.16],{fill:mix(P.paper,P.c3,.6),a,shadow:false}));
      [0,-2.6].forEach(z=>R.flow([[XG(0),.12,z-.68],[XG(7),.12,z-.68]],{c:P.c3,a,r:.07,n:16,speed:3}));
      lab(R,[XG(0)-.65,.1,-.68],'NVLink · '+N.nvl+' GB/s each way',{al:'right',dx:-8,b:1,fs:12.5,c:P.c3,a});
      const lk=[[XG(0)-.4,.1,0],[XG(0)-1.1,.1,-1.3],[XG(0)-.4,.1,-2.6]];R.line(lk,{c:P.c6,w:1.6,a});R.flow(lk,{c:P.c6,a,r:.05,n:3,speed:.35});
      lab(R,[XG(0)-1.1,.1,-1.3],'card · '+N.nic+' GB/s ('+N.ratio+'x less)',{al:'right',dx:-8,b:1,fs:12.5,c:P.c6,a})}
  }
  const tp=S3.stage({id:'stg-tp',list:'sx-tp',fig:'Fig. 3a · one model, eight GPUs, cut across every layer',cam:[.1,.62],bounds:[[-6.1,0,-.9],[8.6,1.4,.9]],aspect:.34,dur:1500,hold:4800,draw:drawTP,
    view:k=>k===3?{cam:[.1,.42],bounds:[[1.5,0,-.9],[10.3,2.4,.9]]}:k===4?{cam:[.25,.75],bounds:[[-9,0,-3.2],[6.1,1.4,.9]]}:null,margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  // ---- Fig. 3b: pipeline parallel ----
  function drawPP(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-6.5,6.5,-3.4,1.8,.5);
    const two=v(q=>q===3),one=1-two;
    server(R,0,1);
    let a=v(q=>q<=2);
    if(a>0){for(let g=0;g<8;g++){const c=mix(P.c3,P.c1,g/7);slab(R,XG(g)-.55,XG(g)+.55,0,c,a);slab(R,XG(g)-.55,XG(g)+.55,1,c,a);
        lab(R,[XG(g),0,.5],'layers '+(g*10+1)+'-'+(g*10+10),{dy:14,fs:12,c:P.mute,a:a*(g===0||g===7?1:0)})}
      if(k===0)lab(R,[XG(7)+.6,Y(1),0],'10 whole layers · '+N.w8+' GB each',{al:'left',dx:10,b:1,c:P.c1,fs:13,a:v(q=>q===0)})}
    const hop=g=>[[XG(g)+.3,Y(1)+.06,0],R.arcPt([XG(g)+.3,Y(1)+.06,0],[XG(g+1)-.3,Y(1)+.06,0],.3,.5),[XG(g+1)-.3,Y(1)+.06,0]];
    a=v(q=>q===1);
    if(a>0){const pts=[];for(let g=0;g<7;g++)pts.push(...hop(g));R.flow(pts,{c:P.c2,a,r:.08,n:3,speed:2.2,top:1});
      lab(R,hop(3)[1],'16 KiB per boundary',{dy:-16,b:1,c:P.c2,fs:13,a});lab(R,[XG(7)+.6,Y(1),0],N.p8+' ms per token',{al:'left',dx:10,b:1,c:P.ink,fs:13,a})}
    a=v(q=>q===2);
    if(a>0){const T10=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'];
      for(let g=0;g<7;g++)R.flow(hop(g),{c:T10[g],a,r:.07,n:2,speed:1.2});
      for(let g=0;g<8;g++)R.ball([XG(g),Y(1)+.22,0],.1,{c:T10[g],a});
      lab(R,[XG(7)+.6,Y(1),0],'8 micro-batches in flight',{al:'left',dx:10,b:1,c:P.ink,fs:13,a});lab(R,[XG(7)+.6,Y(1),0],N.tps+' tokens/s',{al:'left',dx:10,dy:18,c:P.mute,fs:12,a})}
    a=two;
    if(a>0){server(R,-2.6,a);[0,-2.6].forEach((z,s)=>{for(let j=0;j<6;j++)for(let g=0;g<8;g++)slab(R,XG(g)-.74,XG(g)+.74,j,mix(P.c3,P.c1,s),a*.6,z);
        lab(R,[XG(0)-.7,Y(3),z],s?'layers 64-'+N.L405:'layers 1-63',{al:'right',dx:-8,b:1,fs:12.5,c:s?P.c1:P.c3,a})});
      R.flowArc([XG(7),Y(5)+.08,0],[XG(7),Y(5)+.08,-2.6],.5,{c:P.c2,a,r:.08,n:4,speed:1});
      lab(R,R.arcPt([XG(7),Y(5)+.08,0],[XG(7),Y(5)+.08,-2.6],.5,.5),'16 KiB per token',{al:'left',dx:12,b:1,c:P.c2,fs:13,a})}
  }
  const pp=S3.stage({id:'stg-pp',list:'sx-pp',fig:'Fig. 3b · one model, eight GPUs, cut by depth',cam:[.1,.62],bounds:[[-6.1,0,-.9],[8.4,1.0,.9]],aspect:.32,dur:1500,hold:4800,draw:drawPP,
    view:k=>k===3?{cam:[.25,.75],bounds:[[-7.8,0,-3.2],[7.8,1.4,.9]]}:null,margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  Object.assign(window.DDSTG=window.DDSTG||{},{'stg-tp':tp,'stg-pp':pp});
})();
